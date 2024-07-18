import React, { useState, useEffect } from 'react';

const TodoForm = ({ addTodo, listId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    // Check if the name is empty and set the disabled state accordingly
    if (name.trim() === '') {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [name]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!disabled && name) {
      addTodo(
        listId,
        {
          name,
          description,
          dueDate: dueDate ? new Date(dueDate).getTime() : null,
          status,
          todoId: Math.random().toString(36).substr(2, 9) // Generate a random ID for the todo
        }
      );
      setName('');
      setDescription('');
      setDueDate('');
      setStatus('Not Started');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Todo Name"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <label>Due Date</label>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        placeholder="Due Date"
      />
      <label>Status</label>
      <select value={status} onChange={(e) => setStatus(e.target.value)} >
        <option value="Not Started">Not Started</option>
        <option value="In Progress">In Progress</option>
      </select>

      <button type="submit" disabled={disabled}>Add Todo</button>
    </form>
  );
};

export default TodoForm;