const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const config = require('../config.json');

// Connection URL
const url = config.mongo;
let dbInstance;

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  // Get the collection
  dbInstance = db;
});

// Inset into database
function insert(data, dbCollection, callback) {
  const collection = dbInstance.collection(dbCollection);
  // Insert provided document/s
  collection.insertMany([
    data
  ], function(err, result) {
    if (callback) {
      callback(result);
    }
  });
}

// Update database entry
function update(filter, data, dbCollection, callback) {
  const collection = dbInstance.collection(dbCollection);
  // Update provided document/s
  collection.updateMany(filter, data, function(err, docs) {
    if (err) {
      console.log('Find error: ', err);
    }

    if (callback) {
      callback(docs);
    }
  });
}

// Search for documents in db
function find(filter = {}, dbCollection, callback) {
  // Get the documents collection
  var collection = dbInstance.collection(dbCollection);
  // Find some documents
  collection.find(filter).toArray(function(err, result) {
    if (err) {
      console.log('Find error: ', err);
    }
    if (callback) {
      callback(result);
    }
  });
}

module.exports = {
  insert,
  update,
  find
}
