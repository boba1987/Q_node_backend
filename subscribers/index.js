const mongo = require('../mongo');
const validator = require('../validator');
const q = require('q');

const subscribeSchema = require('../schemas/subscribers.json');

// Subscribe user to a specific group based on req.body.queue
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
          console.log(new Date(), 'You are subscribed');
          deferred.resolve();
        });
      } else {
        console.log(new Date(), 'Not allowed to subscribe');
        deferred.resolve();
      }
    } else {
      // Queue does not exists
      console.log(new Date(), 'Queue does not exists');
    }
  })

  return deferred.promise;
}

module.exports = {
  subscribe
}
