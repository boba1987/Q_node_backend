const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const appPort = 3000;
const passport = require('passport');

const passportSettings = require('./authentication/index.js');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const users = require('./users.json'); // This is a mock data

passport.use(passportSettings.strategy);

app
  .use(passport.initialize())
  .use(bodyParser.urlencoded({ // Parse application/x-www-form-urlencoded
    extended: true
  }))
  .use(bodyParser.json()) // Parse application/json

app.listen(appPort, function () {
  console.log('App is running on port:', appPort);
});

app.get('/secret', passport.authenticate('jwt', { session: false }), function(req, res){
  res.json('Success! You can not see this without a token');
});

app.post('/login', function(req, res) {
  if(req.body.name && req.body.password){
    var name = req.body.name;
    var password = req.body.password;
  }
  // usually this would be a database call:
  var user = users[_.findIndex(users, {name: name})];
  if( ! user ){
    res.status(401).json({message: 'User name or password does not match'});
  }

  if(user.password === password) {
    // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
    var payload = {id: user.id};
    var token = jwt.sign(payload, passportSettings.jwtOptions.secretOrKey);
    res.json({message: 'ok', token: token, user: user});
  } else {
    res.status(401).json({message: 'User name or password does not match'});
  }
});
