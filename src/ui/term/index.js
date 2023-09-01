// const readline = require('readline');
const debug = require('debug')('ui:term');

const { createInterface } = require('./interface');
const { initUserSession } = require('./userSession');

async function start() {
  debug('starting terminal UI');
  const rl = await createInterface();

  const userSession = await initUserSession(rl);
  debug('userSession', userSession);
}

module.exports = {
  start,
};
