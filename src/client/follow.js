const { getUserSessionKey, getUserSessionProfile, setUserSessionProfile } = require('../auth/auth');
// const { updateUserSessionProfile } = require('../auth/userProfile');
let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

function addUserToFollowers(newUser) {
  // update userSession - updateUserSessionProfile();??

  // get user profile
  const profile = getUserSessionProfile();

  // add user to followers
  profile.user.followers.push(newUser.key);

  setUserSessionProfile(profile); // :/

  // save user profile
  Database.update(profile);

  // send user profile to providers?
}

function removeUserFromFollowers(userId) {

}
module.exports = {
  setDb,
  addUserToFollowers,

};
