const express = require('express');
const app = express();
const appPort = 3000;

app.listen(appPort, function () {
  console.log('App is running on port:', appPort);
});
