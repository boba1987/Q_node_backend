const dateformat = require('dateformat');
const q = require('q');
const mongo = require('../mongo');
const bot = require('../bot');

const PAobject = [
    {
        'id': '1',
        'input': 'false',
        'style': {
            'bg_color': ''
        },
        'rows': [
            {
                'style': {
                    'size': '1.00',
                    'bg_color': ''
                },
                'cells': [
                    {
                        'title' : 'Acknowledged',
                        'cmd'   : 'Acknowledged',
                        'input' : 'false',
                        'link'  : '1',
                        'echo'  : 'true',
                        'style': {
                            'color'   : '#ffffff',
                            'border'  : '#999999',
                            'bg_color': '#999999',
                            'width'   : '1'
                        }
                    }
                ]
            }
        ]
    }
];

const acknolegmentCommand = 'Acknowledged';

module.exports = {
  generateQueueGroupName,
  isInclusive,
  PAobject,
  acknolegmentCommand,
  getOriginalQueueGroupMessage,
  sendAckMessage
}

// Get original queue group message
function getOriginalQueueGroupMessage(queueGroup) {
  const deferred = q.defer();

  mongo.findOne({queueGroup}, {sort: {time: 1}}, 'messages', (message) => {
    deferred.resolve(message);
  });

  return deferred.promise;
}

function generateQueueGroupName(name) {
  const currDate = new Date();

  let generatedName = name + dateformat(currDate, '_HHMMss_ddmmyyyy');

  return generatedName;
}

// Utility function that checks if queue is type of inclusive
function isInclusive(queue, sender) {
  let numbersToSend = queue.subscribed.slice(0);

  // Check if queue is type of inclusive and if it is add sender if not in queue subscribers
  if (queue.isInclusive && queue.subscribed.indexOf(sender) == -1) {
    numbersToSend.push(sender);
    return numbersToSend.toString().split(',').join(', ');
  } else {
    // Number is either found in subscribers or queue is type of exclusive
    return numbersToSend
  }
}

function sendAckMessage(req, deferred, queueGroup) {
  // If it is acknolegment message
  if (req.body.message == acknolegmentCommand) {
    // Get original message
    getOriginalQueueGroupMessage(queueGroup).then((originalMsg) => {
      // Send acknolegment message to queue group original message sender
      bot.sendMessage({
        numbers: queueGroup[0].owner,
        message: req.body.number + ' Acknowledged the message "' + originalMsg.message + '"'
      }).then(() => {
        deferred.resolve();
      })
    })
  }
}
