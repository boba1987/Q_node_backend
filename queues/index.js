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

    utils.extractFields(req).then(fields => {
        console.log(fields)
        mongo.findOne({_id: new MongoDB.ObjectID(fields.id)}, {}, 'queues', (doc) => {
            // Document found
            if (doc) {
                // Update the document
                mongo.findOneAndUpdate({_id: new MongoDB.ObjectID(fields.id)}, {$set: fields}, 'queues', (doc) => {
                    deferred.resolve(doc.value);
                })
            } else {
                deferred.reject({status: 400, message: 'Queue not found'});
            }
        })
    }).catch(err => {
        console.log(err);
       deferred.reject();
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
