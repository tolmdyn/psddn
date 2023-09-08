const handlers = require('./handlers');

const client = require('../../client');
const { shutdown } = require('../../utils/shutdown');
const debug = require('./debug');

const commandHandlers = {
  get: handlers.handleGet,
  put: handlers.handlePut,
  publish: handlers.handlePub,
  newPost: handlers.handleNewPost,
  followUser: handlers.handleFollowUser,
  unfollowUser: handlers.handleUnfollowUser,
  getFollowedFeeds: () => client.getFollowedFeeds(),
  getFollowedUsers: () => client.getFollowedUsers(),
  getFollowedDocuments: () => client.getFollowedDocuments(),
  // ping: handlers.handlePing,
  // hand: handlers.handleHandshake,
  debug: debug.handleDebug,
  help: () => `Available commands: ${Object.keys(commandHandlers).join(', ')}`,
  exit: () => shutdown('Shutting down...'),
};

async function handleCommand(command) {
  const [commandAction, ...args] = command.split(' ');
  const handler = commandHandlers[commandAction];

  if (handler) {
    return handler(args);
  }

  console.log('Invalid command. Type "help" for a list of commands.');
  return null;
}

module.exports = {
  handleCommand,
};
