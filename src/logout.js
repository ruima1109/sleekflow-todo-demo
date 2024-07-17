import { useEffect } from 'react';

const Logout = () => {

  useEffect(() => {
    window.close();
  }, []);

  return (<></>);
};

export default Logout;