const config = require('./config.json');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const appPort = 3000;
const passport = require('passport');

const passportSettings = require('./authentication/index.js');
const jwt = require('jsonwebtoken');

const mongo = require('./mongo');

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

// Get routes
app
  .get('/secret', passport.authenticate('jwt', { session: false }), function(req, res){
    res.json('Success! You can not see this without a token');
  })
  .get('/messages', passport.authenticate('jwt', { session: false }), function(req, res){
    res.send(200);
  });

app.post('/login', function(req, res) {
  if(req.body.name && req.body.password){
    var name = req.body.name;
    var password = req.body.password;
  }

  // Get the users
  mongo.find({name}, 'admins', function(users) {
    const user = users[0];
    if( ! user ){
      res.status(401).json({message: 'User name or password does not match'});
    }

    if(user.password === password) {
      // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
      var payload = {id: user.id};
      var token = jwt.sign(payload, passportSettings.jwtOptions.secretOrKey);
      // Save token to the token store
      mongo.insert({token, time: new Date().getTime(), user: user.id, expiration: new Date().getTime() + config.tokenExpiration}, 'token_store' );
      res.json({message: 'ok', token: token, user: user});
    } else {
      res.status(401).json({message: 'User name or password does not match'});
    }
  });
});
