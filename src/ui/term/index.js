const readline = require('readline');
const debug = require('debug')('ui:term');

const client = require('../../client/client');

let rl = null;

// console.log('web interface loaded');
function start() {
  debug('starting terminal UI');
  createInterface();
}

function createInterface() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (input) => {
    const command = input.trim();
    const request = parseCommand(command);
    if (!request) {
      console.log('Invalid command', request);
      return;
    }
    console.log('\n\n', JSON.stringify(request));
  });
}

function parseCommand(command) {
  const [commandType, ...args] = command.split(' ');
  if (commandType === 'get') {
    debug('get command');
    return 'GET';
    // const [key, type] = args;
    // if (key && type) {
  }
  return null;
}

module.exports = {
  start,
};
