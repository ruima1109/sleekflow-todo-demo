import React, { useState } from 'react';

const TodoList = ({ listId, todos, updateTodo, deleteTodo, readOnly }) => {
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', dueDate: '', status: '' });

  const startEditing = (todo) => {
    setEditingTodoId(todo.todoId);
    setEditFormData({ 
      name: todo.name, 
      description: todo.description, 
      dueDate: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '', 
      status: todo.status 
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedDueDate = editFormData.dueDate ? new Date(editFormData.dueDate).getTime() : null;
    updateTodo(listId, editingTodoId, { ...editFormData, dueDate: updatedDueDate });
    setEditingTodoId(null);
  };

  const formatLocalDate = (timestamp) => {
    if (!timestamp) return 'No due date';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0]; // Ensure date is in YYYY-MM-DD format
  };

  
  return (
    <div className="todo-list">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {todos.map(todo => (
            <tr key={todo.todoId}>
              {editingTodoId === todo.todoId ? (
                <td colSpan="5">
                  <form onSubmit={handleEditSubmit}>
                    <input
                      type="text"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      placeholder="Todo Name"
                    />
                    <input
                      type="text"
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditChange}
                      placeholder="Description"
                    />
                    <input
                      type="date"
                      name="dueDate"
                      value={editFormData.dueDate}
                      onChange={handleEditChange}
                      placeholder="Due Date"
                    />
                    <select name="status" value={editFormData.status} onChange={handleEditChange}>
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingTodoId(null)}>Cancel</button>
                  </form>
                </td>
              ) : (
                <>
                  <td>{todo.name}</td>
                  <td>{todo.description}</td>
                  <td>{formatLocalDate(todo.dueDate)}</td>
                  <td>{todo.status}</td>
                  <td className="table-actions">
                    {!readOnly && (
                      <>
                        <button onClick={() => startEditing(todo)}>Edit</button>
                        <button onClick={() => deleteTodo(listId, todo.todoId)}>Delete</button>
                      </>
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


export default TodoList;