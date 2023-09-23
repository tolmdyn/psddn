const debug = require('debug')('client');

const { isUserSession, getUserSessionProfile, updateUserSessionLastSeen } = require('../auth/auth');

let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

function updateUserProfile(userProfile) {
  Database.updateUserProfile(userProfile);
  // update session
  // save profile to db
}

function saveUserProfile() {
  if (!isUserSession()) {
    debug('No user session profile to save.');
    return;
  }
  updateUserSessionLastSeen();
  const userProfile = getUserSessionProfile();
  Database.updateUserProfile(userProfile);
}

function loadUserProfile(key) {
  return Database.getUserProfile(key);
}

// async function saveUserProfileFile(userProfile) {
//   // return this.put(userProfile, Types.UserProfile);
//   const profileString = JSON.stringify(userProfile);
//   const { key } = userProfile;
//   try {
//     await fs.writeFileSync(`userProfile${key}.json`, profileString);
//   } catch (error) {
//     throw new Error('Error saving user profile');
//   }
//   debug('Saved user profile.');
// }

// function loadUserProfileFile(publicKey) {
//   // return this.get(publicKey, Types.UserProfile);
//   try {
//     const profileString = fs.readFileSync(`userProfile${publicKey}.json`);
//     const profile = JSON.parse(profileString);
//     debug('Loaded user profile.');
//     return profile;
//   } catch (error) {
//     throw new Error('Error loading user profile');
//   }
// }

module.exports = {
  saveUserProfile,
  loadUserProfile,
  updateUserProfile,
  setDb,
};
