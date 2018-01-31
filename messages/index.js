const resolver = require('../resolver');
const mongo = require('../mongo');
const q = require('q');
const messages = require('../schemas/messages.json');
const validator = require('../validator');
const colors = require('colors');
const bot = require('../bot');
const dateformat = require('dateformat');

function generateQueueGroupName(name) {
  const currDate = new Date();

  let generatedName = name + dateformat(currDate, '_HHMMss_ddmmyyyy');

  console.log(generatedName);

  return generatedName;
}

function getMessages(req) {
  const deferred = q.defer();

  let sort = {uid: 1};
  let filter = '';

  if (req.query.search) {
    filter = req.query.search;
  }

  resolver.aggregate(req, 'messages', sort, {_id: '$queueGroup', message: {$last: '$message'}, queueType: {$last: '$queueType'}, time: {$last: '$time'}, sender: {$last: '$sender'}, queueGroup: {$last: '$queueGroup'}, uid: {$last: '$uid'}}, filter).then(messages => {
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
        // Update respone from filed of the queue group
        mongo.update({queueGroup: req.body.queueGroup}, {$push: {responseFrom: req.body.number}}, 'queueGroups', () => {
          deferred.resolve();
        });
      });
    } else {
      // Get queue type
      let queueType = req.body.message.substr(0, req.body.message.indexOf(' '));
      // Find queue type in DB
      mongo.findOne({queueType}, {}, 'queues', (queue) => {
        // Queue found, send a request to the bot to create new queue group and save the message
        if (queue) {
          let queueGroupName = generateQueueGroupName(queueType);
          // Save the message to DB - collection 'messages'
          messageObj.queueGroup = queueGroupName;
          messageObj.queueType = queueType;

          let queueGroupObj = {
            queueType,
            queueGroup: queueGroupName,
            responseFrom: [],
            subscribers: queue.subscribed.toString().split(',')
          };

          // Saving message to DB
          mongo.insert(messageObj, 'messages', () => {
            // Save new queue group to DB
            mongo.insert(queueGroupObj, 'queueGroups', () => {
              // Send a message via bot
              bot.sendMessage({
                numbers: queue.subscribed.toString().split(',').join(', '),
                message: req.body.message + '\n Message by ' + req.body.number,
                queueGroup: queueGroupName
              }).then(() => {
                bot.sendMessage({
                  numbers: req.body.number,
                  message: 'Message is forwarded to ' + queueType + ' queue.'
                }).then(() => {
                  console.log(colors.green('Message: "' + req.body.message + '" sent to group ' + queueGroupName + ', subscribers:' + queue.subscribed.toString().split(',').join(', ')));
                  deferred.resolve();
                });
              }).catch(err => {
                console.log(colors.red('bot.createGroup err: ', err));
              });
            });
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
