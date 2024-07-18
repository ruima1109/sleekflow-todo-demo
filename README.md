# Sleekflow Todo Demo Project

The frontend application based on React. The API project can be found at https://github.com/ruima1109/sleekflow-todo-api/tree/main

## How to set up the dev environment

1. pull the code
   $ git clone https://github.com/ruima1109/sleekflow-todo-demo.git
2. run

```sh
$ npm install
```

3. setup your aws credentials:
   install aws cli command https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-mac.html.
   Then locally run:

```sh
$ aws configure
```

get your id and credentials from https://console.aws.amazon.com/iam/home?region=us-east-1#/users

see more instructions here: (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Run the server locally

```sh
$ npm run debug
```

## To debug in VS code, add the configuration below in the .vscode/launch.json. It supports hotloading

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Chrome",
      "port": 9222,
      "request": "attach",
      "type": "chrome",
      "urlFilter": "http://localhost:3003/*", // use urlFilter instead of url!
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## Deployment the server in aws

The service is configured to be deployed automatically when pushing code to github.

The service is hosted at https://main.d3bjdhmkek90q.amplifyapp.com/

To manually deploy the service (install amplify ci first), run 

```sh
amplify add hosting
```