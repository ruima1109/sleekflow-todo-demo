import React, { useState, useEffect, useRef } from 'react';
import TodoList from './TodoList';
import TodoForm from './TodoForm';
import ShareForm from './ShareForm';

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
  const [todos, setTodos] = useState([]);
  const [loginState, setLoginState] = useState(0);
  const [userIdPayload, setUserIdPayload] = useState({});

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
      return null;
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

    const lists = [...listsRef.current];
    const list = lists[listIndex];
    const updateType = type.toUpperCase();
    switch (updateType) {
      case 'REMOVE':
        if (listIndex !== -1) {
          lists.splice(listId, 1);
        }
        break;
      case 'INSERT':
        if (listIndex === -1) {
          list = await fetchAllLists();
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
            <UserAvatar userIdPayload={userIdPayload} onLogout={onLogout}/>
        </div>
        <div>
          {lists.map(list => (
            <div key={list.listId} className="todo-list">
              <h2>{list.title}</h2>
              <p>{list.description}</p>
              {list.role === 0  && (
                <div className="share-form-container">
                  <ShareForm listId={list.listId} shareTodoList={shareTodoList} />
                </div>
              )}
              {(list.role === 0 || list.role === 1) && (
                <div className="add-todo-form-container">
                  <TodoForm addTodo={addTodo} listId={list.listId} />
                </div>
              )}
              <TodoList listId={list.listId} todos={list.todos} updateTodo={updateTodo} deleteTodo={deleteTodo} readOnly={list.role !== 0 && list.role !== 1} />
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