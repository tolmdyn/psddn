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

// const { generateKey } = require('../utils/utils');
// const { User } = require('../models/types');

let userSession = null;

function setUserSession(session) {
  userSession = session;
}

function setUserSessionAddress(address) {
  userSession.user.lastAddress = address;
}

function getUserSession() {
  return userSession;
}

function getUserSessionKey() {
  return userSession.publicKey;
}

function getUserSessionUser() {
  return userSession.user;
}

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
    key: publicKey,
    nickname,
    lastAddress: null,
    lastSeen: null,
    lastFeed: null,
  };

  return { user, secretKey };
}

function createNewUserProfile(user, password, secretKey) {
  // Validate the inputs

  const { publicKey } = nacl.sign.keyPair.fromSecretKey(nacl.util.decodeBase64(secretKey));

  if (user.key !== publicKey) {
    throw new Error('User key does not match secret key');
  }

  // Encrypt the secret key with the password (not implemented yet)
  const encryptedSecretKey = encryptSecretKey(secretKey, password);

  // Create the user profile object
  const userProfile = {
    type: 'userProfile',
    key: publicKey,
    secretKey: encryptedSecretKey,
    userObject: user,
    following: [],
  };

  return userProfile;
}

function encryptSecretKey(secretKey, password) {
  // TODO: Implement this using pbkdf
  return secretKey;
  // const passwordHash = generateKey(password);
  // console.log('passwordHash:', passwordHash);
  // const secretKeyBuffer = nacl.util.decodeBase64(secretKey);
  // const passwordHashBuffer = nacl.util.decodeBase64(passwordHash);

  // const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  // console.log('nonce:', nonce);
  // const encryptedSecretKeyBuffer = nacl.secretbox(secretKeyBuffer, nonce, passwordHashBuffer);
  // const encryptedSecretKey = nacl.util.encodeBase64(encryptedSecretKeyBuffer);

  // return encryptedSecretKey;
}

function decryptSecretKey(encryptedSecretKey, password) {
  // TODO: Implement this using pbkdf
}

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
  authenticateUser,
  setUserSession,
  getUserSession,
  getUserSessionKey,
  getUserSessionUser,
  setUserSessionAddress,

  createNewUser,
  createNewUserProfile,

  signMessage,
  verifyMessage,
};
