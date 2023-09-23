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

function validateGetParameters(key, type) {
  if (!key || !type) {
    return 'Invalid request, missing parameters';
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!isValidKeyFormat(key)) {
    return new Response(ResponseTypes.Error, 'Invalid key format.');
  }

  return null;
}

async function getItem(key, type) {
  // check the parameters are valid // should this be a seperate function?
  const parameterError = validateGetParameters(key, type);
  if (parameterError) {
    return parameterError;
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
    if (result) {
      if (result.responseType === ResponseTypes.Success) {
        return result;
      }
    }
  } catch (err) {
    debug('Error getting item from providers:', err);
    // return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }

  // Get item from DHT
  try {
    const dhtResult = await queryDHT(key, type);
    debug('DHT result:', dhtResult);
    if (dhtResult) {
      return dhtResult;
    }
  } catch (err) {
    debug('Error retrieving item from DHT:', err);
  }

  return new Response(ResponseTypes.Error, 'Item not found.');
}

// get the item from local db (if available) and from remote providers (if available)
// if we have both, return the 'newest' one (by timestamp)
// THIS ONLY WORKS WITH USERS BECAUSE OF TIMESTAMP/LASTSEEN
async function getLatestUser(key) {
  const results = [];

  // get item from local database
  try {
    const localResult = await getItemFromLocal(key, Types.User);
    results.push(localResult);
  } catch (error) {
    debug('Error getting item from local database:', error);
  }

  // get item from providers
  try {
    const providerResult = await getItemFromProviders(key, Types.User);
    // debug('Result from providers:', providerResult);
    results.push(providerResult);
  } catch (err) {
    debug('Error getting item from providers:', err);
    return new Response(ResponseTypes.Error, 'Error getting item from providers.');
  }

  // get item from DHT
  try {
    const dhtResult = await queryDHT(key, Types.User);
    debug('DHT result:', dhtResult);
    if (dhtResult) {
      results.push(dhtResult);
    }
  } catch (err) {
    debug('Error retrieving item from DHT:', err);
  }

  let newestResult = null;
  // console.log('RESULTS', results);
  // find the newest result
  results.forEach((result) => {
    if (result && result.responseType === ResponseTypes.Success) {
      if (!newestResult
        || new Date(result.responseData.lastSeen) > new Date(newestResult.responseData.lastSeen)) {
        newestResult = result;
      }
    }
  });

  if (newestResult) {
    // update the local database with the provider result
    try {
      // Database.update(providerResult.responseData);
      // console.log("HERE", newestResult.responseData);
      Database.updateUser(newestResult.responseData);
    } catch (error) {
      debug('Error updating item in local database:', error);
    }
    return newestResult;
  }

  return new Response(ResponseTypes.Error, 'Item not found.');
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
    // add item to local db
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
 * Get all documents from local database
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
 * Get all users from local database
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

module.exports = {
  setDb,
  getItem,
  getLatestUser,
  getLocalDocuments,
  getLocalUsers,
};
