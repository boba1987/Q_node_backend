// This module holds methods for communication with the bot
const request = require('request');
const q = require('q');
const botUrl = 'https://bot6.textsecure.medx.im';

module.exports = {
  login,
  sendMessage,
  createGroup
}

let credentials = {
  email: '',
  auth: {
    token: ''
  }
};

function sendRequest(body, promise, url) {
  request({
    method: 'POST',
    uri: botUrl + url,
    body: JSON.stringify(body),
    headers: {
      Authorization: 'Bearer ' + credentials.auth.token
    }
  },
  (err,httpResponse,response) => {
    if (err) {
      promise.reject(err);
    }

    // If 401 status, repeat the http call
    if (httpResponse.statusCode == 401 || httpResponse.statusCode == 403) {
      login({'email':'mail@hospital.com', 'password':'medex'}).then((res) => {
        credentials = JSON.parse(res.response);
        sendRequest(body, promise, url);
      });

      return;
    }

    promise.resolve({httpResponse, response});
  });
}

// Bot login function, required body object
/*
  {
    'email':'mail@hospital.com',
    'password':'medex'
  }
*/
function login(body) {
  const deferred = q.defer();

  sendRequest(body, deferred, '/login');

  return deferred.promise;
}

// Send message via bot funciton
/* Required payload
  {
    “numbers”: “+381757593, +381757414, +34124543”,
    “message”: “@surgeons Room 8, urgent!”
    “queueGroup”: “@cardiologist_142400_151017”
  }
*/
function sendMessage(body) {
  const deferred = q.defer();

  sendRequest(body, deferred, '/message/send');

  return deferred.promise;
}


// Create a group via bot
/* Required payload
  {
    “queueGroup”: “@cardiologist_142400_151017”
    “numbers”: “+381757593, +34124543, +12351253”
  }
*/
function createGroup(body) {
  const deferred = q.defer();

  sendRequest(body, deferred, '/group/create');

  return deferred.promise;
}
