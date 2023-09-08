/* eslint-disable object-curly-newline */
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

/* --------------------------------- Client Imports --------------------------------- */
const { initDb } = require('./clientDb');
const { saveUserProfile } = require('./userProfile');
const { getUserFeed, getFeed } = require('./feed');
const { followUser, unfollowUser } = require('./follow');
const { loginUser, loginNewUser } = require('./login');
const { getItem } = require('./get');
const { putItem, pubItem } = require('./putPub');
const { createNewPost } = require('./newPost');
const { getFollowedFeeds, getFollowedUsers, getFollowedDocuments } = require('./follow');
const { pingPeer, handshakePeer, getCache, getProfile } = require('./debug');

/* --------------------------------- Database --------------------------------- */

// let Database = null;

// function initClient(dbInstance) {
//   //Database = dbInstance;
//   initDb(dbInstance);
// }

/* --- ACTIONS --- */

/* --------------------------------- Get Functions --------------------------------- */

// function validateGetParameters(key, type) {
//   if (!key || !type) {
//     return 'Invalid request, missing parameters';
//   }

//   if (!isValidItemType(type)) {
//     return new Response(ResponseTypes.Error, 'Invalid item type.');
//   }

//   if (!isValidKeyFormat(key)) {
//     return new Response(ResponseTypes.Error, 'Invalid key format.');
//   }

//   return null;
// }

// async function getItem(key, type) {
//   // check the parameters are valid // should this be a seperate function?
//   const parameterError = validateGetParameters(key, type);
//   if (parameterError) {
//     return parameterError;
//   }

//   // check local db // should this be a seperate function?
//   const localResult = await getItemFromLocal(key, type);

//   if (localResult) {
//     if (localResult.responseType === ResponseTypes.Success) {
//       return localResult;
//     }
//     debug('Error getting item from local database:', localResult.data);
//   }

//   // Not found locally so try providers
//   try {
//     const result = await getItemFromProviders(key, type);
//     debug('Result from providers:', result);
//     return result;
//   } catch (err) {
//     debug('Error getting item from providers:', err);
//     return new Response(ResponseTypes.Error, 'Error getting item from providers.');
//   }
// }

// // get the item from local db (if available) and from remote providers (if available)
// // if we have both, return the 'newest' one (by timestamp)
// // THIS ONLY WORKS WITH USERS BECAUSE OF TIMESTAMP/LASTSEEN
// async function getLatestUser(key) {
//   // get item from local database
//   let localResult = null;
//   try {
//     localResult = await getItemFromLocal(key, Types.User);
//   } catch (error) {
//     debug('Error getting item from local database:', error);
//   }

//   // get item from providers
//   let providerResult = null;
//   try {
//     providerResult = await getItemFromProviders(key, Types.User);
//     debug('Result from providers:', providerResult);
//   } catch (err) {
//     debug('Error getting item from providers:', err);
//     return new Response(ResponseTypes.Error, 'Error getting item from providers.');
//   }

//   if (localResult && providerResult) {
//     // compare timestamps
//     const localTimestamp = new Date(localResult.responseData.lastSeen); // !
//     const providerTimestamp = new Date(providerResult.responseData.lastSeen); // !

//     if (localTimestamp > providerTimestamp) {
//       return localResult;
//     }
//     // update the local database with the provider result
//     try {
//       // Database.update(providerResult.responseData);
//       Database.updateUser(providerResult.responseData);
//     } catch (error) {
//       debug('Error updating item in local database:', error);
//     }
//     return providerResult;
//   }

//   if (localResult) {
//     return localResult;
//   }

//   if (providerResult) {
//     return providerResult;
//   }

//   return new Response(ResponseTypes.Error, 'Item not found.');
// }

// async function getItemFromLocal(key, type) {
//   try {
//     debug(`Getting item from local database\nKey: ${key}\nType: ${type}`);
//     const item = Database.get(key, type);

//     if (item) {
//       return new Response(ResponseTypes.Success, item);
//     }
//     debug('Item not found in local database.');
//   } catch (error) {
//     // Possibly massage the error message to make it more readable for users
//     return new Response(ResponseTypes.Error, error.message);
//   }
//   return null;
// }

// async function getItemFromProviders(key, type) {
//   const providers = await getProviders(key, type);
//   debug('Providers:', providers);

//   if (!providers || providers.length === 0) {
//     return new Response(ResponseTypes.Error, 'No providers found for item.');
//   }

//   const request = new Request(RequestTypes.Get, { key, type });

//   // map the array of providers to an array of promises
//   const promises = providers.map((provider) => sendRequestToProvider(request, provider));

//   // wait for all promises to resolve
//   const results = await Promise.all(promises);
//   debug('Results from providers:', results);

//   // find successful responses
//   const successfulResult = results.filter((result) => result !== null)
//     .find((result) => result.responseType === ResponseTypes.Success);

//   if (successfulResult) {
//     // add item to local db
//     const item = successfulResult.responseData;
//     try {
//       debug(`Putting item into local database:\n${JSON.stringify(item)}`);
//       const result = Database.put(item);
//       if (!result) {
//         console.log('Error putting item into local database. (No Response)');
//         // return new Response(ResponseTypes.Error, 'Error putting item into database.');
//       }
//     } catch (error) {
//       console.log('Error putting item into local database:', error);
//       // return new Response(ResponseTypes.Error, error.message);
//     }

//     return successfulResult;
//   }

//   // if no item recieved, return error
//   return new Response(ResponseTypes.Error, 'No provider has the item.');
// }

/* --------------------------------- Put/Pub Functions --------------------------------- */

// function validatePutParameters(item) {
//   if (!item) {
//     return new Response(ResponseTypes.Error, 'Invalid request, missing item.');
//   }

//   if (!isValidItemType(item.type)) {
//     return new Response(ResponseTypes.Error, 'Invalid item type.');
//   }

//   if (!validateItem(item)) {
//     return new Response(ResponseTypes.Error, `Provided item is not a valid ${item.type}.`);
//   }

//   if (!isValidKeyForItem(item.key, item)) {
//     return new Response(ResponseTypes.Error, 'Provided key is not valid for the item.');
//   }

//   return null;
// }

// /**
//  * @description Adds an item to the local database, Key and type are generated from the item.
//  * @param {Object} item The item to be added to the database.
//  */
// function putItem(item) {
//   // validate item
//   const parameterError = validatePutParameters(item);
//   if (parameterError) {
//     return parameterError;
//   }

//   // sign / verify item here before adding to db

//   try {
//     debug(`Putting item into local database:\n${JSON.stringify(item)}`);
//     const result = Database.put(item);
//     if (!result) {
//       return new Response(ResponseTypes.Error, 'Error putting item into database.');
//     }
//     return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
//   } catch (error) {
//     return new Response(ResponseTypes.Error, error.message);
//   }
// }

// /**
//  * @description Publishes item to relevant providers, and adds to local database if not present.
//  * Key and type are generated from the item.
//  * @param {*} item The item to be published.
//  * @returns {Response} A response object containing the result of the request.
//  */
// function pubItem(item) {
//   // validate item
//   const parameterError = validatePutParameters(item);
//   if (parameterError) {
//     return parameterError;
//   }

//   // sign / verify item here before adding to db
//   // if not in local db then add to local db
//   try {
//     debug(`Putting item into local database:\n${JSON.stringify(item)}`);
//     const result = Database.put(item);
//     if (!result) {
//       return new Response(ResponseTypes.Error, 'Unknown error putting item into database.');
//     }
//     // return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
//     debug('Item added to local database.');
//   } catch (error) {
//     if (error.message !== 'Key already exists in database.') {
//       debug('Error putting item into local database:', error);
//       return new Response(ResponseTypes.Error, error.message);
//     }
//     debug('Item not added to local database, already exists. Continuing...');
//   }

//   // send to peers / dht
//   try {
//     debug(`Sending ${item.key} to providers...`);
//     const result = sendItemToProviders(item);
//     if (!result) {
//       return new Response(ResponseTypes.Error, 'Error sending item to providers.');
//     }
//     return result;
//     // return new Response(ResponseTypes.Success, 'Item sent to providers.');
//   } catch (error) {
//     debug('Error sending item to providers:', error);
//     return new Response(ResponseTypes.Error, error.message);
//   }
// }

/* --------------------------------- Followed Functions --------------------------------- */

// /**
//  * @description Gets the latest findable users that the current user is following.
//  * @returns An array of user objects or an empty array.
//  */
// async function getFollowedUsers() {
//   const followedPeers = getUserSessionFollowing();
//   // debug('Followed peers:', followedPeers);
//   const userPromises = followedPeers.map(async (key) => {
//     try {
//       const response = await getLatestUser(key);
//       if (response.responseType === ResponseTypes.Success) {
//         const user = response.responseData;
//         return user;
//       }
//     } catch (error) {
//       debug('Error getting user:', error);
//     }
//     return null;
//   });

//   try {
//     const users = await Promise.all(userPromises);
//     // debug('Users:', users);
//     return users.filter((user) => user !== null);
//   } catch (error) {
//     debug('Error getting users:', error);
//     return [];
//   }
// }

// /**
//  * @description Gets the latest findable feeds from the current user's followed users.
//  * @returns An array of feed objects or an empty array.
//  */
// async function getFollowedFeeds() {
//   const followedPeers = getUserSessionFollowing();
//   // debug('Followed peers:', followedPeers);

//   // get the latest feed keys for each followed user
//   const feedKeysPromises = followedPeers.map(async (userKey) => {
//     try {
//       const response = await getLatestUser(userKey);
//       if (response.responseType === ResponseTypes.Success) {
//         const feedKey = response.responseData.lastFeed;
//         return feedKey;
//       }
//     } catch (error) {
//       debug('Error getting feed key:', error);
//     }
//     return null;
//   });

//   const feedKeys = await Promise.all(feedKeysPromises);

//   // get the feeds from the keys
//   const feedPromises = feedKeys.map(async (key) => {
//     try {
//       const response = await getItem(key, Types.Feed);
//       // debug('Response:', response);
//       if (response.responseType === ResponseTypes.Success) {
//         const feed = response.responseData;
//         return feed;
//       }
//     } catch (error) {
//       debug('Error getting feed:', error);
//     }
//     return null;
//   });

//   let feeds = null;

//   try {
//     const feedResults = await Promise.all(feedPromises);
//     // debug('Feeds:', feeds);
//     feeds = feedResults.filter((feed) => feed !== null);
//     // debug('Filtered feeds:', filteredFeeds);
//   } catch (error) {
//     debug('Error getting feeds:', error);
//     // return [];
//   }

//   if (feeds) {
//     try {
//       feeds.forEach((feed) => {
//         putItem(feed);
//       });
//     } catch (error) {
//       debug('Error putting new feeds into local database:', error.message);
//     }
//   }

//   return feeds;
// }

// /**
//  * @description Gets the latest findable documents from the current user's followed feeds.
//  * @returns An array of document objects or an empty array.
//  */
// async function getFollowedDocuments() {
//   // get followed feeds
//   const feeds = await getFollowedFeeds();

//   // get posts from feeds
//   const docKeys = feeds.flatMap((feed) => feed.items);

//   // assemble promises
//   const docPromises = docKeys.map(async (documentKey) => {
//     try {
//       const response = await getItem(documentKey, Types.Document);
//       if (response.responseType === ResponseTypes.Success) {
//         const document = response.responseData;
//         return document;
//       }
//     } catch (error) {
//       debug('Error getting post:', error);
//     }
//     return null;
//   });

//   // get documents
//   let documents = null;

//   try {
//     const postResults = await Promise.all(docPromises);
//     documents = postResults.filter((document) => document !== null);
//   } catch (error) {
//     debug('Error getting documents:', error);
//   }

//   // put posts into local db
//   if (documents) {
//     try {
//       documents.forEach((document) => {
//         putItem(document);
//       });
//     } catch (error) {
//       debug('Error putting new documents into local database:', error.message);
//     }
//   }

//   return documents;
// }

/* -------------------------------- New Post Functions ----------------------------- */

// function createNewPost(title, content, tags) {
//   // create new document
//   const document = {
//     type: 'document',
//     owner: getUserSessionKey(),
//     timestamp: new Date().toISOString(),
//     title,
//     content,
//     tags: tags || [],
//     // signature: null,
//   };

//   document.key = generateKey(document);

//   // sign the new document
//   const signature = signItem(document);
//   document.signature = signature;

//   // verify sig
//   const verified = verifyItem(document);
//   debug('Verified:', verified);
//   if (!verified) {
//     debug('Error verifying item.');
//     throw new Error('Error unable to verify item.');
//   }

//   let res;

//   // publish item
//   pubItem(document)
//     .then((response) => {
//       console.log('Pub result:', response);
//       res = response;
//     });

//   // update user feed
//   updateUserFeed(document);

//   return res;
// }

/* -------------------------------- Shutdown Functions ------------------------------- */

function shutdownClient() {
  // close connections

  // save profile
  saveUserProfile();
}

/* -------------------------------- Debug Functions --------------------------------- */

// const { getAllPeers, pingPeer, handshakePeer } = require('../network/cache');
// const { getUserSessionProfile } = require('../auth/auth');

// function getCache() {
//   return getAllPeers();
// }

// function getProfile() {
//   return getUserSessionProfile();
// }

/* -------------------------------- Module Exports ---------------------------------- */

module.exports = {
  initClient: initDb,
  loginUser,
  loginNewUser,

  getItem,
  putItem,
  pubItem,

  createNewPost,

  getFeed,
  getUserFeed,
  getFollowedFeeds,
  getFollowedUsers,
  getFollowedDocuments,

  followUser,
  unfollowUser,

  pingPeer,
  handshakePeer,
  getCache,
  getProfile,
  shutdownClient,
};
