/**
 * @fileoverview Command handlers for the terminal UI. New commands should be added here.
 * @memberof module:ui/term
 */

const chalk = require('chalk');

const client = require('../../client');
const { askQuestion, parseItem } = require('./termUtils');
const { ResponseTypes } = require('../../models/response');
const { formatDocuments } = require('./termUtils');

/**
 * @description Formats a response object into a printable string.
 * (strips out the response type on success)
 * @param {*} response The response object to format
 * @returns {string} The formatted string
 * @memberof module:ui/term
 */
function formatResponse(response) {
  if (response.responseType === ResponseTypes.Success) {
    return response.responseData;
    // return `${chalk.green('Success')}: ${response.responseData}`;
  }
  return `${chalk.red('Error')}: ${response.responseData}`;
}

async function handleGet(args) {
  const [key, type] = args;

  if (key && type) {
    const response = await client.getItem(key, type);
    return formatResponse(response);
  }

  console.log('Invalid get command. Usage: get <key> <type>');
  return null;
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
  const title = await askQuestion('Post title: ');
  const content = await askQuestion('Post content: ');
  if (title && content) {
    const response = await client.createNewPost(title, content);

    // TODO: a function to format the three separate responses
    const result = response.map((res) => {
      if (res.responseType === ResponseTypes.Success) {
        return `${chalk.green('Success')}: ${res.responseData}`;
      }
      return `${chalk.red('Error')}: ${res.responseData}`;
    });

    return result.join('\n');
  }

  console.log('Invalid newPost command. Usage: newPost <title> <content>');
  return null;
}

async function handleFollowUser(args) {
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

async function handleGetFollowedFeeds() {
  const response = await client.getFollowedFeeds();

  return response;
}

async function handleGetFollowedUsers() {
  const response = await client.getFollowedUsers();

  return response;
}

async function handleGetFollowedDocuments() {
  const response = await client.getFollowedDocuments();

  let result = chalk.red('No documents found.');

  if (response) {
    result = formatDocuments(response);
  }

  return result;
}

async function handleGetUserDocuments(args) {
  const key = args[0];

  if (key) {
    const response = await client.getUserDocuments(key);

    if (response.responseType === ResponseTypes.Error) {
      return response.responseData;
    }

    let result = chalk.red('No documents found.');

    if (response) {
      result = formatDocuments(response);
    }

    return result;
  }

  console.log('Invalid getUserDocuments command. Usage: getUserDocuments <user key>');
  return null;
}

module.exports = {
  handleGet,
  handlePut,
  handlePub,
  handleNewPost,
  handleFollowUser,
  handleUnfollowUser,
  handleGetFollowedFeeds,
  handleGetFollowedUsers,
  handleGetFollowedDocuments,
  handleGetUserDocuments,
};
