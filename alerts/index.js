const q = require('q');
const validator = require('../validator');
const alertsSchema = require('../schemas/alerts.json');
const bot = require('../bot');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const nodemailer = require('nodemailer');
const emailValidator = require('email-validator');

const alertTypeCriteria = {
    1: 'Minimum number of subscribers'
}

const alertActions = {
    1: AlertQueueOwnerByMessage
};

module.exports = {
    sendMail,
    sendSms,
    checkAlerts,
    checkMinimumSubscribers
}

// Alert queue owner
function AlertQueueOwnerByMessage(queue, message) {
    const deferred = q.defer();
    bot.sendMessage({
        "numbers": queue.owner,
        "message": message
    }).then(() => {
        deferred.resolve();
    }).catch(err => {
        deferred.reject(err);
    });

    return deferred.promise;
};

// Check for if some alert criteria should be triggered
function checkAlerts(queue) {
    const deferred = q.defer();

    mongo.findOne({queueType: queue}, {}, 'queues', (queue) => {
        // Check for minimum number of subscribers
        checkMinimumSubscribers(queue).then(alert => {
            // If alert true, trigger appropriate action
            if (alert) {
                deferred.resolve(queue);
            } else {
                deferred.resolve(false);
            }
        })
    })

    return deferred.promise;
}

// Check minimum number of subscribers
function checkMinimumSubscribers(queue) {
    const deferred = q.defer();
    let Alerts = JSON.parse(queue.alerts);

    if (Alerts) {
        Alerts.map((alert, index) => {
            // loop trough alerts and check if some criteria is fulfilled
            if (alert.typeCriteria == 1 || alert.type == alertTypeCriteria[1]) {
                // Check if there is a minimum number of subscribers on queue
                if (queue.subscribed.length < parseInt(alert.minSubscribers, 10)) {
                    deferred.resolve(true);
                }
            }

            if (Alerts.length == index+1) {
                deferred.resolve(false);
            }
        });
    } else {
        deferred.resolve(false);
    }

    return deferred.promise;
}

function sendMail(req) {
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
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'medxq.info@gmail.com',
                pass: 'medxqapp'
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"MedxQ Info" <medxq.info@gmail.com>', // sender address
            to: 'sdjordjevic@razor.rs', // list of receivers
            subject: 'Queue Alert', // Subject line
            text: 'Message: "' + doc.message + '", sent by ' + doc.sender + '. Alert: ' + req.body.alert,
            html: '<b>Message: </b>"' + doc.message + '"<br/> <b>sent by</b>' + doc.sender + ' <br/> <b>Alert: </b>' + req.body.alert// html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return console.log('transporter.sendMail: ', error);
            }

            deferred.resolve();
        });
      })
    })
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
                    message: 'Message "' + doc.message + '" sent by ' + doc.sender + ' Alert: ' + req.body.alert
                });
            })
            deferred.resolve();
        })
    }

    return deferred.promise;
}
