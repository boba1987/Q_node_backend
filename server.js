const config = require('./config.json');
const appPort = 3000;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const passportSettings = require('./authentication');
const mongo = require('./mongo');
const resolver = require('./resolver');
const userManagement = require('./user_management');
const messages = require('./messages');

const loginSchema = require('./schemas/login.json');
const validator = require('./validator');

passport.use(passportSettings.strategy);

app
  .use(passport.initialize())
  .use(bodyParser.urlencoded({ // Parse application/x-www-form-urlencoded
    extended: true
  }))
  .use(bodyParser.json()) // Parse application/json
  .use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

app.listen(appPort, function () {
  console.log('App is running on port:', appPort);
});

// GET routes
app
  .get('/messages', passport.authenticate('jwt', { session: false }), function(req, res){ // Get list of messages
    messages.getMessages(req).then((messages) => {
      res.send(messages);
    })
  })
  .get('/alerts', passport.authenticate('jwt', { session: false }), function(req, res){ // Get list of alerts
    resolver.resolveGet(req, 'alerts').then(alerts => {
      res.send(alerts);
    });
  })
  .get('/queues', passport.authenticate('jwt', { session: false }), function(req, res){ // Get list of queues
    resolver.resolveGet(req, 'queues').then(queues => {
      res.send(queues);
    });
  })
  .get('/subscribers', passport.authenticate('jwt', { session: false }), function(req, res){ // Get list of subscribers
    resolver.resolveGet(req, 'subscribers', {status: req.query.status}).then(subscribers => {
      res.send(subscribers);
    });
  })
  .get('/users', passport.authenticate('jwt', { session: false }), function(req, res){ // Get list of users
    resolver.resolveGet(req, 'users').then(users => {
      res.send(users);
    });
  })
  .get('/messages/queue/:name', passport.authenticate('jwt', {session: false}), function(req, res){ // Get messages per queue
    mongo.find({queue: req.params.name}, 'messages', function(messages) {
      res.send(messages);
    })
  });

// POST routes
app
  .post('/login', function(req, res) {
    const v = validator.isValid(req, res, loginSchema);

    if (v) {
      return res.status(400).json({message: v});
    }

    // Get the user
    mongo.findOne({name: req.body.name}, {fields: {_id: 0, id: 1, name: 1, password: 1}}, 'users', function(user) {
      if( ! user ){
        res.status(401).json({message: 'User name or password does not match'});
      }

      if(user.password === req.body.password) {
        // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
        var token = jwt.sign(user, passportSettings.jwtOptions.secretOrKey);
        // Save token to the token store
        const tokenObj = {token, time: new Date().getTime(), user: user._id, expiration: new Date().getTime() + config.tokenExpiration};
        mongo.insert(tokenObj, 'token_store' );
        // Atthach token to a user
        mongo.update({name: user.name}, {$set: {auth: tokenObj}}, 'users', function(){
          mongo.findOne({name: req.body.name}, {fields: {_id: 1, name: 1, number: 1, role: 1, 'auth.token': 1}}, 'users', function(user) {
            res.json(user);
          });
        })
      } else {
        res.status(401).json({message: 'User name or password does not match'});
      }
    });
  })
  .post('/createUser', passport.authenticate('jwt', {session: false}), function(req, res) {
    userManagement.create(req, res).then(() => {
      res.sendStatus(200);
    }).catch(err => {
      res.status(400).json(err);
    });
  })
