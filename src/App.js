// src/App.js
import React from 'react';
import TodoApp from './components/TodoApp';
import Login from './login';
import Logout from './logout';

import AuthRedirect from './auth-redirect';

import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={TodoApp} />
        <Route path="/todo" component={TodoApp} />
        <Route path="/login" component={Login} />
        <Route path="/logout" component={Logout} />
        <Route path="/auth-redirect" component={AuthRedirect} />
      </Switch>
    </Router>
  );
}

export default App;