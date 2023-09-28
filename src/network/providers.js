/**
 * @fileoverview Providers module.
 * @description This module is responsible for finding the address of a provider of specific items
 * Either on the local cached peers or on the DHT network.
 */

const WebSocket = require('ws');
const debug = require('debug')('routing');

const { Request, RequestTypes } = require('../models/request');
const { Response, ResponseTypes } = require('../models/response');

const cache = require('./cache');
// const { queryDHT, storeDHT } = require('./dht');
// const Address = require('../models/address');

/**
 * @description Gets the providers of a specific item. This function doesn't do
 * much at the minute, but could be expanded as described in cache module comments.
 * Much of the functionality is currently handled in the client module.
 * @param {string} key The key of the item.
 * @param {string} type The type of the item.
 * @returns {Promise<Address[]>} An array of addresses of providers of the item.
 * If no providers were found, returns an empty array.
 */
async function getProviders(key, type) {
  debug(`Getting providers for key: ${key} and type: ${type}`);
  // TODO:
  // - search local db for providers
  // - if found return providers
  // - else search dht for providers
  // - if found return providers
  // - else return null?

  // CACHE PROVIDERS
  const providers = cache.getProviders(key, type);

  // DHT PROVIDERS
  // If the dht had an index of provider addresses for that item it would append them here.

  // return dummy providers
  return providers;
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

/**
 * @description Sends an item to providers. The key and type parameters are extracted from the item.
 * @param {*} item The item to send to providers.
 * @returns {Promise<Response>} A success or error response object.
 */
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

module.exports = {
  getProviders,
  sendItemToProviders,
  sendRequestToProvider,
};
