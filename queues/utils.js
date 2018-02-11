const validator = require('../validator');
const mongo = require('../mongo');
const queuesSchema = require('../schemas/queues.json');

module.exports = {
  save
};

function save(fields, deferred) {
  const v = validator.isValid(fields, queuesSchema.create); // Validate request
  if (v) {
    deferred.reject({status: 400, message: v});
  } else {
    mongo.insert(fields, 'queues', (res) => {
      deferred.resolve(res.ops[0]);
    })
  }
}
