const resolver = require('../resolver');
const mongo = require('../mongo');
const q = require('q');
const messages = require('../schemas/messages.json');
const validator = require('../validator');
const colors = require('colors');
const bot = require('../bot');

function generateQueueGroupName(name) {
  const currDate = new Date();
  const seconds = currDate.getSeconds();
  const minutes = currDate.getMinutes();
  const hour = currDate.getHours();

  const year = currDate.getFullYear();
  const month = currDate.getMonth(); // beware: January = 0; February = 1, etc.
  const day = currDate.getDate();

  let generatedName = name + '_' + hour + minutes + seconds + '_' + day + (month+1) + year;

  return generatedName;
}

function getMessages(req) {
  const deferred = q.defer();
  resolver.resolveGet(req, 'messages').then(messages => {
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
    let messageObj = {
      sender: req.body.number,
      message: req.body.message,
      time: new Date()
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
          queue.allowedToSubsribe.push(req.body.botNumber);

          let queueGroupObj = {
            queueType,
            queueGroup: queueGroupName,
            responseFrom: [],
            subscribers: queue.allowedToSubsribe.toString().split(',')
          };

          // Saving message to DB
          mongo.insert(messageObj, 'messages', () => {
            // Save new queue group to DB
            mongo.insert(queueGroupObj, 'queueGroups', () => {
              // Send a message via bot
              bot.sendMessage({
                numbers: queue.allowedToSubsribe.toString().split(',').join(', '),
                message: req.body.message,
                queueGroup: queueGroupName
              }).then(() => {
                console.log(colors.green('Message: "' + req.body.message + '" sent to group ' + queueGroupName + ', subscribers:' + queue.allowedToSubsribe.toString().split(',').join(', ')));
                deferred.resolve();
              }).catch(err => {
                console.log(colors.red('bot.createGroup err: ', err));
              });
            });
          });
        } else {
          // Queue not found - send the alert message via bot
          console.log(colors.red(queueType + ' queue is not found.'));
          deferred.resolve();
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
