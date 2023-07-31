#!/usr/bin/env node

/**
 * @fileoverview Simple client for testing the websocket server interface
 */

const readline = require('readline');
const WebSocket = require('ws');
const { program } = require('commander');
const { parse } = require('path');

const { RequestTypes, Request } = require('../../src/models/request');
const { ResponseTypes, Response } = require('../../src/models/response');
const { getHash } = require('../../src/utils/utils');

/**
 * Get the parameters from the process arguments
 */
program
  .option('--address <address>', 'Specify the IP address of the server')
  .option('--port <port>', 'Specify the port of the server', parseInt);

program.parse(process.argv);
const options = program.opts();

const port = options.port || 8080;
const address = options.address || '127.0.0.1';

const ws = new WebSocket(`ws://${address}:${port}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (input) => {
  const command = input.trim();
  const request = parseCommand(command);
  if (!request) {
    console.log('Invalid command', request);
    return;
  }

  ws.send(JSON.stringify(request));

  // const JSONRequest = buildRequest(request);
  // console.log('JSONRequest:', JSONRequest);

  // if (!JSONRequest) {
  //   console.log('Invalid request', JSONRequest);
  // } else {
  //   ws.send(JSONRequest);
  // }
});

ws.on('open', () => {
  console.log('Connected to server');
});

ws.on('message', (message) => {
  const response = JSON.parse(message); // ???
  console.log('Response:', response);
});

/**
 * @description Recieve the string and parse it to extract the command
 * and the command parameters. Return as a Request object.
 * @param {*} command The command string from the user
 * @returns {Request} The request object to be executed
 */
function parseCommand(command) {
  let request = null;

  const [commandType, ...args] = command.split(' ');
  // const commandType = command.split(' ')[0];

  if (commandType === 'get') {
    const [key, type] = args;
    if (key && type) {
      request = new Request(RequestTypes.Get, { key, type });
    }
  } else if (commandType === 'put') {
    // const [key, type, data] = args;
    const key = args[0];
    const type = args[1];
    const data = JSON.parse(args.slice(2).join(' '));

    // const match = input.match(/[^ ]+ (.+)/);
    // const data = JSON.parse(match[1]);

    if (key && type && data) {
      request = new Request(RequestTypes.Put, { key, type, data });
    }
  } else if (commandType === 'ping') {
    request = new Request(RequestTypes.Ping);
  } else if (commandType === 'message') {
    const [message] = args;
    if (message) {
      request = new Request(RequestTypes.Message, { message });
    }
  } else if (commandType === 'exit') {
    exit();
  }
  return request;
}

/**
 * @description Exit the program cleanly
 */
function exit() {
  rl.close();
  ws.close();
  process.exit(0);
}
