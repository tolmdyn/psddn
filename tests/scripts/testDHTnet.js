#!/usr/bin/env node

// const dht = require('../../src/network/dht');
const DHT = require('dht-rpc');

// const bootstrap = ['127.0.0.1:10001'];

function initDHTNode() {
  console.log('Initialising testDHT node with bootstrap');

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
    console.log('DHT node ready');
  });

  node.on('request', (req) => {
    console.log('DHT node request:', req);
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
        console.log('Value found:', req.target.toString('base64'));
        return req.reply(value);
      }
      console.log('Value not found');
    }
    return null; // No error message?
  });

  function putItem(itemKey, itemValue) {
    const key = itemKey.toString('base64');
    values.set(key, itemValue);
    console.log('Storing', key, '-->', itemValue.toString());
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
  console.log('Bootstrap node online.', bootstrap.address());
}

async function init() {
  await createBootstrapNode();
  const swarm = Array.from({ length: 100 }, () => initDHTNode());
}

init();

// createBootstrapNode();
// const swarm = Array.from({ length: 100 }, () => initDHTNode());
