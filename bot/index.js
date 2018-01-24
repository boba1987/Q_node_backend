// This module holds methods for communication with the bot
const request = require('request');
const q = require('q');


module.exports = {
  login
}

function login(userName, password) {
  const deferred = q.defer();

  request({
    method: 'POST',
    uri: 'https://bot.s1z.info/login',
    body: JSON.stringify({'email': userName, 'password': password})
  },
  (err,httpResponse,body) => {
    if (err) {
      return deferred.reject(err);
    }

    deferred.resolve({httpResponse, body});
  });

  return deferred.promise;
}
