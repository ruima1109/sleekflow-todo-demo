import './login.css';


import appLogo from './assets/logo.svg'
import googleLogo from './assets/social-google.svg';

import * as Constants from './constants';

const Login = () => {
  const authUrl = `https://sleekflow-todo.auth.us-east-1.amazoncognito.com/oauth2/authorize?redirect_uri=${Constants.REDIRECT_URI}/auth-redirect&response_type=code&client_id=${Constants.APP_ID}&state=staging`
  return (
    <div className="app">
      <header className="app-header">
        <img src={appLogo} className="app-logo" alt="logo" />
        <p id="app-name">sleekflow</p>
        <p id="login-statement">Sign up for sleekflow using your Google account</p>
        <div id="google-button-container">
          <a id="google-button-link" href={authUrl}>
            <div id="google-button">
              <picture id="google-button-picture">
                <img src={googleLogo} />
              </picture>
              <div id="google-button-text">Join with Google</div>
            </div>
          </a>
        </div>
      </header>
    </div>
  );
};

export default Login;