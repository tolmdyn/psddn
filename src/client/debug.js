/**
 * @description Debugging functions for the client.
 */

const { getAllPeers, pingPeer, handshakePeer } = require('../network/cache');
const { getUserSessionProfile } = require('../auth/auth');

function getCache() {
  return getAllPeers();
}

function getProfile() {
  return getUserSessionProfile();
}

module.exports = {
  getCache,
  getProfile,
  pingPeer,
  handshakePeer,
};
