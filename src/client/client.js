/**
 * @fileoverview Client entry point
 */

/**
 * TODO Friday
 * create a client that:
 * -handles requests from the user/interface via an API
 * -serves requests for items from the local database
 * -if the item is not found in the local database,
 * -aquires provider address(es) from the routing modules
 * and then
 * -creates connections to remote servers and requests for items
 * -any items received from remote servers are stored in the local database
 * -and user is notified of the item?
 *
 * How does the client interface work. Should it serve a local only "web" API?
 *
 * PUT /item (add to local db only...)
 * PUB /item (update feed, then send to remote) (COMBINED WITH PUT?)
 * GET /item (from local -> remote)
 * --docs
 * --feed
 * --userinfo
 * UPDATE /feeds
 */

const WebSocket = require('ws');
const debug = require('debug')('client');

const database = require('../database/database');
const { authenticateUser, createNewUser } = require('../auth/auth');
const { RequestTypes, Request } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');
const { isValidItemType } = require('../models/types');
const { isKey, isValidKey } = require('../utils/utils');
const { getProviders } = require('../network/routing');
const { de } = require('@faker-js/faker');

let userSession = null;

function authenticateUserSession(publicKey, secretKey) {
  try {
    if (authenticateUser(publicKey, secretKey)) {
      userSession = { publicKey, secretKey };
      return true;
    }
    debug('Authentication Failed (Incorrect key?)');
  } catch (err) {
    debug('Authentication Error:', err);
  }
  return false;
}

async function getItem(key, type) {
  // check the parameters are valid // should this be a seperate function?
  if (!key || !type) {
    return 'Invalid request, missing parameters';
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!isKey(key)) {
    return new Response(ResponseTypes.Error, 'Invalid key format.');
  }

  // check local db // should this be a seperate function?
  try {
    debug(`Getting item from local database\nKey: ${key}\nType: ${type}`);
    const item = database.get(key, type);

    if (item) {
      return new Response(ResponseTypes.Success, item);
    }
    debug('Item not found in local database.');
  } catch (error) {
    // Possibly massage the error message to make it more readable for users
    return new Response(ResponseTypes.Error, error.message);
  }

  // try providers
  try {
    const result = getItemFromProviders(key, type);
    debug('Result from providers:', result);
    return result;
  } catch (err) {
    debug('Error getting item from providers:', err);
    return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }
}

async function getItemFromProviders(key, type) {
  const providers = getProviders(key, type);

  if (!providers) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }

  const request = new Request(RequestTypes.Get, { key, type });

  async function tryConnectToProvider(provider) {
    try {
      const ws = new WebSocket(`ws://${provider.ip}:${provider.port}`);
      await new Promise((resolve) => ws.on('open', resolve)); // wait for connection to open before continuing
      ws.send(JSON.stringify(request));

      let responseRecieved = false;

      const responsePromise = new Promise((resolve, reject) => {
        ws.on('message', (message) => {
          responseRecieved = true;

          const response = JSON.parse(message);
          if (response.type === ResponseTypes.Success) {
            ws.close();
            resolve(response.item);
          } else if (response.type === ResponseTypes.Error) {
            ws.close();
            resolve(null);
          }
        });
      });

      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          if (!responseRecieved) {
            ws.close();
            debug('Connection or response timed out.');
            reject(new Error('Connection or response timed out.'));
          }
        }, 10000); // 10 seconds timeout, adjust as needed

        // if response is recieved before timeout, cancel the timeout
        responsePromise.finally(() => clearTimeout(timeoutId));
      });

      // Use Promise.race to resolve with the first resolved promise
      return Promise.race([responsePromise, timeoutPromise]);
    } catch (err) {
      debug('Error connecting to provider:', err);
      return null;
    }
  }

  // for (const provider of providers) {
  for (let i = 0; i < providers.length; i += 1) {
    console.log('Trying provider:', providers[i]);
    const item = await tryConnectToProvider(providers[i]);
    if (item !== null) {
      return new Response(ResponseTypes.Success, item);
    }
  }

  // if no item recieved, return error
  return new Response(ResponseTypes.Error, 'No provider has the item.');
}

// async function tryConnectToProvider(provider) {
//   try {
//     const ws = new WebSocket(`ws://${provider.ip}:${provider.port}`);
//     await new Promise((resolve) => ws.on('open', resolve)); // wait for connection to open before continuing
//     ws.send(JSON.stringify(request));

//     return new Promise((resolve, reject) => {
//       ws.on('message', (message) => {
//         const response = JSON.parse(message);
//         // console.log('Response from provider:', response);
//         if (response.type === ResponseTypes.Success) {
//           ws.close();
//           resolve(response.item);
//         } else if (response.type === ResponseTypes.Error) {
//           // console.log('Error getting item from provider:', response.message);
//           ws.close();
//           resolve(null);
//           // reject(response.message);
//         }
//       });

//       ws.on('error', (err) => {
//         debug('Websocket error:', err);
//         reject(err);
//       });
//     });
//   } catch (err) {
//     debug('Error connecting to provider:', err);
//     return null;
//   }
// }

function putItem(key, value, type) {
  // add to local db only
  // update feed?

}

function pubItem(key, value, type) {
  // add to local db
  // update feed
  // send to peers / dht
}

function updateFeeds() {
  // get followed peers from local db
  // get feeds for peers (if available)

  // get feeds from local db
  // get provider for each feed
  // get feed from provider
  // update local db
}

function updateUserFeed() {
  // get user feed
  // append new items
  // update local db
}

// console.log(getItem('20292bf632e04f4c', 'document'));

async function getTest(key) {
  const res = await getItem(key, 'document');
  console.log('Trying to get item', key, ':\n', res);
}

getTest('20292bf632e04f4c');
getTest('0000000000000000');

// function connectToProvider(provider) {
//   return new Promise((resolve, reject) => {
//     const ws = new WebSocket(`ws://${provider.ip}:${provider.port}`);

//     ws.on('open', () => {
//       ws.send(JSON.stringify(request));
//     });

//     ws.on('message', (message) => {
//       const response = JSON.parse(message);
//       if (response.responseType === ResponseTypes.Success) {
//         ws.close();
//         resolve(response.item);
//       }
//     });

//     ws.on('error', (err) => {
//       reject(err);
//     });
//   });
// }
