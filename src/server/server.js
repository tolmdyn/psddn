/**
 * @fileoverview The server module is solely responsible for handling remote requests from
 * incoming websocket connections. The server does not handle any requests from the local
 * user/interface as that is the job of the client modules.
 * @module server
 */

const WebSocket = require('ws');
const debug = require('debug')('server');

const { isValidItemType } = require('../models/types');
const { isValidKeyFormat, isValidKeyForItem } = require('../utils/utils');
const { RequestTypes } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');
const { getUserSessionKey, getUserSessionUser, setUserSessionAddress } = require('../auth/auth');
const { addRemotePeer } = require('../network/cache');

let Database;
let server;

/**
 * @description Initialises the server with the database instance
 * @param {*} dbInstance The database instance object
 * @function
 */
function initServer(dbInstance) {
  Database = dbInstance;
}

/**
 * @function
 * @description Handles incoming requests from remote peers
 * @param {*} message The incoming message containing Request Object
 * @param {*} address The address of the remote peer
 * @returns {Response} The response to the request
 */
function handleRequest(message, address) {
  const request = JSON.parse(message);

  debug('Request:', request);

  const { requestType, requestData } = request;

  if (requestType === RequestTypes.Get) {
    return handleGet(requestData);
  }

  if (requestType === RequestTypes.Put) {
    return handlePut(requestData);
  }

  if (requestType === RequestTypes.Ping) {
    return handlePing(requestData);
  }

  if (requestType === RequestTypes.Message) {
    return handleMessage(requestData);
  }

  if (requestType === RequestTypes.Handshake) {
    return handleHandshake(requestData, address);
  }

  return 'Invalid request type';
}

/**
 * @function
 * @description Handles a GET item request
 * @param {*} request The request object
 * @returns {Response} The response (success/error) to the request
 */
function handleGet(request) {
  const { key, type } = request;

  if (!key || !type) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing parameters.');
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!isValidKeyFormat(key)) {
    return new Response(ResponseTypes.Error, 'Invalid key format.');
  }

  try {
    debug(`Getting item from database\nKey: ${key}\nType: ${type}`);
    const item = Database.get(key, type);
    if (item) {
      return new Response(ResponseTypes.Success, item);
    }
    debug('Item not found in database.');
    return new Response(ResponseTypes.Error, 'Item not found in database.');
  } catch (error) {
    return new Response(ResponseTypes.Error, error.message);
  }
}

/**
 * @function
 * @description Handles a PUT item request to store an item in the database
 * @param {*} request The request object (item)
 * @returns {Response} The response (success/error) to the request
 */
function handlePut(request) {
  const { item } = request;
  const { key, type } = item;

  if (!key || !type) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing parameters.');
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  if (!isValidKeyForItem(key, item)) {
    return new Response(ResponseTypes.Error, 'Provided key is not valid for the item.');
  }

  try {
    debug(`Putting item into database\n${item}`);
    const result = Database.put(item);

    if (!result) {
      return new Response(ResponseTypes.Error, 'Error putting item into database.');
    }

    return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
  } catch (error) {
    // Possibly massage the error message to make it more readable for users
    return new Response(ResponseTypes.Error, error.message);
  }
}

/**
 * @function
 * @description Handles a ping request. If the target peer is the current user, then
 * a pong response is sent. Otherwise, an error response is sent (which still counts
 * as a valid response to the calling peer).
 * @param {*} request The request object, containing the intended target peer
 * @returns {Response} The response (success/error) to the request
 */
function handlePing(request) {
  if (!request) {
    debug('No data.');
    return new Response(ResponseTypes.Error, 'No data / targetpeer.');
  }

  const { targetPeer } = request;

  // debug(`Handling ping for ${targetPeer}.`);
  // debug('I am user:', getUserSessionKey());
  if (targetPeer === getUserSessionKey() || targetPeer === null) {
    debug('Sending pong.');
    return new Response(ResponseTypes.Success, 'Pong.');
  }
  debug('Not at this address...');
  return new Response(ResponseTypes.Error, 'Not at this address.');
}

/**
 * @function
 * @description Handles a message request. Currently just logs the message to the console.
 * Could be extended to only log messages from peers that the user has added as friends, or
 * only if the intended target peer is the current user.
 * @param {*} request The request object, containing the message
 * @returns {Response} The response (success/error) to the request (doesn't fail)
 */
function handleMessage(request) {
  debug('Handling message.');
  const { message } = request;
  console.log('Message from client:', message);
  return new Response(ResponseTypes.Success, 'Message received.');
}

/**
 * @function
 * @description Handles a handshake request. This is the first request sent by a remote
 * peer when a websocket connection is established. The request contains the origin key
 * and port of the remote peer. The current user's key and address are added to the
 * remote peer's cache. The current user's information is returned within the response in order
 * to update the remote peer's local cache.
 * As we might not know our external IP address, we can use the target address of the request.
 * @param {*} request The request object, containing the origin key and port
 * @param {*} originAddress The address of the remote peer
 * @returns {Response} The response (success/error) to the request
 */
function handleHandshake(request, originAddress) {
  const { originKey, originPort, address } = request;
  debug(`Handling handshake on ${JSON.stringify(address)} from ${originKey}.`);

  // get current user info
  const user = getUserSessionUser();

  if (user.lastAddress === null
    || user.lastAddress.ip !== address.ip
    || user.lastAddress.port !== address.port) {
    setUserSessionAddress(address);
    user.lastAddress = address;
  }

  try {
    addRemotePeer(originKey, { ip: originAddress.replace(/^.*:/, ''), port: originPort });
  } catch (error) {
    debug('Error adding remote peer:', error);
  }

  return new Response(ResponseTypes.Success, user);
}

/**
 * @function
 * @description Starts the server on the specified port
 * @param {*} port The port to start the server on
 * @returns {WebSocket.Server} The server instance
 */
function startServer(port) {
  server = new WebSocket.Server({ port });

  server.on('connection', (socket, request) => {
    debug(`Connection from: ${request.socket.remoteAddress}:${request.socket.remotePort}`);
    socket.on('message', (message) => {
      const response = handleRequest(message, request.socket.remoteAddress);
      socket.send(JSON.stringify(response));
    });
  });

  server.on('listening', () => {
    debug(`Server running at ${server.address().address}:${server.address().port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Error: Port ${port} is already in use.`);
    } else {
      console.error('An error occured starting the server:', error);
    }
    process.exit(1);
  });

  return server;
}

/**
 * @function
 * @description Stops the server
 */
function shutdownServer() {
  if (!server) {
    return;
  }
  server.close();
  // Do other things..?
  debug('Server stopped by process.');
}

module.exports = {
  initServer, startServer, shutdownServer, handleGet, handlePut,
};
