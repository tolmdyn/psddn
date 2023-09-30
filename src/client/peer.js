/**
 * @fileoverview Peer debug functions. These were moved to network/cache.
 * @memberof client
 */

const { pingPeer, handshakePeer } = require('../network/cache');

module.exports = {
  pingPeer,
  handshakePeer,
};
