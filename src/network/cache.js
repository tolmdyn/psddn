/**
 * @description: Module to maintain a map of cached peers which can be used to
 * request and receive items.
 *
 * The map is indexed by the public key of the peer and contains the following information:
 * - public key
 * - address (port, ip)
 * - last seen timestamp
 * - last address
 *
 * The simplest implementation just returns all known active peers and makes no attempt
 * to filter for the correct or most likely provider(s) for an item as we would in a DHT.
 *
 * Peers are added to the cache:
 * - From the database on startup
 * - When a peer is manually added by client, and an address is provided
 * - From the server module when an inbound connection is made
 * - When a request is made for more peers
 *
 * The cache is periodically refreshed and pruned for inactive peers by the refresh scheduler.
 * The refresh scheduler is started on startup and stopped on shutdown.
 *
 * At program exit all (active) cached peers are saved to the database.
 *
 *  -----------------------------------------------------------------------------------
 * TODO:
 *
 * To prevent the cache from growing too large as new users are discovered, a Least Recently Used
 * (LRU) cache could be implemented. This would require a timestamp for each peer and a function
 * to remove the least recently 'seen'' peer when the cache is over a certain size.
 *
 * If we want to make the cache more sophisticated at discovering users and items then we could
 * add the following features:
 *    -Announce a new peer to the network?
 *     (e.g. when a new peer logs on and announces to bootstrap peers)
 *   -Announce a new item to the network?
 *     -(e.g. when a user creates a new item)
 *   -Announce an item provider to the network?
 *     -(called simultaneously with the above to provide the item and when a peer successfully
 *     retrieves an item from another peer)
 *
 * Filtering for which peers might be suitable for a request could be added via interest
 * groups / following based on user followed peers and item tags.
 *
 * Additionally when requests are made for an item which doesn't exist at the current peer, they
 * could be forwarded to other peers which might have the item. This would require management and a
 * 'time-to-live' for each request to prevent infinite messaging loops etc.
 */

const debug = require('debug')('cache');
const WebSocket = require('ws');

const { Request, RequestTypes } = require('../models/request');
const { ResponseTypes } = require('../models/response');
const { loadBootstrapAddresses } = require('./bootstrap');

// Could this be passed in at init?? (YES_)
const { getUserSessionKey, getUserSessionAddress } = require('../auth/auth');

// The refresh interval in seconds
const refreshSeconds = 60;

// The cache itself is 'private' to this module
const cache = new Map();

// The database instance passed in at init
let Database;

// The local server port passed in at init
let localServerPort;

/* --------------------- Startup functions ---------------------------- */

/**
 * @description: Initialise the cache module with the database instance from app.js.
 * @param {*} dbInstance The singleton database instance.
 */
function initCache(dbInstance) {
  Database = dbInstance;
}

/**
 * @description: Start the cache module.
 * @param {*} bootstrapFilepath The filepath of the bootstrap peers file.
 * @param {*} port The port of the local server (for handshaking as it isn't always 8080)
 * TODO: consider splitting bootstrapping requests out
 */
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
            // should we use add remote peer instead, as it ensures a two way handshake??
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

  // Start the Refresh Timer
  startRefreshScheduler();
}

/**
 * @description: "Cleanly" shutdown the cache module before program exit.
 */
function shutdownCache() {
  debug('Shutting down cache');
  stopRefreshScheduler();
  saveCache();
}

// --------------------- Cache functions ------------------------------

/**
 * @description: Helper funtion to check if a response is successful.
 * @param {*} response The response object.
 * @returns {Boolean} True if the response is a success response.
 * TODO: This is not always used when it should be, and it is not as robust as it could be.
 */
function isSuccessResponse(response) {
  return (response !== null
    && response.responseType === ResponseTypes.Success);
}

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
        ws.close();
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

/**
 * @description: Handshake with a peer to check if it is online. This exchanges peer info with a
 * previously unknown peer and allows manual seeding of the cache by the user.
 * Used by server module only, but included here to decouple network implementation.
 * @param {*} ip The ip address of the peer
 * @param {*} port The port of the peer
 * @returns {Object} Response object.
 * TODO: This has been left for compatibility with client but it should be combined with other
 * duplicate functionality within cache to prevent overlapping.
 * For example: pingPeer, addRemotePeer, requestPeerInfo perform similar functions.
 */
async function handshakePeer(ip, port) {
  const localPort = localServerPort;

  const ws = new WebSocket(
    `ws://${ip}:${port}`,
    { handshakeTimeout: 4000 },
  );

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      // const request = new Request(RequestTypes.Handshake, { originPeer: getUserSessionKey() });

      const request = new Request(RequestTypes.Handshake, {
        originKey: getUserSessionKey(), address: { ip, port }, originPort: localPort,
      });

      ws.send(JSON.stringify(request));
    });

    ws.on('message', (message) => {
      const response = JSON.parse(message);
      ws.close();
      resolve(response);
    });

    ws.on('error', (error) => {
      // console.log('handshakePeer error:', error.message);
      reject(error);
    });
  });
}

/**
 * @description: Ping a peer to check if it is online. Used by client module.
 * @param {*} ip
 * @param {*} port
 * @returns {Object} Response object.
 * @returns {null} If the peer is not online.
 * TODO: This has been left for compatibility with client but it should be combined with other
 * duplicate functionality within cache to prevent overlapping.
 */
async function pingPeer(ip, port) {
  try {
    const ws = new WebSocket(
      `ws://${ip}:${port}`,
      { handshakeTimeout: 4000, perMessageDeflate: false },
    );

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        const request = new Request(RequestTypes.Ping, { targetPeer: null });
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (message) => {
        const response = JSON.parse(message);
        ws.close();
        resolve(response);
      });

      ws.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    debug('pingPeer error:', error);
    return null;
  }
}

/**
 * @description: Add a remote peer to the cache. This is called by the server module when a new
 * connection is made. The peer is added to the cache and a handshake request is sent to the peer
 * to request its user info.
 * @param {*} key The key of the peer
 * @param {*} address The address of the peer: { ip, port }
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

// TODO: announce peer functions
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

// TODO add functions to get latest followed peer info and add to cache.
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

// function getPeerAddress(key) {
//   debug(`Getting address for peer: ${key}`);
//   const peer = getPeer(key);
//   if (peer) {
//     return { ip: peer.ip, port: peer.port };
//   }

//   debug(`Peer not found: ${key}`);
//   return null;
// }

/**
 * @description: Update the last seen timestamp for a peer.
 * @param {*} key The key of the peer
 */
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

/**
 * @description: Update the last address for a peer.
 * @param {*} key The key of the peer
 * @param {*} address The address of the peer { ip, port }
 */
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

// --------------------- Cache load/save functions --------------------------

/**
 * @description: Load all cached peers from the database.
 */
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

  refreshCache();
}

/**
 * @description: Save all cached peers to the database.
 * TODO: This could be called periodically and on program exit.
 */
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

/* --------------------- Cache refresh/heartbeat functions -------------------------- */

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

/**
 * @description: Check if a peer is still active by opening a websocket and sending a ping.
 * @param {*} peer The peer to check (key, ip, port)
 * @returns {Boolean} True if the peer is active, false if not.
 * TODO: A  more realistic approach would be a '3 strikes and you're out' policy before removing
 * peers as sometimes connections might time out for random reasons but the peer is still online.
 * TODO: Consider refactoring with the public ping / handshake functions used by client.
 */
async function checkPeerOnline(peer) {
  debug(`Checking if peer is online: ${peer.key} - ${peer.lastAddress.ip}:${peer.lastAddress.port}`);

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

// --------------------- Refresh Scheduler functions --------------------------

/**
 * @description: Class to manage the refresh scheduler.
 * This is a simple timer which periodically calls the refresh function, this
 * checks if each peer is still active and removes inactive peers from the cache.
 * @param {*} refreshFunction The function to call when the timer expires.
 * @param {*} intervalSeconds The interval in seconds.
 */
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

// On module import, create a single private refresh scheduler instance
const refreshScheduler = new RefeshScheduler(refreshCache, refreshSeconds);

/**
 * @description: Accessor function to externally start the refresh scheduler.
 */
function startRefreshScheduler() {
  refreshScheduler.start();
}

/**
 * @description: Accessor function to externally stop the refresh scheduler.
 */
function stopRefreshScheduler() {
  refreshScheduler.stop();
}

/* --------------------- Module Exports -------------------------- */

// TODO: Some of these might not need to be exported, verify which

module.exports = {
  initCache,
  startCache,
  shutdownCache,

  getProviders,

  addRemotePeer,
  getAllPeers,
  handshakePeer,
  pingPeer,
};
