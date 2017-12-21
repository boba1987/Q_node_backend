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

// GET routes
app
  .get('/secret', passport.authenticate('jwt', { session: false }), function(req, res){
    res.json('Success! You can not see this without a token');
  })
  .get('/messages', passport.authenticate('jwt', { session: false }), function(req, res){
    res.send(200);
  });

// POST routes
app.post('/login', function(req, res) {
  if(req.body.name && req.body.password){
    var name = req.body.name;
    var password = req.body.password;
  }

  // Get the users
  mongo.findOne({name}, {}, 'admins', function(user) {
    if( ! user ){
      res.status(401).json({message: 'User name or password does not match'});
    }

    if(user.password === password) {
      // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
      var uidPayload = {id: user.id};
      var token = jwt.sign(uidPayload, passportSettings.jwtOptions.secretOrKey);
      // Save token to the token store
      const tokenObj = {token, time: new Date().getTime(), user: user.id, expiration: new Date().getTime() + config.tokenExpiration};
      mongo.insert(tokenObj, 'token_store' );
      // Atthach token to a user
      mongo.update(uidPayload, {$set: {auth: tokenObj}}, 'admins', function(){
        mongo.findOne({name}, {}, 'admins', function(user) {
          res.json({user});
        });
      })
    } else {
      res.status(401).json({message: 'User name or password does not match'});
    }
  });
});
