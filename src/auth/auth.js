/**
 * @fileoverview This file contains the user authentication logic.
 * @module auth
 */

const debug = require('debug')('auth');
const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

// const { User } = require('../models/types');

// class UserKeyPair {
//   constructor(pubKey, secKey) {
//     this.pubKey = pubKey;
//     this.secKey = secKey;
//   }
// }

function createNewKeypair() {
  const { publicKey, secretKey } = nacl.sign.keyPair();

  // console.log('publicKey:', publicKey, 'secretKey:', secretKey);

  const publicKeyString = nacl.util.encodeBase64(publicKey);
  const secretKeyString = nacl.util.encodeBase64(secretKey);

  // console.log('publicKey:', publicKeyString, 'secretKey:', secretKeyString);

  return { publicKey: publicKeyString, secretKey: secretKeyString };
}

function createNewUser(_nickname) {
  const { publicKey, secretKey } = createNewKeypair();
  const nickname = _nickname || 'Anonymous';

  const user = {
    type: 'user',
    pubKey: publicKey,
    nickname,
    lastAddress: null,
    lastSeen: null,
  };

  return { user, secretKey };
}

function getUserPubKey(user) {
  // fetch the user from the db
  // return the public key

  return user.pubKey;
}

function authenticateUser(publicKey, secretKey) {
  let authenticated = false;

  try {
    const secretKeyBuffer = nacl.util.decodeBase64(secretKey);// Buffer.from(secretKey, 'base64');

    const generatedBuffer = nacl.sign.keyPair.fromSecretKey(secretKeyBuffer);
    const generatedKey = nacl.util.encodeBase64(generatedBuffer.publicKey);

    authenticated = publicKey === generatedKey;
  } catch (err) {
    if (err instanceof TypeError) {
      debug(`Invalid key format: "${secretKey}"`);
    } else {
      debug('Error authenticating:', err);
    }
  }

  debug('authenticated status:', authenticated);
  return authenticated;
}

const { secretKey, user } = createNewUser('Steve');

const steve = user;
const stevesSecret = secretKey;

console.log(`steve: "${steve.pubKey}"\nstevesSecret: "${stevesSecret}"`);

authenticateUser(steve.pubKey, stevesSecret);
authenticateUser(steve.pubKey, 'not the secret');

module.exports = {
  createNewUser,
  createNewKeypair,
  getUserPubKey,
  authenticateUser,
};
