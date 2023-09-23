/**
 * @description Command handlers for the terminal UI. New commands should be added here.
 * */

const chalk = require('chalk');

const client = require('../../client');
const { askQuestion, parseItem } = require('./termUtils');
const { ResponseTypes } = require('../../models/response');

async function handleGet(args) {
  const [key, type] = args;

  if (key && type) {
    const response = await client.getItem(key, type);
    return response;
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
        return `Success: ${res.responseData}`;
      }
      return `Error: ${res.responseData}`;
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

  let result = '';

  if (response) {
  // Format and print the documents, add colours
    response.forEach((document, index) => {
      const formattedTimestamp = new Date(document.timestamp);
      result += ('-----------------------------------\n');
      result += `Document ${index + 1}:\n`;
      result += `  Owner: ${chalk.green(`${document.owner}\n`)}`;
      result += `  Title: ${chalk.green(`${document.title}`)}`;
      result += ` Timestamp: ${chalk.green(`${formattedTimestamp.toLocaleDateString()} ${formattedTimestamp.toLocaleTimeString()}\n`)}`;
      result += `  Content: ${chalk.green(`${document.content}\n`)}`;
      // Add more properties as needed
      result += ('-----------------------------------\n');
    });
  }

  result = result || 'No documents found.';
  return result;
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
};
