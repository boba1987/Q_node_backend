const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const config = require('../config.json');

// Connection URL
const url = config.mongo;

// Inset into database
function insert(data, dbCollection, callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    // Get the collection
    const collection = db.collection(dbCollection);
    // Insert provided document/s
    collection.insertMany([
      data
    ], function(err, result) {
      if (callback) {
        callback(result);
      }
      db.close();
    });
  });
}

module.exports = {
  insert
}
