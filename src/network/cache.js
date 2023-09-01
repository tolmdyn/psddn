/**
 * @description: Cached peers module.
 */

// Maintain a map of cached peers which can be used to request and receive items.
// The map is indexed by the public key of the peer.
// The map contains the following information:
// - public key
// - ip address
// - port
// - last seen timestamp
// - last address
//
// The cache should be periodically refreshed and pruned for inactive peers.
//
// At program exit should all active cached peers be pushed to the database?
//
// What we are looking for is basically an index of ACTIVE peer addresses/ports which can
// be sent to the client when requested. At this point we dont need to worry about finding
// the correct provider for an item as we would for DHT. Later on interest groups / following
// could be implemented for the saved peers.
//
// The differences are yet to be determined between cached peers and the user database table.
// Peers are added to the cache:
// - From the database on startup
// - When a peer is manually added by client, and an address is provided
// - From the server module when an inbound connection is made
// - When a request is made for more peers
//
// Functions:
// -On startup -> Load any followed peers from the database
// -On startup -> Load any cached peers from disk
// -Refresh and prune all cached peers
// -Get all providers for a specific key and type (simply gets all 'active' cached peers)
// -Get a specific cached peer by public key (is this useful?)
// -Add a new cached peer
// -Remove a cached peer
// -Update a cached peer
// -Save all cached peers to disk/database
// -Load all cached peers from disk/database
//
// -External functions:
// -Get a list of all cached peers
// -Get a list of all followed peers
// -Get provider(s) for a specific key and type (will return all providers in this router)
//
// ------------------------------------------------------------------------------------
//
// If we want to make the cache more sophisticated and track users and items then we could add the
// following functions:
//
// Announce Functions:
// -Announce a new peer to the network?
//  (e.g a new peer logs on and announces to bootstrap peers)
// -Announce a new item to the network?
//  (e.g. a user creates a new item)
// -Announce an item provider to the network?
//  (called simultaneously with the above to provide the item and when a peer successully
//  retrieves an item from another peer)

const debug = require('debug')('cache');
const WebSocket = require('ws');

// const { Database } = require('../database/dbInstance');
// const { generateRandomUser } = require('../utils/utils');
const { Request, RequestTypes } = require('../models/request');
const { ResponseTypes } = require('../models/response');
const { loadBootstrapAddresses } = require('./bootstrap');

// Could this be passed in at init?? (YES_)
const { getUserSessionKey, getUserSessionAddress } = require('../auth/auth');

const refreshSeconds = 60;

// The cache itself is 'private' to this module
const cache = new Map();

let Database;
let localServerPort;

// --------------------- Startup functions ----------------------------

function initCache(dbInstance) {
  Database = dbInstance;
}
// consider splitting bootstrapping function out to utils
async function startCache(bootstrapFilepath, port) {
  localServerPort = port;
  // Load bootstrap peers from file
  if (bootstrapFilepath) {
    debug(`Loading bootstrap peers from: ${bootstrapFilepath}`);

    try {
      const bootstrapPeers = loadBootstrapAddresses(bootstrapFilepath);
      debug('Bootstrap peers:', bootstrapPeers);

      if (bootstrapPeers) {
        const bootstrapPromises = bootstrapPeers.map((address) => requestPeerInfo(address));

        const results = await Promise.all(bootstrapPromises);

        // for each resolved promise, if peer info, then add it to the cache
        debug('Bootstrap results:', JSON.stringify(results));
        results.forEach((result) => {
          if (isSuccessResponse(result)) {
            // Validate then add the peer to the cache
            const peer = result.responseData;
            // peer.lastSeen = Date.now();
            peer.lastSeen = new Date().toISOString();
            // debug(`Adding bootstrap peer: ${JSON.stringify(peer)}`);
            // should we use add remote peer instead ??
            addPeer(peer);
          }
        });
      }
    } catch (error) {
      debug(`Error loading bootstrap peers: ${error}`);
    }
  }

  // Load all saved peers from the database
  loadCache();

  // Start the Timer
  startRefreshScheduler();
}

function shutdownCache() {
  debug('Shutting down cache');
  stopRefreshScheduler();
  saveCache();
}

function isSuccessResponse(response) {
  return (response !== null
    && response.responseType === ResponseTypes.Success);
}

// --------------------- Cache functions ------------------------------
/**
 * @description: Request peer user info from a bootstrap peer address.
 * This is performed by sending a handshake request to the peer, using
 * our own user address as the origin.
 * @param {Object} address Object containing peer ip and port.
 * @returns {Object} Peer (user) object.
 */
async function requestPeerInfo(address) {
  debug(`Requesting peer info from: ${address.ip}:${address.port}`);
  const originKey = getUserSessionKey();
  // debug(`User key: ${userKey}`);
  // Send a request to the peer for its user info
  try {
    const ws = new WebSocket(
      `ws://${address.ip}:${address.port}`,
      { handshakeTimeout: 4000 },
    );

    const peerInfo = await new Promise((resolve) => {
      ws.on('open', () => {
        // Add our user info to the request
        const request = new Request(RequestTypes.Handshake, {
          originKey, address, originPort: localServerPort,
        });
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (message) => {
        const response = JSON.parse(message);
        debug(`Response: ${JSON.stringify(response)}`);
        resolve(response);
        // if (response.responseType === ResponseTypes.Success) {
        //   resolve(response);
        // } else {
        //   resolve(null);
        // }
        ws.close(); // is this ever executed?
      });

      ws.on('error', (error) => {
        debug(`Error getting info for peer: ${JSON.stringify(address)} - ${error}`);
        resolve(null);
      });
    });

    return peerInfo;
  } catch (error) {
    debug(`Error refreshing peer: ${JSON.stringify(address)} - ${error}`);
    return null;
  }
}

/*
// in server:
const remoteAddress = request.socket.remoteAddress.replace(/^.*:/, ''); // ipv6 hybrid
    const { remotePort } = request.socket;
    // Add the origin peer to the cache
    addRemotePeer({ ip: remoteAddress, port: remotePort });
*/
async function addRemotePeer(key, address) {
  debug(`Adding remote peer: ${key}, ${JSON.stringify(address)}`);
  // if key is our own key then return
  if (key === getUserSessionKey()) {
    debug('Peer Key is self');
    return;
  }

  // if address is our own address then return
  if (isAddressSelf(address)) {
    debug('Peer Address is self');
    return;
  }

  // if cache contains key
  if (cache.has(key)) {
    debug(`Peer already in cache: ${key}`);
    updatePeerLastAddress(key, address);
    return;
  }

  const response = await requestPeerInfo(address);
  if (response) {
    const peer = response.responseData;
    debug(`Received remote peer info: ${JSON.stringify(peer)}`);
    if (peer.key === getUserSessionKey()) {
      debug('Actual remote peer key is self');
      return;
    }
    // peer.lastSeen = Date.now();
    peer.lastSeen = new Date().toISOString();
    addPeer(peer);
  }
}

// announce peer functions
// if a new peer has connected to us then we announce it to the network
// this is done by sending a handshake request to each other peer in our cache
// using the address of the new peer as the 'origin' address

/**
 * @description: Get providers for a specific item (key and type). At the moment just return
 * all active peers in the cache. Later on this could be filtered by interest groups or
 * followed peers. Or the peers could be queried for the item asynchronously.
 * @param {*} key The key of the item
 * @param {*} type The type of the item
 * @returns {Array} An array of peers
 */
function getProviders(key, type) {
  debug(`Getting providers for key: ${key} and type: ${type}`);

  // Get all active peers from the cache
  const peers = getAllPeers();
  const providers = [];

  peers.forEach((peer) => {
    // For each peer
    // Check if it has / might have the item
    // If it does then add it to the providers list
    providers.push(peer);
  });

  return providers;
}

function addPeer(peer) {
  debug(`Adding peer: ${peer.key}`);
  cache.set(peer.key, peer);
}

function removePeer(key) {
  debug(`Removing peer: ${key}`);
  cache.delete(key);
}

function updatePeer(peer) {
  debug(`Updating peer: ${peer.key}`);
  // Update some of the parameters?
  // LastSeen ?
  cache.set(peer.key, peer);
}

function getPeer(key) {
  debug(`Getting peer: ${key}`);
  return cache.get(key);
}

function getAllPeers() {
  debug(`Getting all peers ${JSON.stringify(cache)}`);
  return cache;
}

// The cache cannot contain a peer with our own address (ip + port) so we need to check for this
function isAddressSelf(address) {
  const addressSelf = getUserSessionAddress();
  return addressSelf === address;
}

// TODO need to test this
// function getFollowedPeers(followedPeerIDs) {
//   // debug(`Getting followed peers for user: ${user}`);

//   // Get followed peer ids from user object
//   // const followedPeerIDs = user.following;

//   // Get each followed peer from the cache (if available)
//   const peers = [];
//   followedPeerIDs.forEach((peer) => {
//     const cachedPeer = getPeer(peer);

//     // If not found in cache then it is null
//     if (cachedPeer) {
//       peers.push(getPeer(peer));
//     }
//   });

//   return peers;
// }

// TODO need to test this
// function getPeerAddress(key) {
//   debug(`Getting address for peer: ${key}`);
//   const peer = getPeer(key);
//   if (peer) {
//     return { ip: peer.ip, port: peer.port };
//   }

//   debug(`Peer not found: ${key}`);
//   return null;
// }

function updatePeerLastSeen(key) {
  debug(`Updating last seen for peer: ${key}`);
  const peer = getPeer(key);
  if (peer) {
    // peer.lastSeen = Date.now();
    peer.lastSeen = new Date().toISOString();
    updatePeer(peer);
  } else {
    debug(`Peer not found: ${key}`);
  }
}

function updatePeerLastAddress(key, address) {
  debug(`Updating last address for peer: ${key}`);
  const peer = getPeer(key);
  if (peer) {
    peer.lastAddress = address;
    updatePeer(peer);
  } else {
    debug(`Peer not found: ${key}`);
  }
}

/**
 * @description: Refresh the cache by checking if each peer is still active.
 * If the peer is not active then remove it from the cache.
 */
async function refreshCache() {
  debug('Refreshing cache');

  const refreshPromises = [];

  cache.forEach((peer) => {
    refreshPromises.push(refreshPeer(peer));
  });

  // Wait for all refresh promises to resolve
  await Promise.all(refreshPromises);
  debug(`Cache ${cache.size}`);
}

/**
 * @description Refresh a single peer in the cache. This is done by opening a websocket
 * and sending a ping. If the peer responds then it is still active. Inactive peers are
 * removed from the cache.
 * @param {*} peer The peer to refresh ()
 */
async function refreshPeer(peer) {
  // Check if the peer is still active
  debug(`Refreshing peer: ${peer.key}`);
  const peerOnline = await checkPeerOnline(peer);

  if (peerOnline) {
    debug(`Peer is active: ${peer.key}`);
    // Peer is active so update the last seen timestamp
    updatePeerLastSeen(peer.key);
  } else {
    debug(`Peer is inactive: ${peer.key}`);
    // Peer is inactive so remove it from the cache
    removePeer(peer.key);
  }
}

// A more realistic approach would be a '3 strikes and you're out' policy before removing peer
async function checkPeerOnline(peer) {
  debug(`Checking if peer is online: ${peer.key} - ${peer.lastAddress.ip}:${peer.lastAddress.port}`);
  // Check if the peer is still active by opening a websocket and sending a 'ping' request
  try {
    const ws = new WebSocket(`ws://${peer.lastAddress.ip}:${peer.lastAddress.port}`, { handshakeTimeout: 4000 });

    const peerOnline = await new Promise((resolve) => {
      ws.on('open', () => {
        const request = new Request(RequestTypes.Ping, { targetPeer: peer.key });
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (message) => {
        const response = JSON.parse(message);
        if (isSuccessResponse(response)) {
          resolve(true);
        } else {
          resolve(false);
        }
        ws.close();
      });

      ws.on('error', (error) => {
        debug(`Error peer: ${peer.key} - ${error}`);
        resolve(false);
      });

      ws.on('close', () => {
        debug(`Socket closed for peer: ${peer.key}`);
        resolve(false);
      });
    });

    return peerOnline;
  } catch (error) {
    debug(`Error refreshing peer: ${peer.key} - ${error}`);
    return false;
  }
}

function loadCache() {
  debug('Loading cache');
  // Load all users from the database, then add each seen peer to the cache
  const peers = Database.getAllUsers();
  debug(`Found ${peers.length} peers in database.`);

  peers.forEach((peer) => {
    if ((peer.key !== getUserSessionKey())
      && (peer.lastSeen && peer.lastAddress)
      && (peer.lastAddress !== getUserSessionAddress())) {
      // add remote so that it sends a handshake request so connection is mutual
      addRemotePeer(peer.key, peer.lastAddress);
    }
  });

  // Erase the saved peers from database if offline?

  refreshCache();
}

function saveCache() {
  // Final refresh of cache before saving
  refreshCache();

  debug(`Saving cache of ${cache.size} peers to database`);
  cache.forEach((peer) => {
    // For each peer
    // If in database, then update the last seen timestamp and address
    // If not in database, then add the peer to the database
    try {
      const dbPeer = Database.getUser(peer.key);

      if (dbPeer) {
        // Peer exists in database so update it
        dbPeer.lastSeen = peer.lastSeen;
        dbPeer.lastAddress = peer.lastAddress;
        Database.updateUser(dbPeer);
      } else {
        // Peer does not exist in database so put it
        Database.put(peer);
      }
    } catch (error) {
      debug(`Error saving peer: ${peer.key} - ${error}`);
    }
  });
}

// --------------------- Heartbeat functions --------------------------

class RefeshScheduler {
  constructor(refreshFunction, intervalSeconds) {
    this.refreshFunction = refreshFunction;
    this.refreshInterval = intervalSeconds * 1000; // in seconds
    this.refreshTimer = null;
  }

  start() {
    debug('Starting refresh scheduler');
    this.refreshTimer = setInterval(this.refreshFunction, this.refreshInterval);
    // this.refreshFunction();
  }

  stop() {
    debug('Stopping refresh scheduler');
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

const refreshScheduler = new RefeshScheduler(refreshCache, refreshSeconds);

function startRefreshScheduler() {
  refreshScheduler.start();
}

function stopRefreshScheduler() {
  refreshScheduler.stop();
}

// Load all followed peers from the database
// Load all cached peers from disk
// Refresh the cache
// Start the Timer

// const refreshScheduler = new RefeshScheduler(refreshCache, 60);
// refreshScheduler.start();

// --------------------- Testing functions ----------------------------

// function buildDummyCache() {
//   // Build a dummy cache for testing
//   // This is done by adding dummy peers to the cache
//   // The peers are not added to the database
//   // The peers are not checked for activity
//   debug('Building dummy cache');

//   for (let i = 0; i < 5; i += 1) {
//     const peer = generateRandomUser();
//     peer.lastAddress.ip = '127.0.0.1';
//     peer.lastAddress.port = 8080 + i;
//     peer.lastSeen = Date.now();
//     addPeer(peer);
//   }
// }

// async function refreshTest() {
//   buildDummyCache();
//   debug('Cache:', cache);

//   await refreshCache();

//   debug('Cache:', cache);
// }

// refreshTest();

// Some of these do not need to be exported
module.exports = {
  // start up functions
  initCache,
  startCache,
  shutdownCache,
  // providers
  getProviders,
  // server -> handshake
  addRemotePeer,
  // addPeer,
  // requestPeerInfo,
  // getFollowedPeers,
  // getPeerAddress,
  // loadCache,
  // saveCache,
  getAllPeers,
};
