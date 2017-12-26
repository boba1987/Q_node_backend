const appPort = 3000;

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const passport = require('passport');

const authentication = require('./authentication');
const mongo = require('./mongo');
const resolver = require('./resolver');
const userManagement = require('./user_management');
const messages = require('./messages');


passport.use(authentication.strategy);

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
    authentication.login(req).then(user => {
      res.json(user);
    }).catch(err => {
      res.status(err.status).send(err.message);
    });
  })
  .post('/createUser', passport.authenticate('jwt', {session: false}), function(req, res) {
    userManagement.create(req, res).then(() => {
      res.sendStatus(200);
    }).catch(err => {
      res.status(400).send(err);
    });
  })
