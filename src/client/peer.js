/**
 * @fileoverview Peer functions
 */

const WebSocket = require('ws');
const debug = require('debug')('client');

const { RequestTypes, Request } = require('../models/request');
// const { ResponseTypes, Response } = require('../models/response');

const { getUserSessionKey } = require('../auth/auth');

// ping peer - this uses the cache network so should be in cache
async function pingPeer(ip, port) {
  try {
    const ws = new WebSocket(
      `ws://${ip}:${port}`,
      { handshakeTimeout: 4000, perMessageDeflate: false },
    );

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        const request = new Request(RequestTypes.Ping, { targetPeer: null });
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (message) => {
        const response = JSON.parse(message);
        ws.close();
        resolve(response);
      });

      ws.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    debug('pingPeer error:', error);
    return null;
  }
}

// handshake peer - this uses the cache network so should be in cache
async function handshakePeer(ip, port, localPort) {
  const ws = new WebSocket(
    `ws://${ip}:${port}`,
    { handshakeTimeout: 4000 },
  );

  return new Promise((resolve, reject) => {
    ws.on('open', () => {
      // const request = new Request(RequestTypes.Handshake, { originPeer: getUserSessionKey() });

      const request = new Request(RequestTypes.Handshake, {
        originKey: getUserSessionKey(), address: { ip, port }, originPort: localPort,
      });

      ws.send(JSON.stringify(request));
    });

    ws.on('message', (message) => {
      const response = JSON.parse(message);
      ws.close();
      resolve(response);
    });

    ws.on('error', (error) => {
      // console.log('handshakePeer error:', error.message);
      reject(error);
    });
  });
}

module.exports = {
  pingPeer,
  handshakePeer,
};
