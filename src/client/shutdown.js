const { saveUserProfile } = require('./userProfile');
const { logoutUser } = require('./login');

function shutdownClient() {
  saveUserProfile();
  logoutUser();
}

module.exports = {
  shutdownClient,
};
