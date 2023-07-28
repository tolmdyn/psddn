/**
 * @fileoverview Server entry point
 */

const WebSocket = require('ws');
const debug = require('debug')('server');
const path = require('path');

const { Database } = require('../database/database');
const { documentSchema } = require('../models/validation');
const { Types, isValidItemType } = require('../models/types');
const { getHash } = require('../utils/utils');
const { RequestTypes, Request } = require('../models/request');
const { ResponseTypes, Response } = require('../models/response');

const dbPath = path.join(__dirname, './../../data/database.db');
const database = new Database(dbPath);

function handleRequest(message) {
  // const requestString = message.toString();
  const request = JSON.parse(message); // concat these two lines

  debug('Request:', request);

  const { requestType, requestData } = request;

  if (requestType === RequestTypes.Get) {
    return handleGet(requestData);
  }

  if (requestType === RequestTypes.Put) {
    return handlePut(requestData);
  }

  if (requestType === RequestTypes.Ping) {
    return handlePing();
  }

  if (requestType === RequestTypes.Message) {
    return handleMessage(requestData);
  }

  return 'Invalid request type';
}

function handleGet(request) {
  const { key, type } = request;

  if (!key || !type) {
    return 'Invalid request, missing parameters';
  }

  if (!isValidItemType(type)) {
    return 'Invalid item type';
  }

  try {
    debug(`Getting item from database\nKey: ${key}\nType: ${type}`);
    const item = database.get(key, type);

    if (item) {
      return new Response(ResponseTypes.Success, item);
    }
    return new Response(ResponseTypes.Error, 'Item not found in database.');
  } catch (error) {
    // Possibly massage the error message to make it more readable for users
    return new Response(ResponseTypes.Error, error.message);
  }
}

function handlePut(request) {
  const { type, data } = request;

  if (!type || !data) {
    return new Response(ResponseTypes.Error, 'Invalid request, missing parameters.');
  }

  if (!isValidItemType(type)) {
    return new Response(ResponseTypes.Error, 'Invalid item type.');
  }

  const key = getHash(data);

  try {
    debug(`Putting item into database\nKey: ${key}\nType: ${type}\nData: ${data}`);
    const result = database.put(key, type, data);

    if (!result) {
      return new Response(ResponseTypes.Error, 'Error putting item into database.');
    }

    return new Response(ResponseTypes.Success, `Item ${result.key} inserted into database.`);
  } catch (error) {
    // Possibly massage the error message to make it more readable for users
    return new Response(ResponseTypes.Error, error.message);
  }
}

function handlePing() {
  debug('Sending pong.');
  return new Response(ResponseTypes.Success, 'Pong.');
}

function handleMessage(request) {
  debug('Handling message.');
  const { message } = request;
  console.log('Message from client:', message);
  return new Response(ResponseTypes.Success, 'Message received.');
}

const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket, request) => {
  debug(`Connection: ${request.socket.remoteAddress}:${request.socket.remotePort}`);
  socket.on('message', (message) => {
    const response = handleRequest(message.toString());
    socket.send(JSON.stringify(response));
  });
});

debug(`Server running at ${server.address().address}:${server.address().port}`);

module.exports = { server };
