/**
 * @fileoverview Client side user profile management.
 * @memberof client
 */

const debug = require('debug')('client');

const { isUserSession, getUserSessionProfile, updateUserSessionLastSeen } = require('../auth/auth');

let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

/**
 * @description Updates the user profile in the database.
 * @param {Object} userProfile The user profile to update.
 */
function updateUserProfile(userProfile) {
  Database.updateUserProfile(userProfile);
  // update session
  // save profile to db
}

/**
 * @description Saves the user session profile to the database, if there is one.
 */
function saveUserProfile() {
  if (!isUserSession()) {
    debug('No user session profile to save.');
    return;
  }
  updateUserSessionLastSeen();
  const userProfile = getUserSessionProfile();
  Database.updateUserProfile(userProfile);
}

/**
 * @description Loads the user profile from the database.
 * @param {string} key The key of the user profile to load.
 * @returns The user profile or null.
 */
function loadUserProfile(key) {
  return Database.getUserProfile(key);
}

module.exports = {
  saveUserProfile,
  loadUserProfile,
  updateUserProfile,
  setDb,
};
