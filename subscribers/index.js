const mongo = require('../mongo');
const validator = require('../validator');
const q = require('q');
const colors = require('colors');
const bot = require('../bot');

const subscribeSchema = require('../schemas/subscribers.json');

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
        let activeSubscribers = parseInt(queue.subscribed.length, 10) + 1;
        /*
          Check if allowedToSubsribe field is set and is number allowed to subscribe OR if allowedToSubsribe is not set, subscribe number
        */
        if ((queue.allowedToSubsribe.length && queue.allowedToSubsribe.indexOf(req.body.number) != -1) || !queue.allowedToSubsribe.length) {
          // Check if allready subscribed
          if (queue.subscribed.indexOf(req.body.number) != -1) {
            // Send warning that number is allready subscribed
            bot.sendMessage({
              numbers: req.body.number,
              message: 'You are already subscribed to  ' + req.body.queue + ' You are 1 of ' + activeSubscribers + ' active subscribers.'
            }).then(() => {
              console.log(colors.red(new Date(), req.body.number + 'is allready subscribed to ' + req.body.queue));
              deferred.resolve();
            });
          } else {
            // Subscirbe user
            mongo.update({queueType: req.body.queue}, {$push: {subscribed: req.body.number}}, 'queues', () => {
              // Send confirmation that number is now subscribed
              bot.sendMessage({
                numbers: req.body.number,
                message: 'You have subscribed to ' + req.body.queue + ' You are 1 of ' + activeSubscribers + ' active subscribers.'
              }).then(() => {
                console.log(colors.green(new Date(), req.body.number + ' subscribed to ' + req.body.queue));
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

module.exports = {
  subscribe,
  unsubscribe
}
