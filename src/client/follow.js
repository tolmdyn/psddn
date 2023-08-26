const { addUserToFollowing, removeUserFromFollowing, getUserSessionFollowing } = require('../auth/auth');
const { saveUserProfile } = require('./userProfile');

function followUser(user) {
  addUserToFollowing(user);
  saveUserProfile();

  return getUserSessionFollowing();
}

function unfollowUser(user) {
  removeUserFromFollowing(user);
  saveUserProfile();

  return getUserSessionFollowing();
}

module.exports = {
  followUser,
  unfollowUser,
};
