const q = require('q');
const validator = require('../validator');
const alertsSchema = require('../schemas/alerts.json');
const bot = require('../bot');
const mongo = require('../mongo');
const MongoDB = require('mongodb');
const nodemailer = require('nodemailer');

function sendMail(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, alertsSchema); // Validate request

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
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
        from: '"Fred Foo 👻" <medxq.info@gmail.com>', // sender address
        to: 'sdjordjevic@razor.rs', // list of receivers
        subject: 'Hello Alert✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            return console.log(error);
        }

        console.log('sendMail', req.body);
        deferred.resolve();
    });
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
