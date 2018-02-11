const resolver = require('../resolver');
const mongo = require('../mongo');
const q = require('q');
const messages = require('../schemas/messages.json');
const validator = require('../validator');
const colors = require('colors');
const bot = require('../bot');

const utils = require('./utils');

function getMessages(req) {
  const deferred = q.defer();

  let sort = {uid: 1};
  let filter = '';

  // DB aggregate projection
  const projection = {
    _id: '$queueGroup',
    message: {$last: '$message'},
    queueType: {$last: '$queueType'},
    time: {$last: '$time'},
    sender: {$last: '$sender'},
    queueGroup: {$last: '$queueGroup'},
    uid: {$last: '$uid'}
  };

  if (req.query.search) {
    filter = req.query.search;
  }

  resolver.aggregate(req, 'messages', sort, projection, filter).then(messages => {
    mongo.find({}, 'queueGroups', function(queueGroups) {
      messages.items.map(message => { // Enhance each messsage with number of subscribers
        message.responseFrom = [];
        queueGroups.map(queue => { // Map trough queues to attahch subscribers to response and attach whoever replied
          if (message.queueGroup == queue.queueGroup) {
            message.subscribers = queue.subscribers;
            queue.responseFrom.map(replied => { // Attach whoever replied
              if (message.responseFrom.indexOf(replied) == -1 ) {
                message.responseFrom.push(replied);
              }
            })
          }
        })
      })

      deferred.resolve(messages);
    });
  });

  return deferred.promise;
}

// Save message received from the bot
function save(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, messages.message);

  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    let time = new Date();
    let messageObj = {
      sender: req.body.number,
      message: req.body.message,
      time,
      uid: time.getTime()
    };

    // Check for queue group name - if not found on req object, this is initial message - create new queue group
    if (req.body.queueGroup) {
      messageObj.queueGroup = req.body.queueGroup;
      messageObj.queueType = req.body.queueGroup.substr(0, req.body.queueGroup.indexOf('_'));
      // Save message to DB
      mongo.insert(messageObj, 'messages', () => {
        mongo.find({queueGroup: req.body.queueGroup}, 'queueGroups', (queueGroup) => {
          // If response from number is not in responseFrom already
          if (queueGroup[0].responseFrom.indexOf(req.body.number) == -1) {
            // Update respone from filed of the queue group
            mongo.findOneAndUpdate({queueGroup: req.body.queueGroup}, {$push: {responseFrom: req.body.number}}, 'queueGroups', () => {
              // If it is acknolegment message
              if (req.body.message == utils.acknolegment) {
                // Get original message
                utils.getOriginalQueueGroupMessage().then((originalMsg) => {
                  // Send acknolegment message to queue group original message sender
                  bot.sendMessage({
                    numbers: queueGroup[0].owner,
                    message: req.body.number + ' Acknowledged the message "' + originalMsg + '"'
                  }).then(() => {
                    deferred.resolve();
                  })
                })
              }
            });
          } else {
            deferred.resolve();
          }
        })
      });
    } else {
      // Get queue type
      let queueType = req.body.message.substr(0, req.body.message.indexOf(' '));
      // Find queue type in DB
      mongo.findOne({queueType}, {}, 'queues', (queue) => {
        // Queue found, send a request to the bot to create new queue group and save the message
        if (queue && queue.active) {
          let queueGroupName = utils.generateQueueGroupName(queueType);
          // Save the message to DB - collection 'messages'
          messageObj.queueGroup = queueGroupName;
          messageObj.queueType = queueType;

          let queueGroupObj = {
            queueType,
            queueGroup: queueGroupName,
            responseFrom: [],
            subscribers: queue.subscribed.toString().split(','),
            owner: req.body.number
          };

          // Saving message to DB
          mongo.insert(messageObj, 'messages', () => {
            // Save new queue group to DB
            mongo.insert(queueGroupObj, 'queueGroups', () => {
              // Send a message via bot
              console.log('sending the message', utils.PAobject);
              bot.sendMessage({
                numbers: utils.isInclusive(queue, req.body.number),
                message: req.body.message + '\n Message by ' + req.body.number,
                queueGroup: queueGroupName,
                pa: utils.PAobject
              }).then(() => {
                let currentSubscriber = queue.subscribed.length <= 1 ? 'subscriber' : 'subscribers';

                bot.sendMessage({
                  numbers: req.body.number,
                  message: 'A group message has been sent to the ' + queue.subscribed.length + ' current ' + currentSubscriber + ' to the ' + queueType + ' queue.'
                }).then(() => {
                  console.log(colors.green('Message: "' + req.body.message + '" sent to group ' + queueGroupName + ', subscribers:' + queue.subscribed.toString().split(',').join(', ')));
                  deferred.resolve();
                });
              }).catch(err => {
                console.log(colors.red('bot.createGroup err: ', err));
              });
            });
          });
        } else if (queue && !queue.active) {
          // If queue is not active, send a message to sender
          bot.sendMessage({
            numbers: req.body.number,
            message: 'This queue is not active.'
          }).then(() => {
            console.log(colors.red('Sending a message to inactive ' + queueType + ' queue'));
            deferred.resolve();
          });
        } else {
          // Queue not found - send the alert message via bot
          bot.sendMessage({
            numbers: req.body.number,
            message: 'You cannot send a message to ' + queueType + '. The queue ' + queueType + ' does not exist.'
          }).then(() => {
            console.log(colors.red(queueType + ' queue is not found.'));
            deferred.reject({status: 404});
          });
        }
      });
    }
  }

  return deferred.promise;
}

module.exports = {
  getMessages,
  save
};
