const q = require('q');
const validator = require('../validator');
const alertsSchema = require('../schemas/alerts.json');
const bot = require('../bot');
const mongo = require('../mongo');
const MongoDB = require('mongodb');

function sendMail(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, alertsSchema); // Validate request

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    // TODO: implement mail sender
    console.log('sendMail', req.body);
    deferred.resolve();
  }

  return deferred.promise;
}

function sendSms(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, alertsSchema); // Validate request

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    // Find a queue
    mongo.findOne({queueType: req.body.queue}, {}, 'queues', (queue) => {
      // If queue not found
      if (!queue) {
        console.log(req.body.queue + 'Queue not found!');
      }

      // Find a message that created the alert
      mongo.findOne({_id: new MongoDB.ObjectID(req.body._id)}, {}, 'alerts', (doc) => {
        bot.sendMessage({
          numbers: queue.owner,
          message: 'Message "' + doc.message + '" sent by ' + doc.sender + ' is sent to an empty ' + req.body.queue + ' queue'
        });
      })
      deferred.resolve();
    })
  }

  return deferred.promise;
}

module.exports = {
  sendMail,
  sendSms
}
