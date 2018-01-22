const mongo = require('../mongo');

// Subscribe user to a specific group based on req.body.queue
function subscribe(req) {
  mongo.findOne({queueType: req.body.queue}, {}, 'queues', (queue) => {
    console.log(queue);
  })
}

module.exports = {
  subscribe
}
