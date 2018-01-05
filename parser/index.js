const Q = require('Q');
const fs = require('fs');
const parse = require('csv-parse');

// GET routes generic resolve function
function csv(path) {
  const deferred = Q.defer();
  const fileToParse = fs.readFileSync(path, 'utf8');

  parse(fileToParse, {columns: true}, (err, output) => {
    let parsed = output.map(item => {return item.number});

    deferred.resolve(parsed);
  });

  return deferred.promise;
}

module.exports = {
  csv
}
