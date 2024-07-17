// export const REDIRECT_URI = 'http://localhost:3003';
export const REDIRECT_URI = "https://main.d3bjdhmkek90q.amplifyapp.com";
export const APP_ID = '77avaefai0c95es1fdb2qna3aq';
export const IDENTITY_POOL_ID = 'us-east-1:16648cd1-ccfa-4d34-b55c-c6d43244900e';
export const USER_POOL_ID = 'us-east-1_4bDbJMLSx';
export const CLUSTER_REGION = 'us-east-1';

export const AWS_USER_DOMAIN = 'https://sleekflow-todo.auth.us-east-1.amazoncognito.com';
export const AWS_OAUTH = `${AWS_USER_DOMAIN}/oauth2/token`;
export const LOGOUT_URL = `${AWS_USER_DOMAIN}/logout?client_id=${APP_ID}&logout_uri=${REDIRECT_URI}/login`;


export const GRAPHQL_URL = 'https://u4diqjuksvfavi7r65ggpoqr3m.appsync-api.us-east-1.amazonaws.com/graphql';