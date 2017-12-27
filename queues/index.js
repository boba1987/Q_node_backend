const Q = require('Q');
const validator = require('../validator');
const queuesSchema = require('../schemas/queues.json');
const mongo = require('../mongo');

function editStatus(req) {
  const deferred = Q.defer();
  const v = validator.isValid(req, queuesSchema); // Validate request

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    mongo.update({_id: req.body._id}, {$set: {active: req.body.active}}, 'queues', () => {
      deferred.resolve();
    })
  }

  return deferred.promise;
}

module.exports = {
  editStatus
}
