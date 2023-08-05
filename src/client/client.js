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
const { isValidKeyFormat, generateKey } = require('../utils/utils');
const { getProviders } = require('../network/providers');
const { validateItem } = require('../models/validation');

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

  if (!isValidKeyFormat(key)) {
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
    const result = await getItemFromProviders(key, type);
    debug('Result from providers:', result);
    return result;
  } catch (err) {
    debug('Error getting item from providers:', err);
    return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }
}

async function getItemFromProviders(key, type) {
  const providers = getProviders(key, type);

  if (!providers || providers.length === 0) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }

  const request = new Request(RequestTypes.Get, { key, type });

  // map the array of providers to an array of promises
  const promises = providers.map((provider) => sendRequestToProvider(request, provider));

  // wait for all promises to resolve
  const results = await Promise.all(promises);

  // find successful responses
  const successfulResult = results.filter((result) => result !== null)
    .find((result) => result.type === ResponseTypes.Success);

  if (successfulResult) {
    return successfulResult;
  }

  // if no item recieved, return error
  return new Response(ResponseTypes.Error, 'No provider has the item.');
}

/**
 * @description Adds an item to the local database, Key and type are generated from the item.
 * @param {Object} item The item to be added to the database.
 */
function putItem(item) {
  // validate item
  if (!item) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing item.');
  }

  if (!isValidItemType(item.type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!validateItem(item)) {
    return new Response(ResponseTypes.Error, `Provided item is not a valid ${item.type}.`);
  }

  // add to local db only
  const key = generateKey(item);
  const { type } = item;

  try {
    debug(`Putting item into local database\nKey: ${key}\nType: ${type}\nData: ${JSON.stringify(item)}`);
    const result = database.put(key, type, item);
    if (!result) {
      return new Response(ResponseTypes.Error, 'Error putting item into database.');
    }
    return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
  } catch (error) {
    return new Response(ResponseTypes.Error, error.message);
  }
}

function pubItem(item) {
  // validate item
  if (!item) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing item.');
  }

  if (!isValidItemType(item.type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!validateItem(item)) {
    return new Response(ResponseTypes.Error, `Provided item is not a valid ${item.type}.`);
  }

  // add to local db only
  const key = generateKey(item);
  const { type } = item;

  // if not in local db then add to local db
  try {
    debug(`Putting item into local database\nKey: ${key}\nType: ${type}\nData: ${JSON.stringify(item)}`);
    const result = database.put(key, type, item);
    if (!result) {
      return new Response(ResponseTypes.Error, 'Unknown error putting item into database.');
    }
    // return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
    debug('Item added to local database.');
  } catch (error) {
    if (error.message !== 'Key already exists in database.') {
      debug('Error putting item into local database:', error);
      return new Response(ResponseTypes.Error, error.message);
    }
    debug('Item not added to local database, already exists. Continuing...');
  }

  // update feed
  updateUserFeed(item);

  // send to peers / dht
  try {
    debug(`Sending ${key} to providers...`);
    const result = sendItemToProviders(key, type, item);
    if (!result) {
      return new Response(ResponseTypes.Error, 'Error sending item to providers.');
    }
    return result;
    // return new Response(ResponseTypes.Success, 'Item sent to providers.');
  } catch (error) {
    debug('Error sending item to providers:', error);
    return new Response(ResponseTypes.Error, error.message);
  }
}

function updateFeeds() {
  // get followed peers from local db
  // get feeds for peers (if available)

  // get feeds from local db
  // get provider for each feed
  // get feed from provider
  // update local db
}

function updateUserFeed(item) {
  // get user feed
  // append new items
  // update local db
}

/** -------------------------- internal use functions ---------------------------------- */

/**
 * @description Generic function to sends a "request" (e.g. GET, PUT, etc) to a
 * provider.
 * @param {Request} request The request to send to the providers. Containing the key,
 * type and/or data of the item.
 */
async function sendRequestToProvider(request, provider) {
  try {
    const ws = new WebSocket(`ws://${provider.ip}:${provider.port}`);

    return new Promise((resolve, reject) => {
      ws.on('error', (err) => {
        debug('Websocket error:', err);
        // reject(err);
        // Should it resolve with the error Response instead?
        resolve(null);
      });

      // wait for connection to open before continuing
      // await new Promise((resolve) => { ws.on('open', resolve); });

      ws.on('open', () => {
        ws.send(JSON.stringify(request));

        let responseRecieved = false;

        const responsePromise = new Promise((resResolve) => {
          ws.on('message', (message) => {
            responseRecieved = true;

            const response = JSON.parse(message);
            debug('Response:', response);

            if (response.type === ResponseTypes.Success) {
              ws.close();
              resResolve(response);
            } else if (response.type === ResponseTypes.Error) {
              ws.close();

              // Should it resolve with the error Response instead?
              resResolve(null);
            }
          });
        });

        const timeoutPromise = new Promise((_, timeoutReject) => {
          const timeoutId = setTimeout(() => {
            if (!responseRecieved) {
              ws.close();
              debug('Connection or response timed out.');
              timeoutReject(new Error('Connection or response timed out.'));
            }
          }, 10000); // 10 seconds timeout, adjust as needed

          // if response is recieved before timeout, cancel the timeout
          responsePromise.finally(() => clearTimeout(timeoutId));
        });

        // Use Promise.race to resolve with the first resolved promise
        return Promise.race([responsePromise, timeoutPromise])
          .then((result) => { resolve(result); })
          .catch((err) => { reject(err); });
      });
    });
  } catch (err) {
    debug('Error connecting to provider:', err);
    return null;
  }
}

async function sendItemToProviders(key, type, data) {
  const providers = getProviders(key, type);

  // if no providers found, return error
  if (!providers || providers.length === 0) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }

  const request = new Request(RequestTypes.Put, { key, type, data });

  // map the array of providers to an array of promises
  const promises = providers.map((provider) => sendRequestToProvider(request, provider));

  // wait for all promises to resolve
  const results = await Promise.all(promises);

  const successfulResponsesCount = results
    .filter((result) => result !== null && result.type === ResponseTypes.Success).length;

  debug('Number of successful responses:', successfulResponsesCount);

  if (successfulResponsesCount > 0) {
    return new Response(ResponseTypes.Success, `Item sent to ${successfulResponsesCount} providers.`);
  }

  // if successful responses, return error
  return new Response(ResponseTypes.Error, 'No provider recieved the item.');
}

/* -------------------------------- Temporary tests -------------------------------- */

async function getTest(key) {
  const res = await getItem(key, 'document');
  console.log('Trying to get item', key, ':\n', res);
}

async function test() {
  getTest('20292bf632e04f4c');
  getTest('0000000000000000');
}

test();

const doc = {
  type: 'document',
  id: '1231231231231999',
  owner: '20292bf632e04f4c',
  timestamp: '2021-03-25T18:00:00.000Z',
  title: 'Second Test Document',
  content: 'This is a test document.',
  tags: ['test', 'document'],
};

// The problem with testing is that we need to use two separate databases for pubbing.
async function pubTest(item) {
  const res = await pubItem(item);
  console.log('>> Pubbing item Response:', res);
}

// pubTest(doc);

/* -------------------------------- ----------------- -------------------------------- */

module.exports = {
  authenticateUserSession,
  getItem,
  putItem,
  pubItem,
  updateFeeds,
  updateUserFeed,
};
