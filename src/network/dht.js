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
 *
 */

const debug = require('debug')('dht');
const DHT = require('dht-rpc');

const bootstrap = '127.0.0.1:10001';

let node;

const PUT = 0; // define a command enum
const GET = 1;

function initDHTNode() {
  debug(`Initialising DHT node with bootstrap: ${bootstrap}`);

  const values = new Map(); // Temporary in-memory storage

  node = new DHT({
    ephemeral: true,
    bootstrap: [
      bootstrap,
    ],
  });

  node.on('ready', () => {
    debug('DHT node ready');
  });

  node.on('request', (req) => {
    debug('DHT node request:', req);
    if (req.command === PUT) {
      debug('DHT node PUT request');
      if (req.token) {
        putItem(req.target, req.value);
        return req.reply(null); // { success: true } ?
      }
      const value = getItem(req.target);
      req.reply(value);
    }

    if (req.command === GET) {
      debug('DHT node GET request');
      const value = getItem(req.target);
      if (value) {
        debug('Value found:', value);
        return req.reply(value);
      }
      debug('Value not found');
    }
    return null; // No error message?
  });

  function putItem(key, itemValue) {
    // const key = key.toString('base64');
    // assert key is proper length & format etc
    // assert item is valid etc
    values.set(key, itemValue);
    console.log('-DHT Storing', key, '-->', itemValue);
  }

  function getItem(key) {
    // const key = key.toString('base64');
    return values.get(key);
  }

  return node;
}

async function queryDHT(key) {
  const q = node.query({ target: Buffer.from(key, 'base64'), command: GET }, { commit: true });

  try {
    // eslint-disable-next-line no-restricted-syntax
    for await (const data of q) {
      if (data.value) {
        const item = JSON.parse(data.value);
        if (item.key !== key) {
          console.log('Item found but key does not match:', key, '-->', item.key);
          break;
        }
        console.log('Item found:', key, '-->', item);
        break;
      }
    }
  } catch (e) {
    if (e.message === 'Too few nodes responded') {
      console.log('Too few nodes responded, item not found in DHT.');
    } else {
      throw e;
    }
  }

  console.log('Query finished. Exiting.');
}

async function storeDHT(key, value) {
  const val = Buffer.from(JSON.stringify(value));
  const q = node.query({ target: Buffer.from(key, 'base64'), command: PUT, value: val }, { commit: true });

  await q.finished();
  debug('Inserted item into DHT', key, '-->', value);
}

module.exports = {
  initDHTNode,
  queryDHT,
  storeDHT,
};
