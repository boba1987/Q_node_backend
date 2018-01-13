const json2csv = require('json2csv');

function csv(res, fields, collection) {
  json2csv({ data: collection.items, fields: fields }, function(err, csv) {
    res.setHeader('Content-disposition', 'attachment; filename=data.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(csv);
  });
}

module.exports = {
  csv
}
