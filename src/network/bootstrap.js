/**
 * @fileoverview Bootstrap module for the network
 * At the moment only contains a function to load bootstrap addresses from a file.
 * Ideally would be used to bootstrap DHT and cache.
 */

const fs = require('fs');

function loadBootstrapAddresses(filepath) {
  const bootstrapPeers = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  return bootstrapPeers;
}

// async function getBootstrapPeers(filepath) {
//   try {
//     const bootstrapPeers = loadBootstrapAddresses(filepath);
//     debug('Bootstrap peers:', bootstrapPeers);

//     if (bootstrapPeers) {
//       const bootstrapPromises = bootstrapPeers.map((address) => requestPeerInfo(address));

//       const results = await Promise.all(bootstrapPromises);

//       // for each resolved promise, if peer info, then add it to the cache
//       debug('Bootstrap results:', JSON.stringify(results));
//       results.forEach((result) => {
//         if (result != null && result.responseType === ResponseTypes.Success) {
//           // Validate then add the peer to the cache
//           const peer = result.responseData;
//           peer.lastSeen = Date.now();
//           // debug(`Adding bootstrap peer: ${JSON.stringify(peer)}`);
//           addPeer(peer);
//         }
//       });
//     }
//   } catch (error) {
//     debug(`Error loading bootstrap peers: ${error}`);
//   }
// }

module.exports = { loadBootstrapAddresses };
