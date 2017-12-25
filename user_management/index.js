const Q = require('Q');
const createUserSchema = require('../schemas/createUser.json');
const validator = require('../validator');

function create(req, res) {
  const deferred = new Q.defer();
  const v = validator.isValid(req, res, createUserSchema); // Validate request
  if (v) {
    deferred.reject(v);
  } else {
    deferred.resolve();
  }

  return deferred.promise;
}

module.exports = {create}
