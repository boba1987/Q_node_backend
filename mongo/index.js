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
      db.close();
    });
  });
}

// Update database entries
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
      db.close();
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
      db.close();
    });
  });
}

// Find one document in db
/**
  Example usage with text search:
  find({id: 1}, 'admins', function(doc){
    console.log(doc);
  });
**/
function findOne(filter, options = {}, dbCollection, callback) {
  // Use connect method to connect to the Server
  MongoClient.connect(url, function(err, db) {
    // Get the collection
    const collection = db.collection(dbCollection);
    collection.findOne(filter, options).then(function(doc) {
      if(callback) {
        callback(doc)
      }
      db.close();
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
    db.close();
  });
}

module.exports = {
  insert,
  update,
  find,
  findOne,
  createTextIndex
}
