/**
 * @description Terminal UI main entry point.
 */

const debug = require('debug')('ui:term');

const { createInterface } = require('./interface');
const { initUserSession } = require('./userSession');

/**
 * @description Start the terminal UI.
 * @param {string} user The user key to login with (optional)
 * @param {string} secret The user password to login with (optional)
 *
 * Creates a readline interface and starts the user session.
 */
async function start(user, secret) {
  debug('starting terminal UI');
  const rl = await createInterface();

  const userSession = await initUserSession(rl, user, secret);
  debug('userSession', userSession);

  console.log('Login successful.');
  console.log('Enter a command:');
  rl.prompt();
}

module.exports = {
  start,
};
