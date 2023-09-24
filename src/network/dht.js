/**
 * @description Provide the DHT functions.
 *
 * Make use of a distributed hash table to distribute items across the network.
 *
 * The DHT needs to be initialised. This involves creating a new Node instance
 * and connecting to the 'global' DHT network of other nodes/peers via a known
 * bootstrap address.
 *
 * Once initialised, the DHT responds to basic requests from providers for getting
 * and putting items (Feed, Document, User).
 *
 * The DHT requires a minimum number of accessible nodes to function properly
 * but we can create a 'dummy' network of X nodes with an external script.
 *
 * TODO / Questions:
 * An implementation choice is whether to use the DHT to store the actual data
 * or just the location of the data (an updateable list of peers/addresses that
 * have the data).
 *
 * Functions:
 *
 * -Initialise DHT
 * -Set up node, connect to bootstrap address
 *
 * -Get item from DHT
 * -Put item in DHT
 */

const debug = require('debug')('dht');
const DHT = require('dht-rpc');

const { Response, ResponseTypes } = require('../models/response');

const bootstrap = '127.0.0.1:10001';

let node;

// Custom DHT commands
const PUT = 0;
const GET = 1;

let database = null;

function setDb(dbInstance) {
  database = dbInstance;
}

async function initDHTNode() {
  debug(`Initialising DHT node with bootstrap: ${bootstrap}`);

  node = new DHT({
    ephemeral: true,
    bootstrap: [
      bootstrap,
    ],
  });

  node.on('ready', () => {
    // debug('DHT node ready');
  });

  node.on('request', (req) => {
    debug('DHT node request:', req);
    if (req.command === PUT) {
      debug('DHT node PUT request');
      if (req.token) {
        putItem(req.value);
        return req.reply(null); // { success: true } ?
      }
      const value = getItem(req.target);
      req.reply(value);
    }

    if (req.command === GET) {
      debug('DHT node GET request');
      const value = getItem(req.target, req.type);
      if (value) {
        debug('Value found:', value);
        return req.reply(value);
      }
      debug('Value not found');
    }

    return null; // No error message?
  });

  function putItem(item) {
    // TODO: assert key is proper length & format etc
    // TODO: assert item is valid etc
    const resp = database.put(item);
    debug('DHT putItem response:', resp);
  }

  function getItem(key, type) {
    // TODO: assert key is proper length & format etc
    const item = database.get(key, type);
    debug('DHT getItem response:', item);
    return item;
  }

  return node;
}

async function queryDHT(key, type) {
  const q = node.query({ target: Buffer.from(key, 'base64'), command: GET, type }, { commit: true });

  try {
    // eslint-disable-next-line no-restricted-syntax
    for await (const data of q) {
      if (data.value) {
        const item = JSON.parse(data.value);
        if (item.key !== key) {
          debug('Item found but key does not match:', key, '-->', item.key);
        } else {
          // debug('Item found:', key, '-->', item);
          debug('Item found:', key);
        }
        return new Response(ResponseTypes.Success, item);
      }
    }
  } catch (e) {
    if (e.message === 'Too few nodes responded') {
      debug('Too few nodes responded, item not found in DHT.');
    } else {
      throw e;
    }
  }

  debug('Query finished, returning null.');
  return new Response(ResponseTypes.Error, 'Item not found in DHT.');
}

async function storeDHT(key, value) {
  const val = Buffer.from(JSON.stringify(value));
  const q = node.query({ target: Buffer.from(key, 'base64'), command: PUT, value: val }, { commit: true });

  await q.finished();
  // console.log('Inserted item into DHT', key, '-->', value);
  debug('Inserted item into DHT', key, '-->', value);
  return value; // success?
}

function shutdownDHT() {
  node.destroy();
}

function initDHT(dbInstance) {
  setDb(dbInstance);
  initDHTNode();
}

module.exports = {
  setDb,
  initDHTNode,
  initDHT,
  queryDHT,
  storeDHT,
  shutdownDHT,
};
