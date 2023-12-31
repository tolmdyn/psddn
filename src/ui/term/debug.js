/**
 * @fileoverview Debugging commands for the interactive terminal interface.
 * Commands are executed by typing "debug <command>" in the terminal.
 * Functions are self-descriptive.
 * @memberof module:ui/term
 */

const client = require('../../client');
const { ResponseTypes } = require('../../models/response');

const debugCommands = {
  profile: () => client.getProfile(),
  users: () => client.getAllUserKeys(),
  // feed: () => client.getFeed(),
  documents: () => client.getAllDocumentKeys(),
  cache: () => client.getCache(),
  hand: handleHandshake,
  ping: handlePing,
  help: () => `Available debug commands: ${Object.keys(debugCommands).join(', ')}`,
};

async function handleDebug(args) {
  const [command, ...cargs] = args;

  const handler = debugCommands[command];

  if (handler) {
    return handler(cargs);
  }

  console.log('Invalid debug command. Type "debug help" for a list of commands.');
  return null;
}

async function handleHandshake(args) {
  const [ip, port] = args;

  if (ip && port) {
    try {
      const response = await client.handshakePeer(ip, port);
      if (response) {
        if (response.responseType === ResponseTypes.Success) { // ?
          console.log('Handshake Success.');
        } else {
          console.log('Handshake Failed', response.responseData);
        }
        return response;
      }
    } catch (error) {
      console.log('Handshake Error:', error.message);
    }

    return null;
  }

  console.log('Invalid handshake command. Usage: hand <ip> <remoteport> <localport>');
  return null;
}

async function handlePing(args) {
  const [ip, port] = args;

  if (ip && port) {
    try {
      const response = await client.pingPeer(ip, port);
      if (response) {
        if (response.responseType === ResponseTypes.Success) { // ?
          console.log('Ping Success.');
        } else {
          if (response.responseData === 'Not at this address') {
            console.log('Ping Success.');
          }
          console.log('Ping Failed', response.responseData);
        }
        // A response should be returned rather than printed to console.
        return;
      }
    } catch (error) {
      console.log('pingPeer error:', error);
      return;
    }
  }
  console.log('Invalid ping command. Usage: ping <ip> <port>');
}

module.exports = {
  handleDebug,
};
