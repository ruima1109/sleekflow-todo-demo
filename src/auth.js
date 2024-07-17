import * as AmazonCognitoIdentity from 'amazon-cognito-identity-js';

import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

import * as Constants from './constants';

import axios from 'axios';
import qs from 'qs';

const poolData = {
  UserPoolId: Constants.USER_POOL_ID,
  ClientId: Constants.APP_ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const cognitoIdenityPoolParam = {
  client: new CognitoIdentityClient({ region: Constants.CLUSTER_REGION }),
  identityPoolId: Constants.IDENTITY_POOL_ID,
}

let identityId;

export const getSession = async () => {
  return new Promise((resolve, reject) => {
    let cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      return reject();
    }
    cognitoUser.getSession((err, session) => {
      if (session) {
        return resolve(session);
      } else {
        console.log('failed to get user sessions', err);
        return reject(err);
      }
    });
  });
};

export const getUsername = () => {
  return userPool.getCurrentUser()?.getUsername();
}

export const getCurrentUser = () => {
  return userPool.getCurrentUser();
}

/**
 * Log in the user with tokens passed from login web page
 * @param {Object} request
 */
export const login = (idToken, accessToken, refreshToken) => {
  const tokenData = {
    IdToken: new AmazonCognitoIdentity.CognitoIdToken({ IdToken: idToken }),
    AccessToken: new AmazonCognitoIdentity.CognitoAccessToken({ AccessToken: accessToken }),
    RefreshToken: new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refreshToken }),
  };
  let userSession = new AmazonCognitoIdentity.CognitoUserSession(tokenData);
  // Make a new cognito user
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: userSession.getIdToken().payload['cognito:username'],
    Pool: userPool
  });
  // Attach the session to the user
  cognitoUser.setSignInUserSession(userSession);
  console.log(cognitoUser);
  setCognitoIdenityPool(userSession);
};

export const refreshToken = async () => {
  try {
    console.log("refreshing the token....");
    const session = await getSession();
    const refreshToken = session.getRefreshToken().getToken();
    const response = await axios.post(
      Constants.AWS_OAUTH,
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: Constants.APP_ID
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const tokenData = response.data;
    login(tokenData['id_token'], tokenData['access_token'], refreshToken); // Pass the existing refresh token
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error; // rethrow the error to be caught in the setInterval
  }
};

export const logout = () => {
  let cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
  identityId = null;
  setCognitoIdenityPool();
};

export const getIdentityId = async () => {
  if (!identityId) {
    const provider = getCredentialsProvider();
    const credentials = await provider();
    identityId = credentials.identityId;
  }
  return identityId;
};

export const getCredentialsProvider = () => {
  // AWS client expects a function instead of static credentials since they need to
  // refresh credientals when expired.
  return async () => {
    console.log('Get credentials called');
    try {
      const session = await getSession();
      setCognitoIdenityPool(session);
    } catch (error) {
      // no logged in users, continue to generate credentials for non-authenticated users
      console.log('User is not logged in yet');
    }
    const provider = fromCognitoIdentityPool(cognitoIdenityPoolParam);
    const credentials = await provider();
    return credentials;
  };
};

const setCognitoIdenityPool = (session) => {
  if (session) {
    const iss = session.getIdToken().payload.iss.replace('https://', '');
    const jwtToken = session.getIdToken().getJwtToken();
    cognitoIdenityPoolParam.logins = cognitoIdenityPoolParam.logins || {};
    cognitoIdenityPoolParam.logins[iss] = jwtToken;
  } else {
    cognitoIdenityPoolParam.logins = {};
  }
}