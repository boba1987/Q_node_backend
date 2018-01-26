const q = require('q');
const validator = require('../validator');
const queuesSchema = require('../schemas/queues.json');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const formidable = require('formidable');
const parser = require('../parser');
const fs = require('fs');

module.exports = {
  editStatus,
  create
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

function save(fields, deferred) {
  const v = validator.isValid(fields, queuesSchema.create); // Validate request
  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    mongo.insert(fields, 'queues', (res) => {
      deferred.resolve(res.ops[0]);
    })
  }
}

function create(req) {
  const deferred = q.defer();
  const form = new formidable.IncomingForm();
  form.uploadDir = './tmp';
  const allowedFileFields = ['allowedNumbersToSend', 'allowedNumbersToSubscribe'];

  form.parse(req, function (err, fields, files) {
    let queue = [];
    for (let key in files) {
      // Check if file is type 'text/csv'
      if (files[key].type != 'text/csv') {
        deferred.reject({status: 400, message: 'File ' + files[key].name + ' is not type of csv! Plese, upload csv format file.' });
      } else if ( allowedFileFields.indexOf(key) == -1 ) { // If there is a file on field that is not allowed
        deferred.reject({status: 400, message: 'Field ' + key + ' is not allowed! Allowed file fields are ' + allowedFileFields.toString() });
      } else {
        queue.push(parser.csv(files[key].path));
        // Remove file from ./tmp
        fs.unlinkSync('./' + files[key].path);
      }
    }

    q.all(
      queue
    ).then(parsed => {
      let index = 0;

      for (let key in files) {
        fields[key] = parsed[index]; // Enhance fields object with allowedNumbersToSend/allowedNumbersToSubscribe
        index++;
      }

      // Enhance fields object with arrays to contain status, responseFrom and subscribers
      fields.responseFrom = [];
      fields.subscribers = [];
      fields.active = false;
      fields.time = new Date();

      if (typeof fields.allowedNumbersToSend == 'string') {
        fields.allowedToSend = fields.allowedNumbersToSend.split(',').map(function(item) {
          return item.trim();
        });
      }

      if (typeof fields.allowedNumbersToSubscribe == 'string') {
        fields.allowedToSubsribe = fields.allowedNumbersToSubscribe.split(',').map(function(item) {
          return item.trim();
        });
      }

      // Remove unnececary properties
      delete fields.allowedNumbersToSubscribe;
      delete fields.allowedNumbersToSend;

      save(fields, deferred);
    }).catch( err =>{
      deferred.reject({status: err.status, message: err.message});
    });
  });

  return deferred.promise;
}
