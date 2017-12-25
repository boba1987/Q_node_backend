const config = require('../config.json');
const mongo = require('../mongo');
const Q = require('Q');

// GET routes generic resolve function
function resolveGet(req, collection, filter = {}) {
  const deferred = Q.defer();
  let pageSize = parseInt(req.query.pageSize) || config.pageSize;
  const skip = 0 || (parseInt(req.query.page) - 1) * pageSize; // Zero based, page number starts at 1
  let totalPages = 0;
  function callback(docs) {
    deferred.resolve({
      totalPages: Math.ceil(totalPages/pageSize),
      items: docs
    })
  }

  // Get total number of pages
  mongo.find(filter, collection, function(docs) {
    totalPages = docs.length;
    mongo.find(filter, collection, callback, skip, pageSize);
  });

  return deferred.promise;
}

module.exports = {
  resolveGet
}
