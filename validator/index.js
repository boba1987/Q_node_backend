const validate = require('jsonschema').Validator;
const validator = new validate();

function isValid(req, schema) {
  let validation = validator.validate(req.body || req, schema).errors;
  if(validation.length != 0){ // Validate body of the request
    for (let i=0; i<validation.length; i++) {
      // Remove unnececary properties from error message
      delete validation[i].instance;
      delete validation[i].schema;
    }

    return validation;
  }

  return false;
}

module.exports = {
  isValid
}
