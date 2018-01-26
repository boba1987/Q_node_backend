const q = require('q');
const createUserSchema = require('../schemas/createUser.json');
const validator = require('../validator');
const mongo = require('../mongo');

module.exports = {
  create,
  edit,
  editStatus
}

function create(req) {
  const deferred = new q.defer();
  const v = validator.isValid(req, createUserSchema.createUser); // Validate request
  if (v) { // Reject if request is not valid - some field must be missing or invlaid type
    deferred.reject({message: v});
  } else {
    // Check if user already exists
    mongo.findOne({$or: [{username: req.body.username}, {email: req.body.email}]}, {_id: 0, username: 1, email: 1}, 'users', function(doc) {
      if (!doc) {
        // Enhance req.body with role filed
        req.body.role = 'moderator';
        mongo.insert(req.body, 'users', function() {
          deferred.resolve();
        });
      } else {
        if (doc.username == req.body.username) { // If there is a user with this username
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

function edit(req) {
  const deferred = new q.defer();
  const v = validator.isValid(req, createUserSchema.createUser); // Validate request
  if (v) { // Reject if request is not valid - some field must be missing or invlaid type
    deferred.reject({message: v, status: 400});
  } else {
    // Check if user exists
    mongo.findOne({email: req.body.email}, {}, 'users', function(doc) {
      if (!doc) {
        // User is not found
        deferred.reject({message: 'User not found!'});
      } else {
        mongo.update({email: req.body.email},
          {$set: {name: req.body.name,
          password: req.body.password,
          email: req.body.email,
          occupation: req.body.occupation,
          number: req.body.number,
          username: req.body.username,
          role: req.body.role,
          active: true
          }}, 'users', () => {
            deferred.resolve();
        })
      }
    });
  }

  return deferred.promise;
}


function editStatus(req) {
  const deferred = new q.defer();
  const v = validator.isValid(req, createUserSchema.editStatus); // Validate request

  if (v) { // Reject if request is not valid - some field must be missing or invlaid type
    deferred.reject({message: v, status: 400});
  } else {
    // Check if user exists
    mongo.findOne({email: req.body.email}, {}, 'users', function(doc) {
      if (!doc) {
        // User is not found
        deferred.reject({message: 'User not found!'});
      } else {
        mongo.update({email: req.body.email}, {$set: {active: req.body.active}}, 'users', () => {
            deferred.resolve();
        })
      }
    });
  }

  return deferred.promise;
}
