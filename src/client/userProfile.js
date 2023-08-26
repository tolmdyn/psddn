// const debug = require('debug')('client');
// const { getDb } = require('./clientDb');
const { getUserSessionProfile, updateUserSessionLastSeen } = require('../auth/auth');

let Database = null;

function updateUserProfile(userProfile) {
  Database.updateUserProfile(userProfile);
  // update session
  // save profile to db
}

function saveUserProfile() {
  updateUserSessionLastSeen();
  const userProfile = getUserSessionProfile();
  Database.updateUserProfile(userProfile);
}

function loadUserProfile(key) {
  return Database.getUserProfile(key);
}

function setDb(dbInstance) {
  // Database = getDb();
  Database = dbInstance;
  // debug('setDb', Database, getDb);
}

// setDb();

module.exports = {
  saveUserProfile,
  loadUserProfile,
  updateUserProfile,
  setDb,
};
