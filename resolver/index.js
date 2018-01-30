const config = require('../config.json');
const mongo = require('../mongo');
const q = require('q');

module.exports = {
  resolveGet,
  aggregate
}

// GET routes generic resolve function
function resolveGet(req, collection, filter = {}, projection = {}) {
  const deferred = q.defer();
  let pageSize = parseInt(req.query.pageSize) || config.pageSize;
  const skip = 0 || (parseInt(req.query.page) - 1) * pageSize; // Zero based, page number starts at 1
  function callback(docs) {
    deferred.resolve({
      totalPages: Math.ceil(docs.length/pageSize),
      items: docs
    })
  }

  // If there is parameter "search" on the request, do text search on DB
  if (req.query.search) {
    filter['queueGroup'] = new RegExp(req.query.search);
  }

  // Get total number of pages
  mongo.find(filter, collection, () => {
    mongo.find(filter, collection, callback, skip, pageSize, projection); // Get only filtered documents
  });

  return deferred.promise;
}

function aggregate(req, collection, sort = {}, group = {}) {
  const deferred = q.defer();
  let pageSize = parseInt(req.query.pageSize) || config.pageSize;
  const skip = 0 || (parseInt(req.query.page) - 1) * pageSize; // Zero based, page number starts at 1
  function callback(docs) {
    deferred.resolve({
      totalPages: Math.ceil(docs.length/pageSize),
      items: docs
    })
  }

  let options = {
    skip,
    limit: pageSize,
    filter: ''
  };

  // If there is parameter "search" on the request, do text search on DB
  if (req.query.search) {
    options.filter = new RegExp(req.query.search);
  }

  // Get total number of pages
  mongo.find(options, collection, () => {
    mongo.aggregate('messages', sort, group, options, callback); // Get only filtered documents
  });

  return deferred.promise;
}
