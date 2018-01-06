const q = require('q');
const validator = require('../validator');
const alertsSchema = require('../schemas/alerts.json');

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
    // TODO: implement mail sender
    console.log('sendSms', req.body);
    deferred.resolve();
  }

  return deferred.promise;
}

module.exports = {
  sendMail,
  sendSms
}
