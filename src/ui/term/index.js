const readline = require('readline');
const debug = require('debug')('ui:term');

const client = require('../../client/client');
const { shutdown } = require('../../utils/shutdown');

let rl = null;

// console.log('web interface loaded');
async function start() {
  debug('starting terminal UI');

  // let userSession;

  createInterface();

  const userSession = await initUserSession();
  debug('userSession:', userSession);
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function initUserSession() {
  // create new user
  // or sign in as existing user
  console.log('Would you like to CREATE a new user session or LOGIN to an existing one?');
  const choice = await askQuestion('Please enter "create" or "login": ');

  if (choice === 'create') {
    const nickname = await askQuestion('Enter a nickname: ');
    const password = await askQuestion('Enter a password: ');
    // const user = { nickname, password };
    const userSession = await client.loginNewUser(nickname, password);
    return userSession;
  }

  if (choice === 'login') {
    const nickname = await askQuestion('Enter your nickname: ');
    const password = await askQuestion('Enter your password: ');
    const userSession = await client.loginUserPassword(nickname, password); // NOT IMPLEMENTED
    return userSession;
  }

  console.log('Invalid choice.');

  // loop until valid choice?
  return initUserSession();
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

async function handlePub(args) {
  const item = parseItem(args.join(' '));

  if (item) {
    const response = await client.pubItem(item);
    return response;
  }

  console.log('Invalid publish command. Usage: publish <item>');
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

  if (commandAction === 'publish') {
    return handlePub(args);
  }

  if (commandAction === 'help') {
    return 'Available commands: get, put, exit';
  }

  if (commandAction === 'exit') {
    shutdown('Shutting down...');
  }

  console.log('Invalid command');
  return null;
}

async function createInterface() {
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
