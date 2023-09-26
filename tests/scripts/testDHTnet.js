#!/usr/bin/env node

/**
 * This creates a 'dummy' network of DHT nodes for testing purposes.
 * It creates a bootstrap node and 100 dummy nodes.
 *
 * TODO: Add command line parameters to set number of nodes, address, etc.
 * TODO: Refactor so that it uses database functions rather than a Map to
 * more closely mimic the application.
 */

const fs = require('fs');
const { program } = require('commander');
const DHT = require('dht-rpc');

// We should use the DHT implementation rather than raw library
// const dht = require('../../src/network/dht');

// const bootstrap = ['127.0.0.1:10001'];
let swarm;

function initDHTNode() {
  // console.log('Initialising testDHT node with bootstrap');

  const values = new Map(); // Temporary in-memory storage
  const PUT = 0; // define a command enum
  const GET = 1;

  const node = new DHT({
    ephemeral: false,
    bootstrap: [
      '127.0.0.1:10001',
    ],
  });

  node.on('ready', () => {
    // console.log('DHT node ready');
  });

  node.on('request', (req) => {
    // console.log('DHT node request:', req);
    if (req.command === PUT) {
      console.log('DHT node PUT request');
      if (req.token) {
        putItem(req.target, req.value);
        return req.reply(null); // { success: true } ?
      }
      const value = getItem(req.target);
      req.reply(value);
    }

    if (req.command === GET) {
      console.log('DHT node GET request');
      // console.log('req.target:', req.target);
      const value = getItem(req.target);
      if (value) {
        console.log(`Value found: ${req.target.toString('base64')}`);
        return req.reply(value);
      }
      console.log('Value not found');
    }
    return null; // No error message?
  });

  function putItem(itemKey, itemValue) {
    const key = itemKey.toString('base64');
    values.set(key, itemValue);
    console.log(`Storing ${key} --> ${itemValue.toString()}`);
  }

  function getItem(itemKey) {
    const key = itemKey.toString('base64');
    return values.get(key);
  }

  return node;
}

async function createBootstrapNode() {
  const bootstrap = DHT.bootstrapper(10001, '127.0.0.1');
  await bootstrap.ready();
  console.log(`Bootstrap node online: ${bootstrap.address()}`);
}

async function init(number) {
  await createBootstrapNode();
  swarm = Array.from({ length: number }, () => initDHTNode());
}

program
  .option('-b, --bootstrap', 'Create a bootstrap node only')
  .option('-s, --silent', 'Silent mode, no console output')
  .option('-l, --log <file>', 'Logging mode, redirect output to file')
  .option('-n, --nodes <nodes>', 'Specify the number of nodes to create', parseInt)
  .option('-p, --port <port>', 'Specify the port of the server', parseInt)
  .parse();

const options = program.opts();
// console.log('options:', options);

function redirectLog(file) {
  const logFile = fs.createWriteStream(file, { flags: 'w' });
  console.log(`(Redirecting DHT network output to ${file})`);
  console.log = (...d) => logFile.write(`${d}\n`);
  console.error = (...d) => logFile.write(`${d}\n`);
}

if (options.log) {
  redirectLog(options.log);
}

if (options.silent) {
  // console.log('Silent mode');
  console.log = () => {};
  console.error = () => {};
}

if (options.bootstrap) {
  createBootstrapNode();
} else {
  init(program.nodes || 100);
}
