/**
 * @fileoverview This file contains the user authentication logic.
 * @module auth
 * TODO: Add a function to fetch the user object from the database?
 * TODO: Add a function to fetch the user object from the network?
 * TODO: WRITE TESTS
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
 * Authentication process:
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

// const { userSchema, userProfileSchema } = require('../models/types');

// const { Database } = require('../database/dbInstance');

// class UserSession {
//   #userProfile;

//   #secretKey;

//   constructor(userProfile, secretKey) {
//     this.userProfile = userProfile;
//     this.secretKey = secretKey;
//   }

//   get userProfile() {
//     return this.userProfile;
//   }

//   get userKey() {
//     return this.userProfile.key;
//   }

//   get secretKey() {
//     return this.secretKey;
//   }

//   get followed() {
//     return this.userProfile.following;
//   }
// }

/* User Session */

let userSession = null;

function setUserSession(userProfile, secretKey) {
  userSession = { userProfile, secretKey };
  // userSession = new UserSession(userProfile, secretKey);
}

function getUserSessionProfile() {
  return userSession.userProfile;
}

function getUserSessionKey() {
  return userSession.userProfile.key;
}

function getUserSessionUser() {
  return userSession.userProfile.userObject;
}

// Used by Server Handshake, but there must be a better way.
function setUserSessionAddress(address) {
  userSession.userProfile.userObject.lastAddress = address;
}

/* User Functions */

function authNewUser(nickname, password) {
  // Create a new user
  const { user, secretKey } = createNewUserF(nickname);
  debug('New user:', user);
  debug('New secret key:', secretKey);

  // Create a new user profile
  const userProfile = createNewUserProfile(user, password, secretKey);

  // Store the user profile (when implemented_)
  // saveUserProfile(userProfile);

  // Set user session
  setUserSession(userProfile, secretKey);

  // return something
  return { userProfile, secretKey };
}

function authUserKey(key, secretKey) {
  // Authenticate the user
  if (!authenticateKeyPair(key, secretKey)) {
    throw new Error('Invalid key or secret');
  }
  // Retrieve the user profile OR create a new one
  const userProfile = null;
  // try {
  // const userProfile = loadUserProfile(key);

  if (!userProfile) {
    createNewUserProfile(key, secretKey);
    // saveUserProfile(userProfile);
  }

  // Set user session
  setUserSession(userProfile, secretKey);

  // return something
  return userProfile;
}

function authUserPassword(key, password) {
  // get the secret key from the password
  const secretKey = decryptSecretKey(key, password);

  return authUserKey(key, secretKey);
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
function createNewUserF(_nickname) {
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
  // derive pubkey from secret key
  if (!authenticateKeyPair(user.key, secretKey)) {
    throw new Error('User key does not match secret key');
  }

  // Encrypt the secret key with the password (not implemented yet)
  const encryptedSecretKey = encryptSecretKey(secretKey, password);

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

// function createUserSession(userProfile, password) {

// }

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
  return encryptedSecretKey;
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

/* User Profile Functions */

// function saveUserProfile(userProfile) {
//   try {
//     Database.saveUserProfile(userProfile.key, userProfile);
//   } catch (err) {
//     debug('Error saving user profile:', err);
//   }
// }

// function loadUserProfile(key) {
//   try {
//     const userProfile = Database.getUserProfile(key);
//     return userProfile;
//   } catch (err) {
//     debug('Error loading user profile:', err);
//   }
//   return null;
// }

/* Temporary tests */

module.exports = {
  authNewUser,
  authUserKey,
  authUserPassword,

  // authenticateUser,
  // setUserSession,

  getUserSessionKey,
  getUserSessionUser,
  getUserSessionProfile,

  setUserSessionAddress,

  signMessage,
  verifyMessage,

};
