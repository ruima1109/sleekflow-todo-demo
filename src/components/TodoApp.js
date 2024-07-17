import React, { useState, useEffect, useRef } from 'react';
import TodoList from './TodoList';
import TodoForm from './TodoForm';
import ShareForm from './ShareForm';

import { v4 as uuidv4 } from 'uuid';

import './Todo.css'; // Import the CSS file

import _ from 'lodash';

import AWSAppSyncClient, {AUTH_TYPE} from 'aws-appsync';

import ContentLoader from 'react-content-loader'

import UserAvatar from './user-avatar';

import { Redirect } from 'react-router-dom';

import * as Auth from '../auth';

import * as Constants from '../constants';

import { gql } from 'graphql-tag';

let todoChangeSubscription, userToListChangeSubscription, appSyncClient;

const TodoApp = () => {
  const [lists, setLists] = useState([]);
  const [loginState, setLoginState] = useState(0);
  const [userIdPayload, setUserIdPayload] = useState({});

  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const listsRef = useRef(lists);
  const setListsRef = data => {
    listsRef.current = data;
    setLists(data);
  };

  useEffect(() => {
    const refreshAccessToken = async () => {
      try {
        await Auth.refreshToken();
      } catch (error) {
        console.error('Error during token refresh:', error);
        onLogout();
      }
    };

    Auth.getSession().then((session) => {
      setLoginState(1);
      setUserIdPayload(session.idToken.payload);
      fetchAllLists().then(list => setListsRef(list));
      subscribeToTodoChanges(subscribeTodoHandler);
      subscribeToUserToListChanges(subscribeUserToListHandler);
      const intervalId = setInterval(refreshAccessToken, 60*30*1000); // Refresh every 30 minutes
      // Cleanup function to clear the interval when the component unmounts
      return () => clearInterval(intervalId);
    }).catch((error) => {
      setLoginState(2);
    });
  }, []);

  const normalizeQueryItem = (item, fields) => {
    return _.pick(item, fields);
  };


  const getAppSyncClient = (jwtToken) => {
    if (!appSyncClient) {
      appSyncClient = new AWSAppSyncClient({
        url: Constants.GRAPHQL_URL,
        region: Constants.CLUSTER_REGION,
        auth: {
          type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
          jwtToken: jwtToken
        },
        disableOffline: true
      });
    }
    return appSyncClient;
  };

  const handleSortChange = (field) => {
    const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };

  const handleNewListSubmit = async (e) => {
    e.preventDefault();
    await addTodoList(newListName, newListDescription);
    setNewListName('');
    setNewListDescription('');
  };

  const todoListFields = ['listId', 'role', 'title', 'description']; 
  const userToListFields = ['userId', 'role', 'listId']; 
  const nestTodoFields = ['name', 'dueDate', 'todoId', 'description', 'status'];
  const todoFields = [...nestTodoFields, 'listId'];
  const formatFields = (listFields, nestedFieldName, nestedFields) => {
    // Build the nested fields string
    const nestedFieldString = `${nestedFieldName} {\n${_.join(nestedFields, '\n')}\n}`;  
    // Join the list fields and append the nested fields string
    const listFieldsString = _.join(listFields, '\n');
    return `${listFieldsString}\n${nestedFieldString}`;
  };
  const combinedFields = formatFields(todoListFields, 'todos', nestTodoFields);
  const getAllTodoListGql = gql(
    `query getAllTodoListsQuery($username: String!, $includeTodos: Boolean) {
      getAllTodoLists(username: $username, includeTodos: $includeTodos) {
        ${combinedFields}
      }
    }`
  );

  const deleteTodoGql = gql(
    `mutation deleteTodoMutation($username: String!, $listid: String!, $todoid: String!) {
      deleteTodoItem(username: $username, listid: $listid, todoid: $todoid) {
        success
      }
    }`
  );

  const updateTodoGql = gql(
    `mutation updateTodoMutation($username: String!, $listid: String!, $todoid: String!, $item: UpdateTodoItemInput!) {
      updateTodoItem(username: $username, listid: $listid, todoid: $todoid, item: $item) {
        success
      }
    }`
  );

  const createTodoGql = gql(
    `mutation createTodoMutation($username: String!, $listid: String!, $item: CreateTodoItemInput!) {
      createTodoItem(username: $username, listid: $listid, item: $item) {
        listId
        todoId
      }
    }`
  );

  const shareTodoListGql = gql(
    `mutation shareTodoListMutation($username: String!, $listid: String!, $item: [ShareTodoListInput]!) {
      shareTodoList(username: $username, listid: $listid, item: $item) {
        success
      }
    }`
  );

  const todoSubscriptionGql = gql(
    `subscription TodoSubscription($input: String!) {
      onTodoItemChange(username: $input) {
        item {
          ${_.join(todoFields, '\n')}
        }
        type
      }
    }`
  );

  const userToListSubscriptionGql = gql(
    `subscription UserToListSubscription($input: String!) {
      onUserToListChange(username: $input) {
        item {
          ${_.join(userToListFields, '\n')}
        }
        type
      }
    }`
  );

  const createTodoListGql = gql(
    `mutation createTodoList($username: String!, $item: CreateTodoListInput!) {
      createTodoList(username: $username, item: $item) {
        listId
        title
        description
      }
    }`
  );

  const deleteTodoListGql = gql(
    `mutation deleteTodoList($username: String!, $listid: String!) {
      deleteTodoList(username: $username, listid: $listid) {
        success
      }
    }`
  );

  const fetchAllLists = async () => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const results = await client.query({
        query: getAllTodoListGql,
        variables: {
          username: username,
          includeTodos: true
        },
        fetchPolicy: 'no-cache' // disable cache as the fetch all is used to keep data up-to-date if any unexpected errors happen
      });
      return results.data?.getAllTodoLists;
    } catch (error) {
      console.log("Failed to fetch all lists", error);
      return false;
    }
  };

  const addTodoList = async (name, description) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const listId = uuidv4(); // Generate a unique listId
      const result = await client.mutate({
        mutation: createTodoListGql,
        variables: {
          username: username,
          item: {
            title: name,
            description: description,
            listId: listId
          }
        }
      });
      return result.data?.createTodoList;
    } catch (error) {
      console.log("Failed to add todo list", error);
      return false;
    }
  };

  const deleteTodoList = async (listId) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const result = await client.mutate({
        mutation: deleteTodoListGql,
        variables: {
          username: username,
          listid: listId
        }
      });
      return result.data?.deleteTodoList;
    } catch (error) {
      console.log("Failed to delete todo list", error);
      return false;
    }
  };

  const addTodo = async (listId, todo) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const result = await client.mutate({
        mutation: createTodoGql,
        variables: {
          username: username,
          listid: listId,
          item: todo
        }
      });
      const todId = result.data?.createTodoItem?.todoId;
      return todId
    } catch (error) {
      console.log("Failed to add todo item", error);
      return null;
    }
  };

  const updateTodo = async (listId, todoId, updatedTodo) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const result = await client.mutate({
        mutation: updateTodoGql,
        variables: {
          username: username,
          listid: listId,
          todoid: todoId,
          item: updatedTodo
        }
      });
      return result.data?.updateTodoItem?.success;
    } catch (error) {
      console.log("Failed to update todo item", error);
      return false;
    }
  };

  const deleteTodo = async (listId, todoId) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const result = await client.mutate({
        mutation: deleteTodoGql,
        variables: {
          username: username,
          listid: listId,
          todoid: todoId
        },
        fetchPolicy: 'no-cache' // disable cache as the fetch all is used to keep data up-to-date if any unexpected errors happen
      });
      return result.data?.deleteTodoItem?.success;
    } catch (error) {
      console.log("Failed to delete todo item", error);
      return false;
    }
  };

  const shareTodoList = async (listId, userId, role) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    try {
      const client = getAppSyncClient(jwtToken);
      const username = Auth.getUsername();
      const result = await client.mutate({
        mutation: shareTodoListGql,
        variables: {
          username: username,
          listid: listId,
          item: [
            { 
              userId: userId, 
              role: role
            }  
          ]
        }
      });
      return result.data?.shareTodoList?.success;
    } catch (error) {
      console.log("Failed to share todo list", error);
      return false;
    }
  };

  const subscribeToTodoChanges = async (subscribeHandler, errorHandler) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    const client = getAppSyncClient(jwtToken);
  
    if (todoChangeSubscription) {
      todoChangeSubscription.unsubscribe();
    }

    const observer = client.subscribe({
      query: todoSubscriptionGql,
      variables: {
        input: Auth.getUsername()
      }});
  
    todoChangeSubscription = observer.subscribe({
        next: data => {
          console.log("Update from todo subscribe:", data);
          const item = data.data?.onTodoItemChange?.item;
          const type = data.data?.onTodoItemChange?.type;

          if (item == null)
            return;
          if (subscribeHandler) {
            subscribeHandler(type, item);
          }
        },
        error: error => {
          console.log("Error from todo subscribe:", error);
          if (errorHandler) {
            errorHandler(error);
          }
        }
    });
  };

  const subscribeTodoHandler = async (type, item) => {
    const { todoId, listId, ...todoData } = item;
    const listIndex = listsRef.current.findIndex(list => list.listId === listId);
    if (listIndex === -1) {
      // List not found, add new list with the todo
      return;
    }

    const lists = [...listsRef.current];
    const list = lists[listIndex];
    const todoIndex = list.todos.findIndex(todo => todo.todoId === todoId);
    const updateType = type.toUpperCase();
    switch (updateType) {
      case 'REMOVE':
        if (todoIndex !== -1) {
          list.todos.splice(todoIndex, 1);
        }
        break;
      case 'INSERT':
        if (todoIndex === -1) {
          list.todos.push({ todoId, ...todoData });
        }
      case 'MODIFY':
        // update item
        if (todoIndex !== -1) {
          // Todo found, update it
          list.todos[todoIndex] = { todoId, ...todoData };
        }
      default: break;
    }
    setListsRef(lists);
  };

  const subscribeToUserToListChanges = async (subscribeHandler, errorHandler) => {
    const session = await Auth.getSession();
    const jwtToken = session.getIdToken().getJwtToken();
    const client = getAppSyncClient(jwtToken);
  
    if (userToListChangeSubscription) {
      userToListChangeSubscription.unsubscribe();
    }

    const observer = client.subscribe({
      query: userToListSubscriptionGql,
      variables: {
        input: Auth.getUsername()
      }});
  
      userToListChangeSubscription = observer.subscribe({
        next: data => {
          console.log("Update from userToList subscribe:", data);
          const item = data.data?.onUserToListChange?.item;
          const type = data.data?.onUserToListChange?.type;

          if (item == null)
            return;
          if (subscribeHandler) {
            subscribeHandler(type, item);
          }
        },
        error: error => {
          console.log("Error from userToList subscribe:", error);
          if (errorHandler) {
            errorHandler(error);
          }
        }
    });
  };

  const subscribeUserToListHandler = async (type, item) => {
    const { listId, role } = item;
    const listIndex = listsRef.current.findIndex(list => list.listId === listId);

    let lists = [...listsRef.current];
    const updateType = type.toUpperCase();
    switch (updateType) {
      case 'REMOVE':
        if (listIndex !== -1) {
          lists.splice(listIndex, 1);
        }
        break;
      case 'INSERT':
        if (listIndex === -1) {
          lists = await fetchAllLists();
        }
      case 'MODIFY':
        if (listIndex !== -1) {
          // Todo found, update it
          lists[listIndex].role = role;
        }
      default: break;
    }
    setListsRef(lists);
  };

  const renderLoadingState = () => {
    return (
      <ContentLoader
        speed={2}
        width={400}
        height={160}
        viewBox="0 0 400 160"
        backgroundColor="#d9d9d9"
        foregroundColor="#ededed"
      >
        <rect x="50" y="6" rx="4" ry="4" width="343" height="38" />
        <rect x="8" y="6" rx="4" ry="4" width="35" height="38" />
        <rect x="50" y="55" rx="4" ry="4" width="343" height="38" />
        <rect x="8" y="55" rx="4" ry="4" width="35" height="38" />
        <rect x="50" y="104" rx="4" ry="4" width="343" height="38" />
        <rect x="8" y="104" rx="4" ry="4" width="35" height="38" />
      </ContentLoader>
    );
  };

  const onLogout = () => {
    Auth.logout();
    window.open(Constants.LOGOUT_URL, "_self");
  };

  const renderTodoApp = () => {
    return (
      <div>
        <h1>Todo App</h1>
        <div>
          <UserAvatar userIdPayload={userIdPayload} onLogout={onLogout} />
        </div>
        <div className="add-todo-list-form">
          <form onSubmit={handleNewListSubmit}>
            <input
              type="text"
              placeholder="List Name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
              required
            />
            <button type="submit">Add Todo List</button>
          </form>
        </div>
        <div>
          {lists.map(list => (
            <div key={list.listId} className="todo-list">
              <h2>List Name: {list.title}</h2>
              <p>Description: {list.description}</p>
              {(list.role === 0 || list.role === 1) && (
                <div className="add-todo-form-container">
                  <TodoForm addTodo={addTodo} listId={list.listId} />
                </div>
              )}
              {list.role === 0 && (
                <div className="list-actions">
                  <div className="share-form-container">
                    <ShareForm listId={list.listId} shareTodoList={shareTodoList} />
                  </div>
                  <button className="delete-list-button" onClick={() => deleteTodoList(list.listId)}>Delete List</button>
                </div>
              )}
              <TodoList
                listId={list.listId}
                todos={list.todos}
                updateTodo={updateTodo}
                deleteTodo={deleteTodo}
                readOnly={list.role !== 0 && list.role !== 1}
                sortField={sortField}
                sortDirection={sortDirection}
                handleSortChange={handleSortChange}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    loginState === 0? renderLoadingState() : (loginState === 1 ? renderTodoApp() : <Redirect to="/login" />)
  );
};

export default TodoApp;