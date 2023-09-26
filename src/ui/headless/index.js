const client = require('../../client');
// const { shutdown } = require('../../utils/shutdown');

async function start(user, secret) {
  const userSession = await initUserSession(user, secret);
  // console.log('userSession', userSession);
  return userSession;
}

async function initUserSession(user, secret) {
  // create a headless user session
  // on shutdown this is still saved in the database so a check could be made
  // to prevent pollution of headless clients...
  if (user && secret) {
    const userSession = await client.loginUser(user, secret);
    // onsole.log('userSession loginUser', userSession);
    return userSession;
  }

  const userSession = await client.loginNewUser('Anonymous', '');
  return userSession;
}

module.exports = {
  start,
};
