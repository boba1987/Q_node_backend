const mongo = require('../mongo');
const validator = require('../validator');
const q = require('q');
const colors = require('colors');

const subscribeSchema = require('../schemas/subscribers.json');

// Subscribe user to a specific group based on req.body.queue
// TODO: Connect this method to the bot
function subscribe(req) {
  const deferred = q.defer();
  const v = validator.isValid(req, subscribeSchema.subscribe);
  // Validate request
  if (v) {
    deferred.reject({message: v, status: 400});
  } else {

  }
  mongo.findOne({queueType: req.body.queue}, {}, 'queues', (queue) => {
    // If queue is found
    if (queue) {
      // Check if number is allowed to subscribe
      if (queue.allowedToSubsribe.indexOf(req.body.number) != -1) {
        mongo.update({queueType: req.body.queue}, {$push: {subscribed: req.body.number}}, 'queues', () => {
          console.log(colors.green(new Date(), req.body.number + ' subscribed to ' + req.body.queue));
          deferred.resolve();
        });
      } else {
        console.log(colors.red(new Date(), req.body.number + 'is Not allowed to subscribe ' + req.body.queue));
        deferred.resolve();
      }
    } else {
      // Queue does not exists
      console.log(colors.red(new Date(), req.body.queue + ' Queue does not exists'));
      deferred.resolve();
    }
  })

  return deferred.promise;
}

function unsubscribe(req) {

}

module.exports = {
  subscribe,
  unsubscribe
}
