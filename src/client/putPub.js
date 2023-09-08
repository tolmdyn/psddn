const debug = require('debug')('client');

const { Response, ResponseTypes } = require('../models/response');
const { isValidItemType } = require('../models/types');
const { isValidKeyForItem } = require('../utils/utils');
const { validateItem } = require('../models/validation');
const { sendItemToProviders } = require('../network/providers');

let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

function validatePutParameters(item) {
  if (!item) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing item.');
  }

  if (!isValidItemType(item.type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!validateItem(item)) {
    return new Response(ResponseTypes.Error, `Provided item is not a valid ${item.type}.`);
  }

  if (!isValidKeyForItem(item.key, item)) {
    return new Response(ResponseTypes.Error, 'Provided key is not valid for the item.');
  }

  return null;
}

/**
 * @description Adds an item to the local database, Key and type are generated from the item.
 * @param {Object} item The item to be added to the database.
 */
function putItem(item) {
  // validate item
  const parameterError = validatePutParameters(item);
  if (parameterError) {
    return parameterError;
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
  const parameterError = validatePutParameters(item);
  if (parameterError) {
    return parameterError;
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

module.exports = {
  setDb,
  putItem,
  pubItem,
};
