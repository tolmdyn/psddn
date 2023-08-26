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
  debug('userSession', userSession);
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
    const key = await askQuestion('Enter your key: ');
    const secret = await askQuestion('Enter your password: ');
    const userSession = await client.loginUser(key, secret); // to check
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

async function handleNewPost() {
  // const { title, content } = parseItem(args.join(' '));// FIX THIS!!
  const title = await askQuestion('Post title: ');
  const content = await askQuestion('Post content: ');
  if (title && content) {
    const response = await client.createNewPost(title, content);
    return response;
  }

  console.log('Invalid newPost command. Usage: newPost <title> <content>');
  return null;
}

async function handlePing(args) {
  const [ip, port] = args;
  console.log('handlePing', ip, port);
  if (ip && port) {
    const response = await client.pingPeer(ip, port);
    return response;
  }

  console.log('Invalid ping command. Usage: ping <ip> <port>');
  return null;
}

async function handleHandshake(args) {
  const [ip, port, localport] = args;
  console.log('handleHandshake', ip, port);
  if (ip && port && localport) {
    const response = await client.handshakePeer(ip, port, localport);
    return response;
  }

  console.log('Invalid handshake command. Usage: handshake <ip> <remoteport> <localport>');
  return null;
}

const debugCommands = {
  profile: () => client.getProfile(),
  session: () => client.getSession(),
  user: () => client.getUser(),
  feed: () => client.getFeed(),
  posts: () => client.getPosts(),
};

async function handleDebug(args) {
  const [command, ...cargs] = args;

  const handler = debugCommands[command];

  if (handler) {
    return handler(cargs);
  }

  console.log('Invalid debug command');
  return null;
}

async function handleFollowUser(args) {
  console.log('handleFollowUser', args[0]);
  const key = args[0];

  if (key) {
    const response = await client.followUser(key);
    return response;
  }

  console.log('Invalid followUser command. Usage: followUser <user key>');
  return null;
}

async function handleUnfollowUser(args) {
  const key = args[0];

  if (key) {
    const response = await client.unfollowUser(key);
    return response;
  }

  console.log('Invalid followUser command. Usage: followUser <user key>');
  return null;
}

const commandHandlers = {
  get: handleGet,
  put: handlePut,
  publish: handlePub,
  newPost: handleNewPost,
  followUser: handleFollowUser,
  unfollowUser: handleUnfollowUser,
  ping: handlePing,
  hand: handleHandshake,
  debug: handleDebug,
  help: () => `Available commands: ${Object.keys(commandHandlers).join(', ')}`,
  exit: () => shutdown('Shutting down...'),
};

async function handleCommand(command) {
  // build request object from command...
  const [commandAction, ...args] = command.split(' ');

  const handler = commandHandlers[commandAction];

  if (handler) {
    return handler(args);
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
