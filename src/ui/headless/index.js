const client = require('../../client');
// const { shutdown } = require('../../utils/shutdown');

function start(user, secret) {
  const userSession = initUserSession(user, secret);
  return userSession;
}

function initUserSession(user, secret) {
  // create a headless user session
  // on shutdown this is still saved in the database so a check could be made
  // to prevent pollution of headless clients...
  if (user && secret) {
    const userSession = client.loginUser(user, secret);

    return userSession;
  }

  const userSession = client.loginNewUser('Anonymous', '');
  return userSession;
}

module.exports = {
  start,
};
