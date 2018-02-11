const validator = require('../validator');
const mongo = require('../mongo');
const queuesSchema = require('../schemas/queues.json');

module.exports = {
  PAobject,
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

const PAobject = [
    {
        'id': '1',
        'input': 'false',
        'style': {
            'bg_color': ''
        },
        'rows': [
            {
                'style': {
                    'size': '1.00',
                    'bg_color': ''
                },
                'cells': [
                    {
                        'title' : 'Show an info',
                        'cmd'   : '/showinfo',
                        'input' : 'false',
                        'link'  : '1',
                        'echo'  : 'true',
                        'style': {
                            'color'   : '#ffffff',
                            'border'  : '#999999',
                            'bg_color': '#999999',
                            'width'   : '1'
                        }
                    }
                ]
            }
        ]
    }
]
