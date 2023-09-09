/**
 * @fileoverview Server entry point
 * @description The server module is solely responsible for handling remote requests from
 * incoming websocket connections. The server does not handle any requests from the local
 * user/interface as that is the job of the client modules.
 */

const WebSocket = require('ws');
const debug = require('debug')('server');
// const path = require('path');

// const Database = require('../database/dbInstance');

// const { documentSchema } = require('../models/validation');
const { isValidItemType } = require('../models/types');
const { isValidKeyFormat, isValidKeyForItem } = require('../utils/utils');
const { RequestTypes } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');
const { getUserSessionKey, getUserSessionUser, setUserSessionAddress } = require('../auth/auth');
const { addRemotePeer } = require('../network/cache');

let Database;

let server;

function initServer(dbInstance) {
  Database = dbInstance;
}

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

function handleGet(request) {
  const { key, type } = request;

  if (!key || !type) {
    return 'Invalid request, missing parameters';
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
    // Possibly massage the error message to make it more readable for users
    return new Response(ResponseTypes.Error, error.message);
  }
}

// This is modified so that it just accepts an item, which has embedded a key and type.
function handlePut(request) {
  // const { key, type, data } = request;
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

function handlePing(request) {
  // debug('Handling ping.', request);
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

function handleMessage(request) {
  debug('Handling message.');
  const { message } = request;
  console.log('Message from client:', message);
  return new Response(ResponseTypes.Success, 'Message received.');
}

function handleHandshake(request, originAddress) {
  const { originKey, originPort, address } = request;
  debug(`Handling handshake on ${JSON.stringify(address)} from ${originKey}.`);

  // get current user info
  const user = getUserSessionUser();
  // debug('User:', user);
  // hack - we don't know our own external address before handshaking
  if (user.lastAddress === null
    || user.lastAddress.ip !== address.ip
    || user.lastAddress.port !== address.port) {
    setUserSessionAddress(address);
    user.lastAddress = address;
  }

  // debug('Adding Remote:', originAddress, ':', originPort);
  try {
    addRemotePeer(originKey, { ip: originAddress.replace(/^.*:/, ''), port: originPort });
  } catch (error) {
    debug('Error adding remote peer:', error);
  }

  return new Response(ResponseTypes.Success, user);
}

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

function shutdownServer() {
  server.close();
  // Do other things..?
  debug('Server stopped by process.');
}

module.exports = { initServer, startServer, shutdownServer };
