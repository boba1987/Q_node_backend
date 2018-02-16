const q = require('q');
const validator = require('../validator');
const queuesSchema = require('../schemas/queues.json');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const utils = require('./utils');

module.exports = {
  editStatus,
  create,
  edit
};

// Usage: editing existing queues
function edit(req) {
    const deferred = q.defer();

    // Create edited queue
    create(req).then((queue) => {
        // Delete edited queue
        mongo.findOne({_id: new MongoDB.ObjectID(queue.id)}, {}, 'queues', (doc) => {
            // Queue is found
            if (doc) {
                // Create edited queue
                mongo.deleteOne({_id: new MongoDB.ObjectID(doc._id)}, {}, 'queues', () => {
                    delete queue.id;
                    deferred.resolve(queue);
                });
            }
        });
    });

    return deferred.promise;
}

function editStatus(req) {
  const deferred = q.defer();
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
  const deferred = q.defer();

  utils.extractFields(req).then((fields) => {
      utils.save(fields, deferred);
  }).catch(err => {
      deferred.reject({status: err.status});
  });

  return deferred.promise;
}
