const passportJWT = require('passport-jwt');
const secretKey = require('../secrets/privateKey.json');
const mongo = require('../mongo/index.js');
const config = require('../config.json');
const jwt = require('jsonwebtoken');
const loginSchema = require('../schemas/login.json');
const passwordChangeSchema = require('../schemas/passwordChange.json');
const validator = require('../validator');
const Q = require('Q');
const utils = require('../utils');

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  secretOrKey: secretKey.key,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  // usually this would be a database call:
  mongo.findOne({email: jwt_payload.email}, {}, 'users', function(user) {
    if (!user || !user.auth) { // If no token expiration
      return next(null, false);
    }

    if (user && user.auth.expiration > new Date().getTime()) {
      next(null, user);
    } else {
      next(null, false);
    }
  });
});

function login(req) {
  const deferred = Q.defer();
  const v = validator.isValid(req, loginSchema);

  if (v) {
    deferred.reject({message: v, status: 400});
  } else {
    // Get the user
    mongo.findOne({email: req.body.email}, {fields: {_id: 1, password: 1, email: 1, role: 1}}, 'users', function(user) {
      if( ! user ){
        deferred.reject({message: 'User email or password does not match', status: 401});
      }

      if(user.password === req.body.password) {
        // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
        var token = jwt.sign({email: user.email, role: user.role}, secretKey.key);
        // Save token to the token store
        const tokenObj = {token, time: new Date().getTime(), user: user._id, expiration: new Date().getTime() + config.tokenExpiration};
        mongo.insert(tokenObj, 'token_store' );
        // Atthach token to a user
        mongo.update({_id: user._id}, {$set: {auth: tokenObj}}, 'users', function(){
          // Extract JWT and find a user
          mongo.findOne({email: req.body.email}, {fields: {_id: 1, name: 1, number: 1, role: 1, 'auth.token': 1}}, 'users', function(user) {
            deferred.resolve(user);
          });
        })
      } else {
        return deferred.reject({message: 'User email or password does not match', status: 401});
      }
    });
  }

  return deferred.promise;
}

function forgotPassword(req) {
  const deferred = Q.defer();
  mongo.findOne({email: req.body.email}, {}, 'users', (user) => {
    if (user) {
      let tempPassword = utils.makeRandomHash(5);
      mongo.update({_id: user._id}, {$set: {password: tempPassword}}, 'users', () => {
        // TODO: send an email to a user with generated tempPassword
        console.log(tempPassword);
      })
      return deferred.resolve();
    }

    deferred.reject();
  });

  return deferred.promise;
}

function passwordChange(req) {
  const deferred = Q.defer();
  const v = validator.isValid(req, passwordChangeSchema); // Validate request

  if (v) {// Validate request
    deferred.reject({status: 400, message: v});
  } else {
    // Extract token from authorization header and find a user to update the password
    mongo.findOne({'auth.token': req.headers.authorization.split(' ')[1]}, {}, 'users', (user) => {
      if (user) {
        if (user.password == req.body.oldPassword) {
          return mongo.update({_id: user._id}, {$set: {password: req.body.newPassword}}, 'users', () => {
            deferred.resolve();
          })
        }
      }

      deferred.reject({status: 400, message: 'Incorrect password'});
    });
  }

  return deferred.promise;
}

module.exports = {
  strategy,
  login,
  forgotPassword,
  passwordChange
};
