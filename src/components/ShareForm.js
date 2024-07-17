import React, { useState } from 'react';

const ShareForm = ({ shareTodoList, listId }) => {
  const [shareUserId, setShareUserId] = useState('');
  const [shareRole, setShareRole] = useState(1);

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    try {
      shareTodoList(listId, shareUserId, shareRole)
    } catch (error) {
      console.error('Error sharing list:', error);
    }
    setShareUserId('');
    setShareRole(1);
  };

  return (
    <form onSubmit={handleShareSubmit}>
      <input
        type="text"
        name="shareUserId"
        value={shareUserId}
        onChange={(e) => setShareUserId(e.target.value)}
        placeholder="User ID to share with"
      />
      <label>Role</label>
      <select name="shareRole" value={shareRole} onChange={(e) => setShareRole(parseInt(e.target.value))}>
        <option value={0}>Owner</option>
        <option value={1}>Can Edit</option>
        <option value={2}>View Only</option>
      </select>
      
      <button type="submit" disabled={!shareUserId.trim()}>Share List</button>
    </form>
  );
};

export default ShareForm;