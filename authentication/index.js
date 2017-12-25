const passportJWT = require('passport-jwt');
const secretKey = require('../secrets/privateKey.json');
const mongo = require('../mongo/index.js');
const config = require('../config.json');
const jwt = require('jsonwebtoken');
const loginSchema = require('../schemas/login.json');
const validator = require('../validator');
const Q = require('Q');

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  secretOrKey: secretKey.key,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  // usually this would be a database call:
  mongo.findOne({name: jwt_payload.name}, {}, 'users', function(user) {
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
    mongo.findOne({name: req.body.name}, {fields: {_id: 0, id: 1, name: 1, password: 1}}, 'users', function(user) {
      if( ! user ){
        deferred.reject({message: 'User name or password does not match', status: 401});
      }

      if(user.password === req.body.password) {
        // from now on we'll identify the user by the id and the id is the only personalized value that goes into our token
        var token = jwt.sign(user, secretKey.key);
        // Save token to the token store
        const tokenObj = {token, time: new Date().getTime(), user: user._id, expiration: new Date().getTime() + config.tokenExpiration};
        mongo.insert(tokenObj, 'token_store' );
        // Atthach token to a user
        mongo.update({name: user.name}, {$set: {auth: tokenObj}}, 'users', function(){
          mongo.findOne({name: req.body.name}, {fields: {_id: 1, name: 1, number: 1, role: 1, 'auth.token': 1}}, 'users', function(user) {
            deferred.resolve(user);
          });
        })
      } else {
        return deferred.reject({message: 'User name or password does not match', status: 401});
      }
    });
  }

  return deferred.promise;
}

module.exports = {
  strategy,
  login
};
