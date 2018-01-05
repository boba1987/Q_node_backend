const Q = require('Q');
const validator = require('../validator');
const queuesSchema = require('../schemas/queues.json');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const formidable = require('formidable');
const parser = require('../parser');
const fs = require('fs');

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
  const deferred = Q.defer();
  const form = new formidable.IncomingForm();
  form.uploadDir = './tmp';

  form.parse(req, function (err, fields, files) {
    if (Object.keys(files).length) {
      let queue = [];
      for (let key in files) {
        // Check if file is type 'text/csv'
        if (files[key].type != 'text/csv') {
          deferred.reject({status: 400, message: 'File ' + files[key].name + ' is not type of csv! Plese, upload csv format file.' });
        } else {
          queue.push(parser.csv(files[key].path));
          // Remove file from ./tmp
          fs.unlinkSync('./' + files[key].path);
        }
      }

      Q.all(
        queue
      ).then(parsed => {
        let index = 0;
        for (let key in files) {
          fields[key] = parsed[index]; // Enhance fields object with allowedNumbersToSend/allowedNumbersToSubscribe
          index++;
        }

        save(fields, deferred);
      }).catch( err =>{
        deferred.reject({status: err.status, message: err.message});
      });
    } else {
      if (fields.allowedNumbersToSend) {
        fields.allowedNumbersToSend = fields.allowedNumbersToSend.split(',').map(function(item) {
          return item.trim();
        });
      }

      if (fields.allowedNumbersToSubscribe) {
        fields.allowedNumbersToSend = fields.allowedNumbersToSend.split(',').map(function(item) {
          return item.trim();
        });
      }

      save(fields, deferred);
    }
  });

  return deferred.promise;
}

module.exports = {
  editStatus,
  create
}
