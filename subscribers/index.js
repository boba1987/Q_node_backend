const mongo = require('../mongo');
const validator = require('../validator');
const q = require('q');
const colors = require('colors');
const bot = require('../bot');

const subscribeSchema = require('../schemas/subscribers.json');

module.exports = {
  subscribe,
  unsubscribe,
  updateSubcribers
}

function updateSubcribers(status, queueType, sender) {
  const deferred = q.defer();
  // Find a number in subscribers collection and if found update to subscribed/unsubscribed
  mongo.findOneAndUpdate({sender, queueType}, {$set: {status}}, 'subscribers', (updatedDoc) => {
    // IF Document found and updated
    if (updatedDoc.value) {
      deferred.resolve(updatedDoc);
    } else {
      // Document not found, so make a newone in subscribers collection
      mongo.insert({queueType, time: new Date(), sender, status}, 'subscribers', (result) => {
        deferred.resolve(result);
      });
    }
  })

  return deferred.promise;
}

// Subscribe user to a specific group based on req.body.queue
function subscribe(req) {
  console.log('Subscribe: ', req.body);
  const deferred = q.defer();
  const v = validator.isValid(req, subscribeSchema.subscribe);
  // Validate request
  if (v) {
    deferred.reject({message: v, status: 400});
  } else {
    mongo.findOne({queueType: req.body.queue}, {}, 'queues', (queue) => {
      // If queue is found
      if (queue) {
        let activeSubscribers = parseInt(queue.subscribed.length, 10);
        /*
          Check if allowedNumbersToSubscribe field is set and is number allowed to subscribe OR if allowedNumbersToSubscribe is not set, subscribe number
        */
        if ((queue.allowedNumbersToSubscribe.length && queue.allowedNumbersToSubscribe.indexOf(req.body.number) != -1) || !queue.allowedNumbersToSubscribe.length) {
          // Check if allready subscribed
          if (queue.subscribed.indexOf(req.body.number) != -1) {
            // Send warning that number is allready subscribed
            bot.sendMessage({
              numbers: req.body.number,
              message: 'You are already subscribed to  ' + req.body.queue + ' You are 1 of ' + activeSubscribers + ' active subscribers.'
            }).then(() => {
              console.log(colors.red(new Date(), req.body.number + ' is allready subscribed to ' + req.body.queue));
              deferred.resolve();
            });
          } else {
            // Subscirbe user
            mongo.update({queueType: req.body.queue}, {$push: {subscribed: req.body.number}}, 'queues', () => {
              // Send confirmation that number is now subscribed
              activeSubscribers++;
              bot.sendMessage({
                numbers: req.body.number,
                message: 'You have subscribed to ' + req.body.queue + ' You are 1 of ' + activeSubscribers + ' active subscribers.'
              }).then(() => {
                console.log(colors.green(new Date(), req.body.number + ' subscribed to ' + req.body.queue));
                updateSubcribers('subscribed', req.body.queue, req.body.number);
                // Reset subscribers alert if there is enough subscribers in the queue
                JSON.parse(queue.alerts).map(alert => {
                 if (alert.typeCriteria == '1' && alert.minSubscribers >= queue.subscribed.length) {
                     // If there are enough subscribers reset counter
                     let updatedAlerts = JSON.parse(queue.alerts).map(alertParsed => {
                         if (JSON.stringify(alertParsed) === JSON.stringify(alert)) {
                             alertParsed.repeatedTimes = 0;
                             alertParsed.LastCalled = '';
                         }

                         return alertParsed;
                     });

                     mongo.update({queueType: queue.queueType}, {$set: {alerts: JSON.stringify(updatedAlerts)}}, 'queues');
                 }
                });

                deferred.resolve();
              });
            });
          }
        } else {
          // Send warning that number is not allowed to subscribe
          bot.sendMessage({
            numbers: req.body.number,
            message: 'Your number ' + req.body.number + ' does not have permission to subscribe to the ' + req.body.queue + '. ' + req.body.queue + ' queue is owned by ' + queue.owner
          }).then(() => {
            deferred.resolve();
            console.log(colors.red(new Date(), req.body.number + 'is Not allowed to subscribe ' + req.body.queue));
          });
        }
      } else {
        // Send warning that Queue does not exists
        bot.sendMessage({
          numbers: req.body.number,
          message: 'You cannot subscribe to ' + req.body.queue + '.  The queue ' + req.body.queue + ' does not exists.'
        }).then(() => {
          deferred.resolve();
          console.log(colors.red(new Date(), req.body.queue + ' Queue does not exists'));
        });
      }
    })
  }

  return deferred.promise;
}

function unsubscribe(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, subscribeSchema.subscribe);

  // Validate request
  if (v) {
    deferred.reject({message: v, status: 400});
  } else {
    mongo.findOne({queueType: req.body.queue}, {}, 'queues', (queue) => {
      // If queue is found
      if (queue) {
        let activeSubscribers = parseInt(queue.subscribed.length, 10) - 1;
        // Check if is subscribed
        if (queue.subscribed.indexOf(req.body.number) != -1) {
          mongo.update({queueType: req.body.queue}, {$pull: {subscribed: req.body.number}}, 'queues', () => {
            // Send confirmation that number is now unsubscribed
            bot.sendMessage({
              numbers: req.body.number,
              message: 'You are unsubscribed from ' + req.body.queue + '. There are now ' + activeSubscribers + ' active subscribers.'
            }).then(() => {
              console.log(colors.green(new Date(), req.body.number + ' is unsubscribed from ' + req.body.queue));
              updateSubcribers('unsubscribed', req.body.queue, req.body.number);
              deferred.resolve();
            });
          });
        } else {
          // Send warning that number is not subscribed to this queue
          bot.sendMessage({
            numbers: req.body.number,
            message: 'You are not subscribed to ' + req.body.queue + '.'
          }).then(() => {
            // Number is not subscribed to this queue
            console.log(colors.red(new Date(), req.body.number + ' is not subscribed to this queue'));
            deferred.resolve();
          });
        }
      } else {
        // Send a warning that Queue does not exists
        bot.sendMessage({
          numbers: req.body.number,
          message: 'You cannot unsubscribe from ' + req.body.queue + '. The queue ' + req.body.queue + ' does not exist.'
        }).then(() => {
          console.log(colors.red(new Date(), req.body.queue + ' Queue does not exists'));
          deferred.resolve();
        });
      }
    })
  }

  return deferred.promise;
}
