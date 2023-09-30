/**
 * @fileoverview Login functions for the client.
 * @memberof client
 */

const debug = require('debug')('client');

const { loadUserProfile, saveUserProfile } = require('./userProfile');
const { authUserWithPassword, authNewUser, setUserSession } = require('../auth/auth');
const { pubItem } = require('./putPub');

function loginUser(key, password) {
  try {
    const userProfile = loadUserProfile(key);

    // Login with password
    const authResult = authUserWithPassword(key, password, userProfile);
    debug('User:', authResult.key);
    return authResult;
  } catch (error) {
    debug('Error creating new user session.', error.message);
    throw new Error('Error creating new user session.');
  }
}

/**
 * @description Creates a new user session and adds the user to the local database.
 * @param {} nickname Optional nickname to use for the user, not neccessarily unique.
 * @returns A new user object. (maybe with the secret key also ?)
 */
async function loginNewUser(nickname, password) {
  try {
    const { userProfile, secretKey } = authNewUser(nickname, password);
    const newUser = userProfile.userObject;
    debug('NEW User:', newUser.key, 'Secret Key:', secretKey);
    saveUserProfile(userProfile);
    pubItem(newUser);
    return newUser;
  } catch (error) {
    debug('Error creating new user session.', error.message);
    throw new Error('Error creating new user session.');
  }
}

/**
 * @description Logout the user by setting the user session to null. Only used for testing.
 */
function logoutUser() {
  setUserSession(null);
}

module.exports = {
  loginUser,
  loginNewUser,
  logoutUser,
};
