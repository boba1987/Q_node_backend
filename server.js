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
const utils = require('./utils');


passport.use(authentication.strategy);

app
  .use(passport.initialize())
  .use(bodyParser.urlencoded({ // Parse application/x-www-form-urlencoded
    extended: true
  }))
  .use(bodyParser.json()) // Parse application/json
  .use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
  });

app.listen(appPort, () => {
  console.log('App is running on port:', appPort);
});

// GET routes
app
  .get('/messages', passport.authenticate('jwt', { session: false }), (req, res) => { // Get list of messages
    messages.getMessages(req).then((messages) => {
      res.send(messages);
    })
  })
  .get('/alerts', passport.authenticate('jwt', { session: false }), (req, res) => { // Get list of alerts
    resolver.resolveGet(req, 'alerts').then(alerts => {
      res.send(alerts);
    });
  })
  .get('/queues', passport.authenticate('jwt', { session: false }), (req, res) => { // Get list of queues
    resolver.resolveGet(req, 'queues').then(queues => {
      res.send(queues);
    });
  })
  .get('/subscribers', passport.authenticate('jwt', { session: false }), (req, res) => { // Get list of subscribers
    let filter = {};
    if (req.query.status) {
      filter = {status: req.query.status};
    }
    resolver.resolveGet(req, 'subscribers', filter).then(subscribers => {
      res.send(subscribers);
    });
  })
  .get('/users', passport.authenticate('jwt', { session: false }), (req, res) => { // Get list of users
    resolver.resolveGet(req, 'users', {}, {password: 0}).then(users => {
      res.send(users);
    });
  })
  .get('/messages/queue/:name', passport.authenticate('jwt', {session: false}), (req, res) => { // Get messages per queue
    mongo.find({queue: req.params.name}, 'messages', (messages) => {
      res.send(messages);
    })
  });

// POST routes
app
  .post('/login', (req, res) => {
    authentication.login(req).then(user => {
      res.json(user);
    }).catch(err => {
      res.status(err.status).send(err.message);
    });
  })
  .post('/createUser', passport.authenticate('jwt', {session: false}), (req, res) => {
    userManagement.create(req, res).then(() => {
      res.sendStatus(200);
    }).catch(err => {
      res.status(400).send(err);
    });
  })
  .post('/forgotPassword', (req, res) => {
    mongo.findOne({email: req.body.email}, {}, 'users', (user) => {
      if (user) {
        let tempPassword = utils.makeRandomHash(5);
        mongo.update({_id: user._id}, {$set: {password: tempPassword}}, 'users', () => {
          // TODO: send an email to a user with generated tempPassword
          console.log(tempPassword);
        })
        return res.sendStatus(200);
      }

      res.status(400).send({message: 'Email not found'});
    })
  })
  .post('/passwordChange', passport.authenticate('jwt', {session: false}), (req, res) => {
    mongo.findOne({'auth.token': req.headers.authorization.split(' ')[1]}, {}, 'users', (user) => {
      console.log(user.password);
      console.log(req.body.oldPassword);
      if (user.password == req.body.oldPassword) {
        mongo.update({_id: user._id}, {$set: {password: req.body.newPassword}}, 'users', () => {
          res.sendStatus(200);
        })
      } else {
          res.status(400).send({message: 'Incorrect password'});
      }
    });
  })
