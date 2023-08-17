const readline = require('readline');
const debug = require('debug')('ui:term');

const client = require('../../client/client');
const { shutdown } = require('../../utils/shutdown');

let rl = null;

// console.log('web interface loaded');
function start() {
  debug('starting terminal UI');
  createInterface();
}

async function handleGet(args) {
  const [key, type] = args;

  if (key && type) {
    const response = await client.getItem(key, type);
    return response;
  }

  console.log('Invalid get command. Usage: get <key> <type>');
  return null;
}

function parseItem(item) {
  try {
    return JSON.parse(item);
  } catch (err) {
    console.log('Error parsing item.');
    return null;
  }
}

async function handlePut(args) {
  const item = parseItem(args.join(' '));

  if (item) {
    const response = await client.putItem(item);
    return response;
  }

  console.log('Invalid put command. Usage: put <item>');
  return null;
}

async function handleCommand(command) {
  // build request object from command...
  const [commandAction, ...args] = command.split(' ');

  if (commandAction === 'get') {
    return handleGet(args);
  }

  if (commandAction === 'put') {
    return handlePut(args);
  }

  if (commandAction === 'exit') {
    shutdown('Shutting down...');
  }

  console.log('Invalid command');
  return null;
}

function createInterface() {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // print welcome message
  console.log('Welcome to the terminal interface!');

  rl.on('line', async (input) => {
    const command = input.trim();
    const result = await handleCommand(command);
    if (result) {
      console.log(result);
    }
  });
}

module.exports = {
  start,
};
