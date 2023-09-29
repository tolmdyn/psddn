const { shutdownCache } = require('../network/cache');
const { shutdownServer } = require('../server/server');
const { shutdownClient } = require('../client');
const { shutdownDHT } = require('../network/dht');

/**
 * @description Function to safely shutdown the application, and save any cache changes.
 * @param {*} message Message to display
 */
function shutdown(message) {
  console.log(`${message}`);
  // cache.announceDisconnect();
  shutdownCache();
  shutdownServer();
  shutdownClient();
  shutdownDHT();

  process.exit(0);
}

// process.on('exit', () => shutdown('User exited.'));

process.once('SIGINT', () => shutdown('SIGINT received.'));

// process.on('SIGTERM', () => shutdown('SIGTERM received.'));

// I can't remember why I added this
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err);
  // Do not save the cache, as it may be corrupted anyway
  process.exit(1);
});

module.exports = {
  shutdown,
};
