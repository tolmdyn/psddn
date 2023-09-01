const handlers = require('./handlers');

const client = require('../../client/client');
const { shutdown } = require('../../utils/shutdown');

const commandHandlers = {
  get: handlers.handleGet,
  put: handlers.handlePut,
  publish: handlers.handlePub,
  newPost: handlers.handleNewPost,
  followUser: handlers.handleFollowUser,
  unfollowUser: handlers.handleUnfollowUser,
  getFollowedFeeds: () => client.getFollowedFeeds(),
  ping: handlers.handlePing,
  hand: handlers.handleHandshake,
  debug: handlers.handleDebug,
  help: () => `Available commands: ${Object.keys(commandHandlers).join(', ')}`,
  exit: () => shutdown('Shutting down...'),
};

async function handleCommand(command) {
  // build request object from command...
  const [commandAction, ...args] = command.split(' ');

  const handler = commandHandlers[commandAction];

  // Should this await?
  if (handler) {
    return handler(args);
  }

  console.log('Invalid command');
  return null;
}

module.exports = {
  handleCommand,
};
