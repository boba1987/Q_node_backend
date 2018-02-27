const q = require('q');
const validator = require('../validator');
const alertsSchema = require('../schemas/alerts.json');
const bot = require('../bot');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const nodemailer = require('nodemailer');
const emailValidator = require('email-validator');
const colors = require('colors');

const alertActions = {
    2: AlertQueueOwnerByMessage
};

module.exports = {
    sendMail,
    sendSms,
    checkAlerts,
    alertActions,
    escalateAlert,
    save,
    shouldTriggerAlert
};

// Compare start and stop time
function checkTimeSpan(start, stop, time) {
    if (start <= time && stop >= time && start <= stop) {
        return true;
    } else if (start > stop) {
        if (time <= stop && start >= time && stop >= time ) {
            return true;
        } else if (time >= start && stop <= time ) {
            return true;
        }
    }

    return false;
}

// Checks if alert should be triggered based on time
function shouldTriggerAlert(start, stop, time) {
    return checkTimeSpan(start, stop, time);
}

// Store alert to db
function save(queue, sender, message, alert) {
    console.log('Storing alert');
    const deferred = q.defer();
    let email = '';

    // Check if there is alert set as escalate option
    if (emailValidator.validate(queue.queueEscalation)) {
        email = queue.queueEscalation;
    }

    mongo.insert({
        queue: queue.queueGroup,
        time: new Date,
        sender: message.sender,
        message: message.message,
        messageId: message._id,
        owner: queue.owner,
        email: email,
        alert
    }, 'alerts', () => {
        deferred.resolve();
    });

    return deferred.promise;
}

// Alert queue owner
function AlertQueueOwnerByMessage(queue, message) {
    console.log('Sending alert: ', message);
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

function escalateAlert(alert, queue, message) {
    console.log('Escalating alert');
    const deferred = q.defer();
    // If escalation email or number is set
    if (emailValidator.validate(queue.queueEscalation)) {
        console.log('Escalating alert - email');
        // Send an email
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
            to: queue.queueEscalation, // list of receivers
            subject: 'Queue Alert', // Subject line
            text: message
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                deferred.reject()
                return console.log('transporter.sendMail: ', error);
            }

            deferred.resolve();
        });
    } else {
        console.log('Escalating alert - message');
        // Send a message to escalation number only if queue owner and escalation numbers are not equal
        if (queue.queueEscalation !== queue.owner) {
            // Send a message via bot
            bot.sendMessage({
                numbers: queue.queueEscalation,
                message
            }).then(() => {
                console.log('Escalating alert - message sent');
                deferred.resolve();
            })
        }
    }

    return deferred.promise;
}

// Check for if some alert criteria should be triggered
function checkAlerts(queue) {
    const deferred = q.defer();

    mongo.findOne({queueType: queue}, {}, 'queues', (queue) => {
        // Check for minimum number of subscribers
        checkMinimumSubscribers(queue).then(alerts => {
            // If alert true, trigger appropriate action
            if (alerts) {
                deferred.resolve({hasAlert: true, queue, alerts});
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
    let TriggeredAlerts = [];

    if (Alerts) {
        Alerts.map((alert, index) => {
            // Loop trough alerts and check if some criteria is fulfilled
            // Check if there is a minimum number of subscribers on queue
            if (queue.subscribed.length < parseInt(alert.minSubscribers, 10)) {
                TriggeredAlerts.push(alert);
            }

            if (Alerts.length == index+1) {
                deferred.resolve(TriggeredAlerts);
            }
        });
    } else {
        deferred.resolve([]);
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
    let queueType = req.body.queue.substr(0, req.body.queue.indexOf('_'));
    mongo.findOne({queueType: queueType}, {}, 'queues', (queue) => {
      // If queue not found
      if (!queue) {
        console.log(req.body.queue + 'Queue not found!');
      }

      // Check if mail is set
      if (!emailValidator.validate(queue.queueEscalation)) {
          console.log(colors.red('Email is not set as escalation option'));

          deferred.resolve();
      } else {
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
                  to: queue.queueEscalation, // list of receivers
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
      }
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
        // Extract queue type out of queue group name
        let queueTypeFormated = req.body.queue.substr(0, req.body.queue.indexOf('_'));
        mongo.findOne({queueType: queueTypeFormated}, {}, 'queueGroups', (queue) => {
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
            });
            deferred.resolve();
        })
    }

    return deferred.promise;
}
