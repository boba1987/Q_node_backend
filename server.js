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
  .use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

app.listen(appPort, function () {
  console.log('App is running on port:', appPort);
});

// GET routes generic resolve function
function resolveGet(req, res, collection) {
  const skip = 0 || (parseInt(req.query.page) - 1) * config.pageSize; // Zero based, page number starts at 1
  const limit = config.pageSize;
  let totalPages = 0;
  function callback(docs) {
    res.json({
      totalPages: Math.ceil(totalPages/config.pageSize),
      items: docs
    });
  }

  // Get total number of pages
  mongo.find({}, collection, function(docs) {
    totalPages = docs.length;
    mongo.find({}, collection, callback, skip, limit);
  });
}

// GET routes
app
  .get('/messages', passport.authenticate('jwt', { session: false }), function(req, res){
    resolveGet(req, res, 'messages');
  })
  .get('/alerts', passport.authenticate('jwt', { session: false }), function(req, res){
    resolveGet(req, res, 'alerts');
  })
  .get('/queues', passport.authenticate('jwt', { session: false }), function(req, res){
    resolveGet(req, res, 'queues');
  })
  .get('/subscribers', passport.authenticate('jwt', { session: false }), function(req, res){
    resolveGet(req, res, 'subscribers');
  })
  .get('/users', passport.authenticate('jwt', { session: false }), function(req, res){
    resolveGet(req, res, 'users');
  })

// POST routes
app.post('/login', function(req, res) {
  if(req.body.name && req.body.password){
    var name = req.body.name;
    var password = req.body.password;
  }

  // Get the users
  mongo.findOne({name}, {}, 'users', function(user) {
    if( ! user ){
      res.status(401).json({message: 'User name or password does not match'});
    }

    if(user.password === password) {
      // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
      var uidPayload = {name: user.name, role: user.role};
      var token = jwt.sign(uidPayload, passportSettings.jwtOptions.secretOrKey);
      // Save token to the token store
      const tokenObj = {token, time: new Date().getTime(), user: user.id, expiration: new Date().getTime() + config.tokenExpiration};
      mongo.insert(tokenObj, 'token_store' );
      // Atthach token to a user
      mongo.update({name: uidPayload.name}, {$set: {auth: tokenObj}}, 'users', function(){
        mongo.findOne({name}, {}, 'users', function(user) {
          res.json(user);
        });
      })
    } else {
      res.status(401).json({message: 'User name or password does not match'});
    }
  });
});
