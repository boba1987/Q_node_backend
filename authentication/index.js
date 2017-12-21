const passportJWT = require('passport-jwt');
const secretKey = require('../secrets/privateKey.json');
const mongo = require('../mongo/index.js');

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  secretOrKey: secretKey.key,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
};

const strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  // usually this would be a database call:
  mongo.findOne({id: jwt_payload.id}, {}, 'admins', function(user) {
    if (user && user.auth.expiration > new Date().getTime()) {
      next(null, user);
    } else {
      next(null, false);
    }
  });
});

module.exports = {
  strategy,
  jwtOptions
};
