/**
 * @fileoverview Peer functions
 */

const WebSocket = require('ws');
// const debug = require('debug')('peer');

const { RequestTypes, Request } = require('../models/request');
// const { ResponseTypes, Response } = require('../models/response');

const { getUserSessionKey } = require('../auth/auth');

// ping peer
async function pingPeer(ip, port) {
  try {
    const ws = new WebSocket(`ws://${ip}:${port}`);

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
    console.log('pingPeer error:', error);
    return null;
  }
}

async function handshakePeer(ip, port, localPort) {
  try {
    const ws = new WebSocket(`ws://${ip}:${port}`);

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
        reject(error);
      });
    });
  } catch (error) {
    console.log('pingPeer error:', error);
    return null;
  }
}

module.exports = {
  pingPeer,
  handshakePeer,
};
