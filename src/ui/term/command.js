/**
 * @fileoverview The main command function for the terminal UI. Dispatches the correct
 * handler for the command. New commands should be added here.
 * For example, to add a new command called "foo", add a new handler function
 * called "handleFoo" to the handlers.js file, and add a new entry to the commandHandlers
 * Map object below.
 *
 * Could be refactored to dynamically set the correct handlers without the Map object.
 * @memberof module:ui/term
 */

const chalk = require('chalk');

const handlers = require('./handlers');
const { shutdown } = require('../../utils/shutdown');
const debug = require('./debug');
const { getUserSessionKey } = require('../../auth/auth');

const commandHandlers = {
  get: handlers.handleGet,
  put: handlers.handlePut,
  publish: handlers.handlePub,
  newPost: handlers.handleNewPost,
  followUser: handlers.handleFollowUser,
  unfollowUser: handlers.handleUnfollowUser,
  getFollowedFeeds: handlers.handleGetFollowedFeeds,
  getFollowedUsers: handlers.handleGetFollowedUsers,
  getFollowedDocuments: handlers.handleGetFollowedDocuments,
  getUserDocuments: handlers.handleGetUserDocuments,
  debug: debug.handleDebug,
  help: () => `Available commands: ${chalk.cyan(Object.keys(commandHandlers).join(', '))}`,
  exit: () => shutdown(`Shutting down ${chalk.green(getUserSessionKey())} session...`),
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
