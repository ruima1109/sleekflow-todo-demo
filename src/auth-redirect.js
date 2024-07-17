import * as Auth from './auth';
import * as Constants from './constants';

import { useEffect, useState } from 'react';

import { Redirect } from 'react-router-dom';
/*global chrome*/
import axios from 'axios';
import qs from 'qs';
import { useLocation } from 'react-router-dom';

const AuthRedirect = () => {
  let urlLocation = useLocation();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    if (urlLocation.search.length > 1) {
      let params = new URLSearchParams(urlLocation.search);
      let code = params.get('code');
      let state = params.get('state');
      getTokens(code).then((response) => {
        console.log(response.data);
        const tokenData = response.data;
        Auth.login(tokenData['id_token'], tokenData['access_token'], tokenData['refresh_token']);
        setIsLoggedIn(true);
      }).catch(error => {
        console.log(error);
      });
    }
  }, []);

  const getTokens = (code) => {
    return axios.post(
      Constants.AWS_OAUTH,
      qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: Constants.APP_ID,
        redirect_uri: `${Constants.REDIRECT_URI}/auth-redirect`
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  };

  return (
    isLoggedIn ? <Redirect to="/todo" /> : <></>
  );
};

export default AuthRedirect;
