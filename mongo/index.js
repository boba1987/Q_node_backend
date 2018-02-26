const MongoClient = require('mongodb').MongoClient;
const config = require('../config.json');

// Connection URL
const url = config.mongo;

let dbConnection;

module.exports = {
  insert,
  update,
  find,
  findOne,
  createTextIndex,
  drop,
  findOneAndUpdate,
  aggregate,
  deleteOne
}

// Usage: deleting document out of collection
/*
* Example usage: mongo.deleteOne({queueType: '@cardiologists'}, options = {}, dbCollection, callback);
* */
function deleteOne(filter, options = {}, dbCollection, callback) {
    const collection = dbConnection.collection(dbCollection);

    collection.deleteOne(filter, options, () => {
      if(callback) {
        callback()
      }
    })
}


// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
  if (err) console.log(err);
  dbConnection = db;
  createTextIndex('messages', {queueGroup: 'text', message: 'text'});
  createTextIndex('subscribers', {queueGroup: 'text', message: 'text'});
  createTextIndex('queues', {queueGroup: 'text', message: 'text'});
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

/**
  Update database entries
  Example usage:
  mongo.update({_id: user._id}, {$set: {password: tempPassword}}, 'users', callback());
**/
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
function find(filter = {}, dbCollection, callback, skip = 0, limit = 0, projection = {}) {
  // Get the documents collection
  const collection = dbConnection.collection(dbCollection);

  // Find some documents
  collection.find(filter).sort({_id:-1}).skip(skip).limit(limit).project(projection).toArray(function(err, result) {
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

function drop(dbCollection, callback) {
  let collection = dbConnection.collection(dbCollection);
  collection.drop(callback());
}


// Find and update a single document
/*
  Example usage
  findAndUpdateOne({filter, update, collection, callback, options})
*/

function findOneAndUpdate(filter, update, dbCollection, callback, options = {}) {
  const collection = dbConnection.collection(dbCollection);

  collection.findOneAndUpdate(filter, update, options, function(err, docs) {
    if (err) {
      console.log('findOneAndUpdate err: ', err)
    }

    if (callback) {
      callback(docs);
    }
  })
}

// Aggregate and find first occurance of document by some criteria
function aggregate(dbCollection, sort, group, options, match = {}, callback) {
  const collection = dbConnection.collection(dbCollection);

   collection.aggregate([{ $match: { queueGroup: { $regex: new RegExp(options.filter) } } }, { $sort: sort }, { $group: group }, match]).sort({uid: -1}).skip(options.skip).limit(options.limit).toArray((err, result) => {
     if (err) {
       console.log('mongo aggregate error: ', err);
     }
     if (callback) {
       callback(result);
     }
   })
}
