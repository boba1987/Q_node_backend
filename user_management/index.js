const Q = require('Q');
const createUserSchema = require('../schemas/createUser.json');
const validator = require('../validator');
const mongo = require('../mongo');

function create(req) {
  const deferred = new Q.defer();
  const v = validator.isValid(req, createUserSchema); // Validate request
  if (v) { // Reject if request is not valid - some field must be missing or invlaid type
    deferred.reject(v);
  } else {
    // Check if user already exists
    mongo.findOne({$or: [{userName: req.body.userName}, {email: req.body.email}]}, {_id: 0, userName: 1, email: 1}, 'users', function(doc) {
      if (!doc) {
        mongo.insert(req.body, 'users', function() {
          deferred.resolve();
        });
      } else {
        if (doc.userName == req.body.userName) { // If there is a user with this username
          deferred.reject({message: 'User name not unique'});
        } else if (doc.email == req.body.email) { // If there is a user with this email
          deferred.reject({message: 'Email not unique'});
        } else {
          deferred.reject();
        }

      }
    });
  }

  return deferred.promise;
}

module.exports = {create}
