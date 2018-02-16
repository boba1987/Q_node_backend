const validator = require('../validator');
const mongo = require('../mongo');
const queuesSchema = require('../schemas/queues.json');
const fs = require('fs');
const formidable = require('formidable');
const parser = require('../parser');
const q = require('q');

module.exports = {
  save,
  extractFields
};

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

function extractFields(req) {
    const form = new formidable.IncomingForm();
    form.uploadDir = './tmp';
    const allowedFileFields = ['allowedNumbersToSend', 'allowedNumbersToSubscribe'];
    const deferred = q.defer();

    form.parse(req, function (err, fields, files) {
        let queue = [];
        for (let key in files) {
            // Check if file is type 'text/csv'
            if (files[key].type !== 'text/csv') {
                deferred.reject({status: 400, message: 'File ' + files[key].name + ' is not type of csv! Plese, upload csv format file.' });
            } else if ( allowedFileFields.indexOf(key) === -1 ) { // If there is a file on field that is not allowed
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
            fields.subscribed = [];
            fields.active = false;
            fields.time = new Date();

            // Set inclusive/exclusive type of queue
            if (fields.queueTypeSelect) {
                fields.isInclusive = fields.queueTypeSelect.toLowerCase() == 'inclusive' ? true : false;
            }

            if (typeof fields.allowedNumbersToSend == 'string' && fields.allowedNumbersToSubscribe) {
                fields.allowedNumbersToSend = fields.allowedNumbersToSend.split(',').map(function(item) {
                    return item.trim();
                });
            } else if(!fields.allowedNumbersToSend){
                fields.allowedNumbersToSend = [];
            }

            if (typeof fields.allowedNumbersToSubscribe == 'string' && fields.allowedNumbersToSubscribe) {
                fields.allowedNumbersToSubscribe = fields.allowedNumbersToSubscribe.split(',').map(function(item) {
                    return item.trim();
                });
            } else if (!fields.allowedNumbersToSubscribe) {
                fields.allowedNumbersToSubscribe = [];
            }

            deferred.resolve(fields);
        }).catch( err =>{
            console.log(err)
            deferred.reject({status: 400});
        });
    });

    return deferred.promise;
}
