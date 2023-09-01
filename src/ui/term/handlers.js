const client = require('../../client/client');
const { ResponseTypes } = require('../../models/response');
const { askQuestion, parseItem } = require('./termUtils');

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
  // console.log('handlePing', ip, port);
  if (ip && port) {
    const response = await client.pingPeer(ip, port);
    return response;
  }

  console.log('Invalid ping command. Usage: ping <ip> <port>');
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

async function handleHandshake(args) {
  const [ip, port, localport] = args;
  // console.log('handleHandshake', ip, port);
  if (ip && port && localport) {
    try {
      const response = await client.handshakePeer(ip, port, localport);
      if (response) {
        if (response.responseType === ResponseTypes.Success) { // ?
          console.log('Handshake Success.');
        } else {
          console.log('Handshake Failed', response.responseData);
        }
        return response;
        // console.log('handshakePeer response:', response);
      }
    } catch (error) {
      console.log('Handshake Error:', error.message);
    }

    return null;
  }

  console.log('Invalid handshake command. Usage: hand <ip> <remoteport> <localport>');
  return null;
}

module.exports = {
  handleGet,
  handlePut,
  handlePub,
  handleNewPost,
  handlePing,
  handleFollowUser,
  handleUnfollowUser,
  handleHandshake,
};
