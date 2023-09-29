/**
 * @fileoverview Peer debug functions. These were moved to network/cache.
 */

const { pingPeer, handshakePeer } = require('../network/cache');

module.exports = {
  pingPeer,
  handshakePeer,
};
