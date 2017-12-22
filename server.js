const config = require('./config.json');
const appPort = 3000;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const validate = require('jsonschema').Validator;
const validator = new validate();

const passportSettings = require('./authentication');
const mongo = require('./mongo');
const resolver = require('./resolver');

const loginSchema = require('./schemas/login.json');

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
  .get('/messages', passport.authenticate('jwt', { session: false }), function(req, res){
    resolver.resolveGet(req, 'messages').then(messages => {
      mongo.find({}, 'queues', function(queues) {
        messages.items.map(message => { // Enhance each messsage with number of subscribers
          message.responseFrom = [];
          queues.map(queue => { // Map trough queues to attahch subscribers to response and attach whoever replied
            if (message.queue == queue.name) {
              message.subscribers = queue.subscribers;
              queue.responseFrom.map(replied => { // Attach whoever replied
                if (message.responseFrom.indexOf(replied) == -1 ) {
                  message.responseFrom.push(replied);
                }
              })
            }
          })
        })

        res.send(messages);
      })
    });
  })
  .get('/alerts', passport.authenticate('jwt', { session: false }), function(req, res){
    resolver.resolveGet(req, 'alerts').then(alerts => {
      res.send(alerts);
    });
  })
  .get('/queues', passport.authenticate('jwt', { session: false }), function(req, res){
    resolver.resolveGet(req, 'queues').then(queues => {
      res.send(queues);
    });
  })
  .get('/subscribers', passport.authenticate('jwt', { session: false }), function(req, res){
    resolver.resolveGet(req, 'subscribers').then(subscribers => {
      res.send(subscribers);
    });
  })
  .get('/users', passport.authenticate('jwt', { session: false }), function(req, res){
    resolver.resolveGet(req, 'users').then(users => {
      res.send(users);
    });
  })

// POST routes
app.post('/login', function(req, res) {
  let validation = validator.validate(req.body, loginSchema).errors;
  if(validation.length != 0){ // Validate body of the request
    for (let i=0; i<validation.length; i++) {
      // Remove unnececary properties from error message
      delete validation[i].instance;
      delete validation[i].schema;
    }
    return res.status(400).json({message: validation})
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
      const tokenObj = {token, time: new Date().getTime(), user: user.id, expiration: new Date().getTime() + config.tokenExpiration};
      mongo.insert(tokenObj, 'token_store' );
      // Atthach token to a user
      mongo.update({name: user.name}, {$set: {auth: tokenObj}}, 'users', function(){
        mongo.findOne({name: req.body.name}, {fields: {_id: 0, id: 1, name: 1, number: 1, role: 1, 'auth.token': 1}}, 'users', function(user) {
          res.json(user);
        });
      })
    } else {
      res.status(401).json({message: 'User name or password does not match'});
    }
  });
});
