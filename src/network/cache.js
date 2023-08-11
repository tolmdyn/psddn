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

const debug = require('debug')('cache');
const WebSocket = require('ws');

const { Database } = require('../database/dbInstance');
const { generateRandomUser } = require('../utils/utils');
const { Request, RequestTypes } = require('../models/request');
const { Response, ResponseTypes } = require('../models/response');

// The cache itself is private to this module
const cache = new Map();

function getProviders(key, type) {
  debug(`Getting providers for key: ${key} and type: ${type}`);
  return getAllPeers();
}

function addPeer(peer) {
  debug(`Adding peer: ${peer.publicKey}`);
  cache.set(peer.publicKey, peer);
}

function removePeer(publicKey) {
  debug(`Removing peer: ${publicKey}`);
  cache.delete(publicKey);
}

function updatePeer(peer) {
  debug(`Updating peer: ${peer.publicKey}`);
  cache.set(peer.publicKey, peer);
}

function getPeer(publicKey) {
  debug(`Getting peer: ${publicKey}`);
  return cache.get(publicKey);
}

function getAllPeers() {
  debug('Getting all peers');
  return cache;
}

function getFollowedPeers(user) {
  debug(`Getting followed peers for user: ${user}`);

  // Get followed peer ids from user object
  const followedPeerIDs = user.following;

  // Get each followed peer from the cache (if available)
  const peers = [];
  followedPeerIDs.forEach((peer) => {
    const cachedPeer = getPeer(peer);

    // If not found in cache then it is null
    if (cachedPeer) {
      peers.push(getPeer(peer));
    }
  });

  return peers;
}

function getPeerAddress(publicKey) {
  debug(`Getting address for peer: ${publicKey}`);
  const peer = getPeer(publicKey);
  if (peer) {
    return { ip: peer.ip, port: peer.port };
  }

  debug(`Peer not found: ${publicKey}`);
  return null;
}

function updatePeerLastSeen(publicKey) {
  debug(`Updating last seen for peer: ${publicKey}`);
  const peer = getPeer(publicKey);
  if (peer) {
    peer.lastSeen = Date.now();
    updatePeer(peer);
  } else {
    debug(`Peer not found: ${publicKey}`);
  }
}

function updatePeerLastAddress(publicKey, address) {
  debug(`Updating last address for peer: ${publicKey}`);
  const peer = getPeer(publicKey);
  if (peer) {
    peer.lastAddress = address;
    updatePeer(peer);
  } else {
    debug(`Peer not found: ${publicKey}`);
  }
}

async function refreshCache() {
  debug('Refreshing cache');
  // Go through each peer in the cache and check if it is still active
  // If not active then remove it from the cache
  // This performs each refresh (check/remove) in parallel
  // But it could also send out the checks, wait for them all to resolve
  // and then remove the inactive peers

  const refreshPromises = [];

  cache.forEach((peer) => {
    refreshPromises.push(refreshPeer(peer));
  });

  await Promise.all(refreshPromises);
}

async function refreshPeer(peer) {
  // Check if the peer is still active
  // If the peer is still active
  // the last seen timestamp is updated
  // If not then remove it from the cache?
  debug(`Refreshing peer: ${peer.publicKey}`);

  const peerOnline = await checkPeerOnline(peer);

  if (peerOnline) {
    debug(`Peer is active: ${peer.publicKey}`);
    // Peer is active so update the last seen timestamp
    updatePeerLastSeen(peer.publicKey);
  } else {
    debug(`Peer is inactive: ${peer.publicKey}`);
    // Peer is inactive so remove it from the cache
    removePeer(peer.publicKey);
  }
}

async function checkPeerOnline(peer) {
  debug(`Checking if peer is online: ${peer.publicKey} - ${peer.lastAddress.ip}:${peer.lastAddress.port}`);
  // Check if the peer is still active
  // This is done by opening a websocket and sending a ping
  // If the peer responds then it is still active
  // Returns boolean
  try {
    const ws = new WebSocket(`ws://${peer.lastAddress.ip}:${peer.lastAddress.port}`);

    const peerOnline = await new Promise((resolve) => {
      ws.on('open', () => {
        // debug(`Ping peer: ${peer.publicKey}`);
        const request = new Request(RequestTypes.Ping, null);
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (message) => {
        // debug(`Pong peer: ${peer.publicKey}`);
        const response = JSON.parse(message);
        if (response.responseType === ResponseTypes.Success) {
          resolve(true);
        } else {
          resolve(false);
        }
        ws.close();
      });

      ws.on('error', (error) => {
        debug(`Error peer: ${peer.publicKey} - ${error}`);
        resolve(false);
      });

      ws.on('close', () => {
        debug(`Socket closed for peer: ${peer.publicKey}`);
        resolve(false);
      });
    });

    return peerOnline;
  } catch (error) {
    debug(`Error refreshing peer: ${peer.publicKey} - ${error}`);
    return false;
  }
}

function loadCache() {
  debug('Loading cache');

  // Load all users from the database
  // Add each peer to the cache if there is a last seen timestamp and address
  const peers = Database.getUsers();

  peers.forEach((peer) => {
    if (peer.lastSeen && peer.address) {
      addPeer(peer);
    }
  });

  refreshCache();
}

function saveCache() {
  refreshCache();

  // Save all peers in the cache to the database
  // This is done by replacing the entire table
  // with the contents of the cache
  cache.forEach((peer) => {
    // For each peer
    // If in database, then update the last seen timestamp and address
    // If not in database, then add the peer to the database
    try {
      // const dbPeer = database.getUser(peer.publicKey);
      const dbPeer = Database.getUser(peer.publicKey);

      if (dbPeer) {
        // Peer exists in database so update it
        dbPeer.lastSeen = peer.lastSeen;
        dbPeer.lastAddress = peer.lastAddress;
        Database.updateUser(dbPeer);
      } else {
        // Peer does not exist in database so add it
        Database.addUser(peer);
      }
    } catch (error) {
      debug(`Error saving peer: ${peer.publicKey} - ${error}`);
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
    this.refreshTimer = setInterval(this.refreshFunction, this.refreshInterval);
    this.refreshFunction();
  }

  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// const refreshScheduler = new RefeshScheduler(refreshCache, 60);
// refreshScheduler.start();

// --------------------- Testing functions ----------------------------

function buildDummyCache() {
  // Build a dummy cache for testing
  // This is done by adding dummy peers to the cache
  // The peers are not added to the database
  // The peers are not checked for activity
  debug('Building dummy cache');

  for (let i = 0; i < 5; i += 1) {
    const peer = generateRandomUser();
    peer.lastAddress.ip = '127.0.0.1';
    peer.lastAddress.port = 8080 + i;
    peer.lastSeen = Date.now();
    addPeer(peer);
  }
}

async function refreshTest() {
  buildDummyCache();
  debug('Cache:', cache);

  await refreshCache();

  debug('Cache:', cache);
}

refreshTest();
// const refreshScheduler = new RefeshScheduler(refreshCache, 10);
// refreshScheduler.start();
