const debug = require('debug')('ui:headless');

const client = require('../../client');
// const { shutdown } = require('../../utils/shutdown');

async function start() {
  debug('starting headless...');

  const userSession = await initUserSession();
  debug('userSession', userSession);
}

async function initUserSession() {
  // create a headless user session
  // on shutdown this is still saved in the database so a check could be made
  // to prevent pollution of headless clients...
  const userSession = await client.loginNewUser(null, 'headless');
  return userSession;
}

module.exports = {
  start,
};
