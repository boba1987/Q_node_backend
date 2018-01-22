const config = require('../config.json');
const mongo = require('../mongo');
const q = require('q');

// GET routes generic resolve function
function resolveGet(req, collection, filter = {}, projection = {}) {
  const deferred = q.defer();
  let pageSize = parseInt(req.query.pageSize) || config.pageSize;
  const skip = 0 || (parseInt(req.query.page) - 1) * pageSize; // Zero based, page number starts at 1
  let totalPages = 0;
  function callback(docs) {
    deferred.resolve({
      totalPages: Math.ceil(totalPages/pageSize),
      items: docs
    })
  }

  // If there is parameter "search" on the request, do text search on DB
  if (req.query.search) {
    filter['queueGroup'] = new RegExp(req.query.search);
  }

  // Get total number of pages
  mongo.find(filter, collection, function(docs) {
    totalPages = docs.length;
    mongo.find(filter, collection, callback, skip, pageSize, projection); // Get only filtered documents
  });

  return deferred.promise;
}

module.exports = {
  resolveGet
}
