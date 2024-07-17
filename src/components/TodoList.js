import React, { useState } from 'react';

const TodoList = ({ listId, todos, updateTodo, deleteTodo, readOnly, sortField, sortDirection, handleSortChange }) => {
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

  const sortedTodos = [...todos].sort((a, b) => {
    if (sortField === 'dueDate') {
      const dateA = a.dueDate || 0;
      const dateB = b.dueDate || 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'status') {
      const statusOrder = ['not started', 'in progress', 'completed'];
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);
      return sortDirection === 'asc' ? statusA - statusB : statusB - statusA;
    } else if (sortField === 'name') {
      return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortField === 'description') {
      return sortDirection === 'asc' ? a.description.localeCompare(b.description) : b.description.localeCompare(a.description);
    }
    return 0;
  });

  const renderSortArrow = (field) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? '↑' : '↓';
    }
    return '';
  };

  return (
    <table>
      <thead>
        <tr>
          <th
            className="sortable"
            onClick={() => handleSortChange('name')}
          >
            Name {renderSortArrow('name')}
          </th>
          <th
            className="sortable"
            onClick={() => handleSortChange('description')}
          >
            Description {renderSortArrow('description')}
          </th>
          <th
            className="sortable"
            onClick={() => handleSortChange('dueDate')}
          >
            Due Date {renderSortArrow('dueDate')}
          </th>
          <th
            className="sortable"
            onClick={() => handleSortChange('status')}
          >
            Status {renderSortArrow('status')}
          </th>
          {!readOnly && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {sortedTodos.map(todo => (
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
                    <option value="not started">Not Started</option>
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
                {!readOnly && (
                  <td className="table-actions">
                    <button onClick={() => startEditing(todo)}>Edit</button>
                    <button onClick={() => deleteTodo(listId, todo.todoId)}>Delete</button>
                  </td>
                )}
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TodoList;