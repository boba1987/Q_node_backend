const resolver = require('../resolver');
const mongo = require('../mongo');
const Q = require('Q');

function getMessages(req) {
  const deferred = Q.defer();
  resolver.resolveGet(req, 'messages').then(messages => {
    mongo.find({}, 'queues', function(queues) {
      messages.items.map(message => { // Enhance each messsage with number of subscribers
        message.responseFrom = [];
        queues.map(queue => { // Map trough queues to attahch subscribers to response and attach whoever replied
          if (message.queue == queue.queue) {
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

module.exports = {
  getMessages
};
