/**
 * @fileoverview This file contains the user authentication logic.
 * @module auth
 *
 * TODO: Split off signing and session into separate modules.
 *
 * TODO: Add a function to fetch the user object from the database?
 * TODO: Add a function to fetch the user object from the network?
 * TODO: WRITE TESTS
 *
 *  This module doesn't interact with the database, only user profile/session.
 *
 * Definitions:
 *
 * User: A user is a person who uses the application.
 *  A user has a public & secret key and a nickname.
 *  they are represented by a shareable object (item)
 *  which contains the user's public key, nickname, and
 *  last seen address and time.
 *
 * UserSession: This is an object which contains the
 *  user's public key, secret key, and user object.
 *  It is used to make and sign transactions. And used by the
 *  application to determine the current user. The object
 *  is created on program start and destroyed on program exit.
 *
 * UserProfile: A user profile is an object which contains:
 *   - A user 'item' object.
 *   - A secret key encrypted with a password.
 *   - A list of users that the user is following.
 *  A user profile is stored locally by the application for use
 *  between sessions. In the future the user profile could be
 *  shareable over the network to allow presistent profiles
 *  across multiple devices.
 *
 *  The encrypted secret key is used for authentication rather than a
 *  password hash because the secret key is used to verify/sign transactions but
 *  shouldn't be stored in plain text.
 *
 * Authentication processes:
 *
 * - Login or Create new User.
 * - Load or Create User Profile.
 * - Update User Session
 *
 * Auth Functions:
 *
 * - Create a new User. (public)
 *  - Create a new keypair.
 *  - Create a new user object.
 *  - Create a new user profile object.
 *
 * - Login with a User. (public)
 *  - Authenticate the user with password (key, password).
 *  - Authenticate the user with private key (key, privateKey).
 *  - Retrieve the user profile from the database.
 *
 * - Create a new UserSession. (private)
 * - Create a new UserProfile. (private)
 * - Store the UserProfile. (private)
 * - Set the UserSession. (private)
 * - Get the UserSession. (private)
 *
 * - Get the UserSession key. (public)
 * - Get the UserSession user. (public)
 *
 * - Getters / Setters:
 * - Set the UserSession address. (public)
 * - Get the UserSession address. (public)
 * - Set the UserSession last seen. (public)
 * - Get the UserSession last seen. (public)
 * - Set the UserSession last feed. (public)
 * - Get the UserSession last feed. (public)
 *
 * - Add Followed Peer. (public)
 * - Remove Followed Peer. (public)
 * - Get All Followed Peers. (public)
 *
 * - Sign a message / item. (public)
 * - Verify a message / item. (public)
 *
 * - Shutdown.
 *
 * How to map the nickname to the public key?
 * - Store the nickname in the user object.
 * - Store the user object in the user profile.
 * - Store the user profile in the database.
 * OR
 * - Store the nickname:key in a persistent map.
 */

const debug = require('debug')('auth');

const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');

const { encryptWithPassword, decryptWithPassword } = require('./encrypt');
const { isValidKeyFormat } = require('../utils/utils');

// const Database = require('../database/dbInstance');

// let userSession = null;
// let Database = null;

// function initAuth(dbInstance) {
//   Database = dbInstance;

//   // createNewUserSession('testuser');
//   // debug('User session created.', getUserSession());
// }

/* User Session */
let userSession = null;

function setUserSession(session) {
  userSession = session; // { userProfile, secretKey };
}

function isUserSession() {
  return userSession !== null;
}

function getUserSessionProfile() {
  return userSession.userProfile || null;
}

function getUserSessionKey() {
  return userSession.userProfile.key || null;
}

function getUserSessionUser() {
  return userSession.userProfile.userObject || null;
}

function getUserSessionAddress() {
  return userSession.userProfile.userObject.lastAddress || null;
}

// Used by Server Handshake, unfortunately
function setUserSessionAddress(address) {
  userSession.userProfile.userObject.lastAddress = address;
}

function updateUserSessionLastSeen() {
  userSession.userProfile.userObject.lastSeen = new Date().toISOString();
}

// function setUserSessionProfile(profile) {
//   userSession.userProfile = profile;
// }

function getUserSessionFeed() {
  return userSession.userProfile.userObject.lastFeed;
}

function setUserSessionFeed(feed) {
  userSession.userProfile.userObject.lastFeed = feed.key;
}

function getUserSessionFollowing() {
  return userSession.userProfile.following;
}

function addUserToFollowing(userKey) {
  if (isValidKeyFormat(userKey)) {
    const { following } = userSession.userProfile;

    if (!following.includes(userKey)) {
      following.push(userKey);
    }
  }
}

function removeUserFromFollowing(userKey) {
  if (isValidKeyFormat(userKey)) {
    const { following } = userSession.userProfile;

    if (following.includes(userKey)) {
      following.splice(following.indexOf(userKey), 1);
    }
  }
}

//

/* User Functions */
/**
 * @description: Authenticate a NEW user with a password.
 * @param {string} nickname The desired nickname (optional) of the user
 * @param {string} password The desired password of the user
 * @returns {object} An object containing the user profile and secret key
 * @throws {Error} If the user is not authenticated or user profile cannot be saved
 */
function authNewUser(nickname, password) {
  const { user, secretKey } = createNewUser(nickname);
  debug('New user:', user);
  debug('New secret key:', secretKey);

  const userProfile = createNewUserProfile(user, password, secretKey);
  setUserSession({ userProfile, secretKey });

  return { userProfile, secretKey };
}

/**
 * @description: Authenticate a user with a publicKey and secretKey.
 * @param {*} key The public key of the user
 * @param {*} secretKey The secret key of the user
 * @returns {object} The user profile object
 * @throws {Error} If the user cannot be authenticated
 */
function authUserWithKey(key, secretKey, userProfile) {
  if (!authenticateKeyPair(key, secretKey)) {
    throw new Error('Invalid key or secret');
  }

  // const userProfile = loadUserProfile(key);

  // Set user session
  setUserSession({ userProfile, secretKey });
  updateUserSessionLastSeen();

  // return something
  return userProfile;
}

/**
 * @description: Authenticate a user with a publicKey and password.
 * @param {*} key The public key of the user
 * @param {*} password The password of the user
 * @returns {object} The user profile object
 * @throws {Error} If the user cannot be authenticated
 */
function authUserWithPassword(key, password, userProfile) {
  // The user profile is retrieved from the database.
  // const userProfile = loadUserProfile(key);

  // The secret key is decrypted with the password.
  const secretKey = decryptWithPassword(password, userProfile.secretKey);

  // The user is authenticated with the public key & secret key.
  if (!authenticateKeyPair(key, secretKey)) {
    throw new Error('Invalid key or secret');
  }

  // Set user session
  setUserSession({ userProfile, secretKey });
  updateUserSessionLastSeen();

  // return something
  return userProfile;
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
    lastSeen: new Date().toISOString(),
    lastFeed: null,
  };

  return { user, secretKey };
}

function createNewUserProfile(user, password, secretKey) {
  // Validate the inputs
  // derive pubkey from secret key
  if (!authenticateKeyPair(user.key, secretKey)) {
    throw new Error('User key does not match secret key');
  }

  // We do not want to store the secret key in plain text, just in case.
  const encryptedSecretKey = encryptWithPassword(password, secretKey);

  // Create the user profile object
  const userProfile = {
    type: 'userProfile',
    key: user.key,
    secretKey: encryptedSecretKey,
    userObject: user,
    following: [],
  };

  return userProfile;
}

/**
 * @description: Authenticate a pair of public key and secret key.
 * @param {string} publicKey Public key of the user
 * @param {string} secretKey Secret key of the user
 * @returns {boolean}: True if the user is authenticated, false otherwise
 */
function authenticateKeyPair(publicKey, secretKey) {
  let authenticated = false;

  try {
    const secretKeyBuffer = nacl.util.decodeBase64(secretKey);
    const generatedBuffer = nacl.sign.keyPair.fromSecretKey(secretKeyBuffer);
    const generatedKey = nacl.util.encodeBase64(generatedBuffer.publicKey);

    authenticated = (publicKey === generatedKey);
  } catch (err) {
    if (err instanceof TypeError) {
      debug('Invalid key format');
    } else {
      debug('Error authenticating:', err);
    }
  }

  debug('Authentication status:', authenticated);
  return authenticated;
}

/* Signing / Verifying Functions */

/**
 * Helper function to obtain key and stringify item for use with signStringWithKey.
 * @param {*} item The item to sign
 * @returns The signature of the item, to be stored within the item
 */
function signItem(item) {
  const { secretKey } = userSession;

  // unpack the item and stringify
  const { signature, ...itemContent } = item;
  const itemString = JSON.stringify(itemContent);

  return signStringWithKey(itemString, secretKey);
}

/**
 * Signs a string of data with a provided secret key.
 * @param {*} data The data to sign (a string)
 * @param {*} secretKey The secret key to sign the data with
 * @returns The signature of the data, to be stored by caller
 */
function signStringWithKey(data, secretKey) {
  const secretKeyBuffer = nacl.util.decodeBase64(secretKey);
  const dataBuffer = nacl.util.decodeUTF8(data);
  const signatureBuffer = nacl.sign.detached(dataBuffer, secretKeyBuffer);
  const signature = nacl.util.encodeBase64(signatureBuffer);

  return signature;
}

/**
 * Verifies the signature of an item, public key is obtained from the item provided,
 * @param {*} item The item to verify (feed, document)
 * @returns {Boolean} True if the item is verified, false otherwise
 * @throws {Error} If the item is not verified
 */
function verifyItem(item) {
  const { owner: publicKey } = item;
  const { signature, ...itemContent } = item;
  const data = JSON.stringify(itemContent);

  return verifyStringSignature(data, signature, publicKey);
}

/**
 * Verifies the signature of a string of data.
 * @param {*} data The data to verify (a string)
 * @param {*} signature The signature of the data
 * @param {*} publicKey The public key of the signer
 * @returns {Boolean} True if the data is verified, false otherwise
 * @throws {Error} If the data is not verified
 */
function verifyStringSignature(data, signature, publicKey) {
  // let verified = false;

  try {
    const signatureBuffer = nacl.util.decodeBase64(signature);
    const publicKeyBuffer = nacl.util.decodeBase64(publicKey);
    const dataBuffer = nacl.util.decodeUTF8(data);

    return nacl.sign.detached.verify(dataBuffer, signatureBuffer, publicKeyBuffer);
  } catch (err) {
    if (err instanceof TypeError) {
      debug(`Invalid format: "${signature}" or "${publicKey}"`);
    } else {
      debug('Error verifying:', err);
    }
  }
  return false;
  // return verified;
}

module.exports = {
  // initAuth,

  authNewUser,
  authUserWithKey,
  authUserWithPassword,

  // authenticateUser,
  setUserSession,
  createNewUser,

  isUserSession,
  getUserSessionKey,
  getUserSessionUser,
  getUserSessionProfile,
  getUserSessionAddress,
  getUserSessionFeed,
  getUserSessionFollowing,

  setUserSessionAddress,
  // setUserSessionProfile,
  setUserSessionFeed,

  updateUserSessionLastSeen,
  // signMessage: signItem,
  // signMessageWithKey: signStringWithKey,

  verifyItem,
  signItem,
  verifyStringSignature,
  signStringWithKey,

  addUserToFollowing,
  removeUserFromFollowing,
};
