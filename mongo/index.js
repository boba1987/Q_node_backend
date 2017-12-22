const MongoClient = require('mongodb').MongoClient;
const config = require('../config.json');

// Connection URL
const url = config.mongo;

let dbConnection;

// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  dbConnection = db;
  createTextIndex('messages', {queue: 'text', message: 'text'});
});

// Inset into database
function insert(data, dbCollection, callback) {
  // Get the collection
  const collection = dbConnection.collection(dbCollection);
  // Insert provided document/s
  collection.insertMany([
    data
  ], function(err, result) {
    if (callback) {
      callback(result);
    }
  });
}

// Update database entries
function update(filter, data, dbCollection, callback) {
  const collection = dbConnection.collection(dbCollection);
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
/**
  Example usage with text search:
  find({ $text: { $search: 'oncologist' } }, 'messages', function(docs){
    console.log(docs);
  });
**/
function find(filter = {}, dbCollection, callback, skip = 0, limit = 0) {
  // Get the documents collection
  const collection = dbConnection.collection(dbCollection);

  // Find some documents
  collection.find(filter).sort({_id:-1}).skip(skip).limit(limit).toArray(function(err, result) {
    if (err) {
      console.log('Find error: ', err);
    }
    if (callback) {
      callback(result);
    }
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
  // Get the collection
  const collection = dbConnection.collection(dbCollection);
  collection.findOne(filter, options).then(function(doc) {
    if(callback) {
      callback(doc)
    }
  });
}

// Example usage: createTextIndex('messages', {queue: 'text'});
function createTextIndex(dbCollection, config) {
  // Get the documents collection
  const collection = dbConnection.collection(dbCollection);

  collection.createIndex(config);
}

module.exports = {
  insert,
  update,
  find,
  findOne,
  createTextIndex
}
