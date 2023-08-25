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

// const WebSocket = require('ws');
const debug = require('debug')('client');

const {
  authNewUser,
  // authUserWithKey,
  authUserWithPassword,
  getUserSessionKey,
  signItem,
  verifyItem,
  getUserSessionProfile,
} = require('../auth/auth');

const { RequestTypes, Request } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');

const { getProviders, sendItemToProviders, sendRequestToProvider } = require('../network/providers');

const { isValidItemType } = require('../models/types');
const { isValidKeyFormat, generateKey } = require('../utils/utils');
const { validateItem } = require('../models/validation');

// client imports
const { initDb } = require('./clientDb');
const { loadUserProfile, saveUserProfile } = require('./userProfile');
const {
  updateUserFeed, getUserFeed, getFollowedFeeds, getFeed,
} = require('./feed');

let Database = null;

function initClient(dbInstance) {
  Database = dbInstance;
  initDb(dbInstance);
}

function loginUser(key, password) {
  // OR loginUser(key, password, secretKey) {
  // if password, if secretkey
  try {
    const userProfile = loadUserProfile(key);

    // Login with password
    const authResult = authUserWithPassword(key, password, userProfile);
    debug('User:', authResult.key);
    return authResult;
  } catch (error) {
    debug('Error creating new user session.', error.message);
    process.exit(1);
  }
  return null;
}

/**
 * @description Creates a new user session and adds the user to the local database.
 * @param {} nickname Optional nickname to use for the user, not neccessarily unique.
 * @returns A new user object. (maybe with the secret key also ?)
 */
function loginNewUser(nickname, password) {
  console.log('login', Database);
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
// function saveUserProfile(userProfile) {
//   Database.putUserProfile(userProfile);
// }

// function loadUserProfile(key) {
//   return Database.getUserProfile(key);
// }

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
  const localResult = await getItemFromLocal(key, type);

  if (localResult) {
    if (localResult.responseType === ResponseTypes.Success) {
      return localResult;
    }
    debug('Error getting item from local database:', localResult.data);
  }

  // Not found locally so try providers
  try {
    const result = await getItemFromProviders(key, type);
    debug('Result from providers:', result);
    return result;
  } catch (err) {
    debug('Error getting item from providers:', err);
    return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }
}

async function getItemFromLocal(key, type) {
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
  return null;
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

// function pingPeer(address) {
//   // send ping to peer
//   // wait for response
//   // return response
// }
// addPeer

// followPeer

/* -------------------------------- New Post Functions ----------------------------- */

function createNewPost(title, content, tags) {
  // create new document
  const document = {
    type: 'document',
    owner: getUserSessionKey(),
    timestamp: new Date().toISOString(),
    title,
    content,
    tags,
    // signature: null,
  };

  document.key = generateKey(document);

  // sign the new document
  const signature = signItem(document);
  document.signature = signature;

  // verify sig
  const verified = verifyItem(document);
  debug('Verified:', verified);
  if (!verified) {
    debug('Error verifying item.');
    throw new Error('Error unable to verify item.');
  }

  // publish item
  pubItem(document);

  // update user feed
  updateUserFeed(document);
}

/* -------------------------------- Debug Functions --------------------------------- */

function getProfile() {
  return getUserSessionProfile();
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

  createNewPost,
  getProfile,

  getFeed,
  getUserFeed,
  getFollowedFeeds,
};
