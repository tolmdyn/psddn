/**
 * @fileoverview Client functions for the application. To be used by the user interface.
 */

/**
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
 * Item is either:
 * --document
 * --feed
 * --user(info)
 *
 * # Authentication
 * -authenticate user / create session
 * -create new user (as profile)
 * -sign documents/feeds
 * -verify documents/feeds
 *
 * # Actions (Only Remote actions generate a request/response)
 * (All gets try local first then remote.)
 *
 * Unauthenticated actions (does not require a valid user session):
 * -get item (from local -> remote)
 * -get user feed
 * -get user info / public key
 * -get user documents from feed
 * -get user documents from local db
 * -get user documents from remote
 *
 * Authenticated actions (requires a valid user session):
 * -put item (add to local db only...)
 * -pub item (update feed, then send to remote) (COMBINED WITH PUT?)
 * -update user feed
 * -update followed feeds
 * -get all followed feed documents? (using get user doc from feed)
 *
 * # Users
 * -get followed users
 * -add followed user
 * -remove followed user ?
 * -get user info
 *
 */
const fs = require('fs');
const WebSocket = require('ws');
const debug = require('debug')('client');

const {
  authNewUser,
  authUserWithKey,
  authUserWithPassword,
  getUserSessionKey,
} = require('../auth/auth');

const { RequestTypes, Request } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');
const { isValidItemType } = require('../models/types');
const { isValidKeyFormat } = require('../utils/utils');
const { getProviders } = require('../network/providers');
const { validateItem } = require('../models/validation');

// let userSession = null;
let Database = null;

function initClient(dbInstance) {
  Database = dbInstance;

  // createNewUserSession('testuser');
  // debug('User session created.', getUserSession());
}

function loginUser(key, password) {
  // OR loginUser(key, password, secretKey) {
  // if password, if secretkey
  try {
    const userProfile = loadUserProfile(key);
    // Login with secretKey
    // const newUser = authUserWithKey(key, password, userProfile);

    // Login with password
    const newUser = authUserWithPassword(key, password, userProfile);
    debug('User:', newUser.key);
    return newUser;
  } catch (error) {
    debug('Error creating new user session.', error.message);
    process.exit(1);
  }

  // debug(`Logging in user session... Key: ${key}, Password: ${password}`);
  return null;
}

/**
 * TODO - Provisional implementation - to be confirmed.
 * @description Creates a new user session and adds the user to the local database.
 * @param {} nickname Optional nickname to use for the user, not neccessarily unique.
 * @returns A new user object. (maybe with the secret key also ?)
 */
function loginNewUser(nickname, password) {
  try {
    const { userProfile, secretKey } = authNewUser(nickname, password);
    const newUser = userProfile.userObject;
    debug('NEW User:', newUser.key, 'Secret Key:', secretKey);
    saveUserProfile(userProfile);
    return newUser;
  } catch (error) {
    debug('Error creating new user session.', error.message);
  }

  return null;
}

/* --- USER PROFILE --- */
function saveUserProfile(userProfile) {
  Database.putUserProfile(userProfile);
}

// Temporary functions until Database.saveProfile is implemented
function loadUserProfile(key) {
  return Database.getUserProfile(key);
}

// async function saveUserProfileFile(userProfile) {
//   // return this.put(userProfile, Types.UserProfile);
//   const profileString = JSON.stringify(userProfile);
//   const { key } = userProfile;
//   try {
//     await fs.writeFileSync(`userProfile${key}.json`, profileString);
//   } catch (error) {
//     throw new Error('Error saving user profile');
//   }
//   debug('Saved user profile.');
// }

// function loadUserProfileFile(publicKey) {
//   // return this.get(publicKey, Types.UserProfile);
//   try {
//     const profileString = fs.readFileSync(`userProfile${publicKey}.json`);
//     const profile = JSON.parse(profileString);
//     debug('Loaded user profile.');
//     return profile;
//   } catch (error) {
//     throw new Error('Error loading user profile');
//   }
// }

/* --- ACTIONS --- */

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
    const item = Database.get(key, type);

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
  const providers = await getProviders(key, type);
  debug('Providers:', providers);

  if (!providers || providers.length === 0) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }

  const request = new Request(RequestTypes.Get, { key, type });

  // map the array of providers to an array of promises
  const promises = providers.map((provider) => sendRequestToProvider(request, provider));

  // wait for all promises to resolve
  const results = await Promise.all(promises);
  debug('Results from providers:', results);

  // find successful responses
  const successfulResult = results.filter((result) => result !== null)
    .find((result) => result.responseType === ResponseTypes.Success);

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

  // sign / verify item here before adding to db

  // add to local db only
  // const key = generateKey(item);
  // const { type } = item;
  // OR const { key, type } = item;

  try {
    debug(`Putting item into local database:\n${JSON.stringify(item)}`);
    const result = Database.put(item);
    if (!result) {
      return new Response(ResponseTypes.Error, 'Error putting item into database.');
    }
    return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
  } catch (error) {
    return new Response(ResponseTypes.Error, error.message);
  }
}

/**
 * @description Publishes item to relevant providers, and adds to local database if not present.
 * Key and type are generated from the item.
 * @param {*} item The item to be published.
 * @returns {Response} A response object containing the result of the request.
 */
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

  // sign / verify item here before adding to db

  // add to local db only
  // const key = generateKey(item);
  // const { type } = item;

  // if not in local db then add to local db
  try {
    debug(`Putting item into local database:\n${JSON.stringify(item)}`);
    const result = Database.put(item);
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
  // updateUserFeed(item);

  // send to peers / dht
  try {
    debug(`Sending ${item.key} to providers...`);
    const result = sendItemToProviders(item);
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

// addPeer

// followPeer

/**
 * @description Updates the current user's feed with a new document.
 * @param {} document The item to be added to the feed.
 * TODO: This is provisional and calls need to be tested / implemented.
 */
function updateUserFeed(document) {
  // if this is always called internally then we shouldn't need to verify document

  // const userSession = getUserSession();

  // get last user feed
  const user = Database.get(getUserSessionKey(), 'user');
  const lastFeed = Database.get(user.lastFeed, 'feed');

  // append new items
  const newFeed = lastFeed;
  newFeed.items.push(document);

  // sign the new feed
  // const signature = signMessage(newFeed);
  // newFeed.signature = signature;

  // update local db
  Database.put(newFeed);

  // update user last feed
  user.lastFeed = newFeed.id;
  Database.put(user);

  // send feed to providers
  sendItemToProviders(newFeed);

  // send updated user to providers
  sendItemToProviders(user);
}

function getFollowedFeeds() {
  // get followed peers from local db
  // get feeds for peers (if available)

  // get feeds from local db
  // get provider for each feed
  // get feed from provider
  // update local db
}

/**
 * @description Generic function to sends a "request" (e.g. GET, PUT, etc) to a
 * provider.
 * @param {Request} request The request to send to the providers. Containing the key,
 * type and/or data of the item.
 */
async function sendRequestToProvider(request, provider) {
  const { ip, port } = provider.lastAddress;

  try {
    const ws = new WebSocket(`ws://${ip}:${port}`);

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

            if (response.responseType === ResponseTypes.Success) {
              ws.close();
              resResolve(response);
            } else if (response.responseType === ResponseTypes.Error) {
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
          }, 10000); // 10 seconds timeout

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

async function sendItemToProviders(item) {
  const providers = await getProviders(item.key, item.type);

  // if no providers were given, return error
  if (!providers || providers.length === 0) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }
  debug('Providers:', providers);

  const request = new Request(RequestTypes.Put, { item });

  // map the array of providers to an array of promises
  const promises = providers.map((provider) => sendRequestToProvider(request, provider));

  // wait for all promises to resolve
  const results = await Promise.all(promises);

  const successfulResponsesCount = results
    .filter((result) => result !== null && result.responseType === ResponseTypes.Success).length;

  debug('Number of successful responses:', successfulResponsesCount);

  if (successfulResponsesCount > 0) {
    return new Response(ResponseTypes.Success, `Item sent to ${successfulResponsesCount} providers.`);
  }

  // if no successful responses, return error
  return new Response(ResponseTypes.Error, 'No provider recieved the item.');
}

/* -------------------------------- Temporary tests -------------------------------- */

// async function getTest(key) {
//   const res = await getItem(key, 'document');
//   console.log('Trying to get item', key, ':\n', res);
// }

// async function test() {
//   getTest('20292bf632e04f4c');
//   getTest('0000000000000000');
// }

// test();

// const doc = {
//   type: 'document',
//   id: '1231231231231999',
//   owner: '20292bf632e04f4c',
//   timestamp: '2021-03-25T18:00:00.000Z',
//   title: 'Second Test Document',
//   content: 'This is a test document.',
//   tags: ['test', 'document'],
// };

// // The problem with testing is that we need to use two separate databases for pubbing.
// async function pubTest(item) {
//   const res = await pubItem(item);
//   console.log('>> Pubbing item Response:', res);
// }

// pubTest(doc);

/* -------------------------------- ----------------- -------------------------------- */

module.exports = {
  initClient,
  loginUser,
  loginNewUser,

  // authenticateUserSession,
  // createNewUserSession,
  getItem,
  putItem,
  pubItem,
  getFollowedFeeds,
  updateUserFeed,
};
