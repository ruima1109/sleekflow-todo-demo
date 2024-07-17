import { useEffect, useRef, useState } from 'react';

/*global chrome*/

/**
 * User profile avatar.
 */
const UserAvatar = ({ userIdPayload, onLogout }) => {
  const [showUserOptions, setShowUserOptions] = useState(false);
  const showUserOptionsRef = useRef(showUserOptions);
  const setShowUserOptionsRef = data => {
    showUserOptionsRef.current = data;
    setShowUserOptions(data);
  };
  const ref = useRef(null);

  useEffect(() => {

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShowUserOptionsRef(false);
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onAvatarClick = () => {
    setShowUserOptionsRef(!showUserOptionsRef.current);
  };

  const renderAvatar = () => {
    return (
      <>
        <img className="user-avatar-image" src={userIdPayload.picture} onClick={onAvatarClick} alt="" />
        <div className="user-options-wrapper">
          <div className={`user-options ${showUserOptions ? "user-options-active" : ""}`}>
            <div className="user-option" onClick={onLogout}>Log out</div>
          </div>
        </div>
      </>
    );
  };

  //TODO: add default picture url
  return (
    <div className="user-avatar" ref={ref}>
      { userIdPayload.picture ? renderAvatar() : null }
    </div>
  );
};

export default UserAvatar;