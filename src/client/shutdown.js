/**
 * @fileoverview Shutdown the client and save the user profile.
 * @memberof client
 */

const { saveUserProfile } = require('./userProfile');
const { logoutUser } = require('./login');

/**
 * @description Shutdown the client and save the user profile.
 */
function shutdownClient() {
  saveUserProfile();
  logoutUser();
}

module.exports = {
  shutdownClient,
};
