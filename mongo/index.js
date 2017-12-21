const MongoClient = require('mongodb').MongoClient;
const config = require('../config.json');

// Connection URL
const url = config.mongo;

// Inset into database
function insert(data, dbCollection, callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    // Get the collection
    const collection = db.collection(dbCollection);
    // Insert provided document/s
    collection.insertMany([
      data
    ], function(err, result) {
      if (callback) {
        callback(result);
      }
    });
  });
}

// Update database entry
function update(filter, data, dbCollection, callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    const collection = db.collection(dbCollection);
    // Update provided document/s
    collection.updateMany(filter, data, function(err, docs) {
      if (err) {
        console.log('Find error: ', err);
      }

      if (callback) {
        callback(docs);
      }
    });
  });
}

// Search for documents in db
/**
  Example usage with text search:
  find({ $text: { $search: 'oncologist' } }, 'messages', function(docs){
    console.log(docs);
  });
**/
function find(filter = {}, dbCollection, callback) {
  console.log(dbCollection);
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    // Get the collection
    // Get the documents collection
    const collection = db.collection(dbCollection);
    // Find some documents
    collection.find(filter).toArray(function(err, result) {
      if (err) {
        console.log('Find error: ', err);
      }
      if (callback) {
        callback(result);
      }
    });
  });
}

// Example usage: createTextIndex('messages', {queue: 'text'});
function createTextIndex(dbCollection, config) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    // Get the documents collection
    const collection = db.collection(dbCollection);

    collection.createIndex(config);
  });
}

module.exports = {
  insert,
  update,
  find,
  createTextIndex
}
