/**
 * @description: Utility functions for the application.
 * @module Utils
 */

const objecthash = require('object-hash');
const { faker } = require('@faker-js/faker');

const { createNewUser } = require('../auth/auth');

/**
 * Get a consistent hash of an object, to be used as a key in a map.
 * For this example we can use shorter hashes to aid testing but IRL
 * we would use the full hash.
 * @param {*} input The object to be hashed
 * @returns A consistent hash of the input
 */
function generateKey(input) {
  const key = objecthash(input, { algorithm: 'sha256', encoding: 'base64' });
  // return key.substring(0, 16);
  return key;
}

/**
 * @description: Check if the key is valid for the item.
 * @param {*} key The key to check
 * @param {*} item The item to hash
 * @returns True if the key is a valid hash for the item, false otherwise
 */
function isValidKeyForItem(key, item) {
  // because user objects may have different parameters
  // we use the public key as the key instead ?
  if (item.type === 'user') {
    return key === item.publicKey;
  }

  return key === generateKey(item);
}

/**
 * @description: Check if the key is a valid format.
 * @param {*} key The key to check
 */
function isValidKeyFormat(key) {
  // const keyRegex = /^[0-9a-f]{16}$/;
  const keyRegex = /^[A-Za-z0-9+/]{43,}(={0,2})$/;
  return keyRegex.test(key);
}

// ------------------- MOVE TO tests/scripts/testutils.js -------------------

/**
 * Generate a random document object for testing.
 * @returns A random document object
 */
function generateRandomDocument() {
  const document = {
    type: 'document',
    id: faker.string.alphanumeric(16),
    owner: faker.string.alphanumeric(16),
    timestamp: faker.date.recent().toISOString(),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraph(),
    tags: [faker.lorem.word(), faker.lorem.word()],
    signature: null,
  };

  return document;
}

function generateRandomUser(keepSecretKey = false) {
  const { user, secretKey } = createNewUser(faker.internet.userName());
  user.lastAddress = { ip: faker.internet.ipv4(), port: faker.internet.port() };
  user.lastSeen = faker.date.recent().toISOString();

  if (keepSecretKey) {
    // embed secretKey in user object for testing
    user.secretKey = secretKey;
  }

  return user;
}

// function generateRandomFeed() {
//   // TODO: Implement
// }

// const doc = generateRandomDocument();
// const key = generateKey(doc);
// console.log(`\n Key: ${key} \n Doc: ${JSON.stringify(doc)}.`);

// const steve = generateRandomUser();
// console.log(steve);
// const key = generateKey('hello');

// console.log(key, isValidKeyFormat(key));
// console.log(isValidKeyFormat(generateKey('jhdfkjdfkjdfjhdf')));

module.exports = {
  generateKey,
  isValidKeyForItem,
  isValidKeyFormat,
  generateRandomDocument,
  generateRandomUser,
};
