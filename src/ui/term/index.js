// const readline = require('readline');
const debug = require('debug')('ui:term');

const { createInterface } = require('./interface');
const { initUserSession } = require('./userSession');

async function start(user, secret) {
  debug('starting terminal UI');
  const rl = await createInterface();

  const userSession = await initUserSession(rl, user, secret);
  debug('userSession', userSession);
}

module.exports = {
  start,
};
