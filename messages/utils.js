const dateformat = require('dateformat');

module.exports = {
  generateQueueGroupName,
  isInclusive
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
