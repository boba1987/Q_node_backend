const Q = require('Q');
const validator = require('../validator');
const queuesSchema = require('../schemas/queues.json');
const mongo = require('../mongo');
const MongoDB = require('mongodb');

function editStatus(req) {
  const deferred = Q.defer();
  const v = validator.isValid(req, queuesSchema.editStatus); // Validate request

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    mongo.update({_id: new MongoDB.ObjectID(req.body._id)}, {$set: {active: JSON.parse(req.body.active) }}, 'queues', () => {
      deferred.resolve();
    })
  }

  return deferred.promise;
}

function create(req) {
  const deferred = Q.defer();
  console.log(req.body);
  deferred.resolve();

  return deferred.promise;
}

module.exports = {
  editStatus,
  create
}
