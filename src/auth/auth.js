/**
 * @fileoverview This file contains the user authentication logic.
 * @module auth
 * TODO: Add a function to fetch the user object from the database?
 * TODO: Add a function to fetch the user object from the network?
 * TODO: WRITE TESTS
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

/**
 * @description: Create a new keypair object, encoded as base64 strings.
 * @returns A new keypair object
 */
function createNewKeypair() {
  const { publicKey, secretKey } = nacl.sign.keyPair();

  const publicKeyString = nacl.util.encodeBase64(publicKey);
  const secretKeyString = nacl.util.encodeBase64(secretKey);

  return { publicKey: publicKeyString, secretKey: secretKeyString };
}

/**
 * @description: Create a new user object with a new keypair.
 * @param {*} _nickname An optional nickname to use for the user
 * @returns An object containting the new user object and the secret key
 */
function createNewUser(_nickname) {
  const { publicKey, secretKey } = createNewKeypair();
  const nickname = _nickname || null;

  const user = {
    type: 'user',
    publicKey,
    nickname,
    lastAddress: null,
    lastSeen: null,
    lastFeed: null,
  };

  return { user, secretKey };
}

// If the user UID is also a public key then this function is not needed,
// as the public key can be used to verify the user.
// /**
//  * Fetch the public key for a user from the database,
//  * or from the network if not found in the database.
//  * @param {*} user The user to fetch the public key for
//  * @returns The public key for the user
//  */
// function getUserPubKey(user) {
//   // fetch the user from the db
//   // return the public key

//   return user.pubKey;
// }

function authenticateUser(publicKey, secretKey) {
  let authenticated = false;

  try {
    const secretKeyBuffer = nacl.util.decodeBase64(secretKey);
    const generatedBuffer = nacl.sign.keyPair.fromSecretKey(secretKeyBuffer);
    const generatedKey = nacl.util.encodeBase64(generatedBuffer.publicKey);

    authenticated = publicKey === generatedKey;
  } catch (err) {
    if (err instanceof TypeError) {
      debug('Invalid key format');
    } else {
      debug('Error authenticating:', err);
    }
  }

  debug('authenticated status:', authenticated);
  return authenticated;
}

function signMessage(message, secretKey) {
  const secretKeyBuffer = nacl.util.decodeBase64(secretKey);
  const messageBuffer = nacl.util.decodeUTF8(message);
  const signatureBuffer = nacl.sign.detached(messageBuffer, secretKeyBuffer);
  const signature = nacl.util.encodeBase64(signatureBuffer);

  return signature;
}

function verifyMessage(message, signature, publicKey) {
  let verified = false;

  try {
    const signatureBuffer = nacl.util.decodeBase64(signature);
    const publicKeyBuffer = nacl.util.decodeBase64(publicKey);
    const messageBuffer = nacl.util.decodeUTF8(message);

    verified = nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKeyBuffer);
  } catch (err) {
    if (err instanceof TypeError) {
      debug(`Invalid format: "${signature}" or "${publicKey}"`);
    } else {
      debug('Error verifying:', err);
    }
  }

  return verified;
}

/* Temporary tests */

// const { secretKey, user } = createNewUser('Steve');

// const steve = user;
// const stevesSecret = secretKey;

// console.log(`steve: "${steve.publicKey}"\nstevesSecret: "${stevesSecret}"`);

// authenticateUser(steve.publicKey, stevesSecret);
// authenticateUser(steve.publicKey, 'not the secret');

// console.log('public key length:', steve.publicKey.length);

// const message = 'Hello world!';
// const signature = signMessage(message, stevesSecret);

// console.log(`signature: "${signature}"`);
// console.log(`signature length: "${signature.length}"`);

// const verified = verifyMessage(message, signature, steve.publicKey);
// console.log(`verified: "${verified}"`);

// const verified2 = verifyMessage(
//   message,
//   '/BdqU0O0Tmj/jcK5qPF+hbvMuQLixdbFiMjYru4lUqA5h4uNHedCIb0ucEmh23F/sVnMHdvba1FOMNHyeKP8BQ==',
//   steve.pubKey,
// );
// console.log(`verified2: "${verified2}"`);

module.exports = {
  createNewUser,
  authenticateUser,
  signMessage,
  verifyMessage,
};
