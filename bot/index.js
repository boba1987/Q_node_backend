// This module holds methods for communication with the bot
const request = require('request');
const q = require('q');
const botUrl = 'https://bot.s1z.info';

module.exports = {
  login,
  sendMessage,
  createGroup
}

function sendRequest(body, deferred, url) {
  request({
    method: 'POST',
    uri: botUrl + url,
    body: JSON.stringify(body)
  },
  (err,httpResponse,body) => {
    if (err) {
      return deferred.reject(err);
    }

    // If 403 status, repeat the http call
    if (httpResponse.statusCode == 403) {
      
    }

    deferred.resolve({httpResponse, body});
  });
}

// Bot login function, required body object
/*
  {
    "email":"mail@hospital.com",
    "password":"medex"
  }
*/
function login(body) {
  console.log('aaa');
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
