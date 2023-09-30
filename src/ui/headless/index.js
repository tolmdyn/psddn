/**
 * @fileoverview This file is the entry point for the 'headless' UI. It allows the
 * creation of a psddn instance without an interface, for example for testing.
 * @module ui/headless
 * @memberof ui
 */

const client = require('../../client');
// const { shutdown } = require('../../utils/shutdown');

/**
 * @description Externally accessible function to start the 'headless' UI.
 * @param {*} user The user key to login with (optional)
 * @param {*} secret The user password to login with (optional)
 * @returns The user session object (or null if login failed)
 */
async function start(user, secret) {
  const userSession = await initUserSession(user, secret);
  // console.log('userSession', userSession);
  return userSession;
}

/**
 * @description Initialise the user session as previous user or anonymous.
 * @param {*} user The user key to login with (optional)
 * @param {*} secret The user password to login with (optional)
 * @returns The user session object (or null if login failed)
 */
async function initUserSession(user, secret) {
  if (user && secret) {
    const userSession = await client.loginUser(user, secret);
    return userSession;
  }

  const userSession = await client.loginNewUser('Anonymous', '');
  return userSession;
}

module.exports = {
  start,
};
