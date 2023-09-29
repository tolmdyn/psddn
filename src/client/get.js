const debug = require('debug')('client');

const { isValidKeyFormat } = require('../utils/utils');
const { getProviders } = require('../network/providers');
const { sendRequestToProvider } = require('../network/providers');
const { Types, isValidItemType } = require('../models/types');
const { Request, RequestTypes } = require('../models/request');
const { Response, ResponseTypes } = require('../models/response');
const { queryDHT } = require('../network/dht');

let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

/**
 * @description Validates the parameters for a get request.
 * @param {string} key The key of the item to get.
 * @param {string} type The type of the item to get.
 * @returns A response object if there is an error, otherwise null.
 */
function validateGetParameters(key, type) {
  if (!key || !type) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing parameters.');
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!isValidKeyFormat(key)) {
    return new Response(ResponseTypes.Error, 'Invalid key format.');
  }

  return null;
}

/**
 * @description Gets an item. Checks the local database, remote providers and then DHT.
 * @param {string} key The key of the item to get.
 * @param {string} type The type of the item to get.
 * @returns A response object. Success with the item or Error and reason.
 */
async function getItem(key, type) {
  const parameterError = validateGetParameters(key, type);
  if (parameterError) {
    return parameterError;
  }

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
    if (result) {
      if (result.responseType === ResponseTypes.Success) {
        return result;
      }
    }
  } catch (err) {
    debug('Error getting item from providers:', err);
  }

  // Get item from DHT
  try {
    const dhtResult = await queryDHT(key, type);
    debug('Trying DHT');
    if (dhtResult) {
      debug('DHT result:', dhtResult.responseType);
      if (dhtResult.responseType === ResponseTypes.Success) {
        return dhtResult;
      }
    }
  } catch (err) {
    debug('Error retrieving item from DHT:', err);
  }

  return new Response(ResponseTypes.Error, 'Item not found in database, cache or DHT.');
}

// get the item from local db (if available) and from remote providers (if available)
// if we have both, return the 'newest' one (by timestamp)
// THIS ONLY WORKS WITH USERS BECAUSE OF TIMESTAMP/LASTSEEN
/**
 * @description Gets the latest user item. Because the user object might not be the
 * most recent, checks all sources and then returns the newest. This usually means
 * the DHT result, therefore the function can take longer than desired. The most recent
 * result is stored locally.
 * @param {*} key The key of the user to get.
 * @returns A response object. Success with the user or Error and reason.
 */
async function getLatestUser(key) {
  const results = [];

  try {
    const localResult = await getItemFromLocal(key, Types.User);
    results.push(localResult);
  } catch (error) {
    debug('Error getting item from local database:', error);
  }

  try {
    const providerResult = await getItemFromProviders(key, Types.User);
    results.push(providerResult);
  } catch (err) {
    debug('Error getting item from providers:', err);
    return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }

  try {
    const dhtResult = await queryDHT(key, Types.User);
    if (dhtResult) {
      results.push(dhtResult);
    }
  } catch (err) {
    debug('Error retrieving item from DHT:', err);
  }

  const newestResult = results.reduce((newest, result) => {
    if (result && result.responseType === ResponseTypes.Success) {
      if (!newest
        || new Date(result.responseData.lastSeen) > new Date(newest.responseData.lastSeen)) {
        return result;
      }
    }
    return newest;
  }, null);

  if (newestResult) {
    try {
      Database.updateUser(newestResult.responseData);
    } catch (error) {
      debug('Error updating item in local database:', error);
    }
    return newestResult;
  }

  // Default action: if no item recieved, return error
  return new Response(ResponseTypes.Error, 'Item not found.');
}

/**
 * @description Gets an item from the local database.
 * @param {string} key The key of the item to get.
 * @param {string} type The type of the item to get.
 * @returns A response object. Success with the item or Error and reason.
 */
async function getItemFromLocal(key, type) {
  try {
    debug(`Getting item from local database\nKey: ${key}\nType: ${type}`);
    const item = Database.get(key, type);

    if (item) {
      return new Response(ResponseTypes.Success, item);
    }
    debug('Item not found in local database.');
  } catch (error) {
    return new Response(ResponseTypes.Error, error.message);
  }
  return null;
}

/**
 * @description Gets an item from the remote providers. (cache only)
 * @param {string} key The key of the item to get.
 * @param {string} type The type of the item to get.
 * @returns A response object. Success with the item or Error and reason.
 * TODO: Integrate DHT to find providers for the item, and also select
 * only relevant providers from cache.
 */
async function getItemFromProviders(key, type) {
  const providers = await getProviders(key, type);
  debug('Providers:', providers);

  if (!providers || providers.length === 0) {
    return new Response(ResponseTypes.Error, 'No providers found for item.');
  }

  const request = new Request(RequestTypes.Get, { key, type });
  const promises = providers.map((provider) => sendRequestToProvider(request, provider));

  const results = await Promise.all(promises);
  debug('Results from providers:', results);

  const successfulResult = results.filter((result) => result !== null)
    .find((result) => result.responseType === ResponseTypes.Success);

  if (successfulResult) {
    const item = successfulResult.responseData;
    try {
      debug(`Putting item into local database:\n${JSON.stringify(item)}`);
      const result = Database.put(item);
      if (!result) {
        debug('Error putting item into local database. (No Response)');
        // return new Response(ResponseTypes.Error, 'Error putting item into database.');
      }
    } catch (error) {
      debug('Error putting item into local database:', error);
      // return new Response(ResponseTypes.Error, error.message);
    }

    return successfulResult;
  }

  // if no item recieved, return error
  return new Response(ResponseTypes.Error, 'No provider has the item.');
}

/**
 * @description Get all documents from local database
 * @returns {Array} Array of documents
 */
function getLocalDocuments() {
  try {
    const documents = Database.getAllDocuments();
    return documents;
  } catch (error) {
    debug('Error getting documents from local database:', error);
    return [];
  }
}

/**
 * @description Get all users from local database
 * @returns {Array} Array of users
 */
function getLocalUsers() {
  try {
    const users = Database.getAllUsers();
    return users;
  } catch (error) {
    debug('Error getting users from local database:', error);
    return [];
  }
}

/**
 * @description Gets the latest findable documents from the current user's followed feeds.
 * @returns An array of document objects or an empty array.
 */
async function getUserDocuments(key) {
  const user = await getLatestUser(key);

  if (!user || user.responseType === ResponseTypes.Error) {
    return new Response(ResponseTypes.Error, 'Error getting user.');
  }

  if (!user.responseData.lastFeed) {
    return new Response(ResponseTypes.Error, 'User has no feed.');
  }

  const feed = await getItem(user.responseData.lastFeed, Types.Feed);

  if (!feed || feed.responseType === ResponseTypes.Error) {
    return new Response(ResponseTypes.Error, 'Error getting feed.');
  }

  const docKeys = feed.responseData.items;

  const docPromises = docKeys.map(async (documentKey) => {
    try {
      const response = await getItem(documentKey, Types.Document);
      if (response.responseType === ResponseTypes.Success) {
        const document = response.responseData;
        return document;
      }
    } catch (error) {
      debug('Error getting document:', error);
    }
    return null;
  });

  let documents = null;

  try {
    const postResults = await Promise.all(docPromises);
    documents = postResults.filter((document) => document !== null);
  } catch (error) {
    debug('Error getting documents:', error);
  }

  // TODO: put posts into local db? leaving for now
  // put posts into local db
  // if (documents) {
  //   try {
  //     documents.forEach((document) => {
  //       putItem(document);
  //     });
  //   } catch (error) {
  //     debug('Error putting new documents into local database:', error.message);
  //   }
  // }

  documents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return documents;
}

module.exports = {
  setDb,
  getItem,
  getLatestUser,
  getLocalDocuments,
  getLocalUsers,
  getUserDocuments,
};
