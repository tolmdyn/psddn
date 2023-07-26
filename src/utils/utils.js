/**
 * @description: Utility functions for the application.
 * @module Utils
 */

const { objectHash } = require('object-hash');

/**
 * Get a consistent hash of an object, to be used as a key in a map.
 * For this example we can use shorter hashes to aid testing but IRL
 * we would use the full hash.
 * @param {*} input The object to be hashed
 * @returns A consistent hash of the input
 */
function getHash(input) {
  const key = objectHash(input, { algorithm: 'sha1', encoding: 'hex' });
  return key.substring(0, 16);
}

const { faker } = require('@faker-js/faker');

/**
 * Generate a random document object for testing.
 * @returns A random document object
 */
function generateRandomDocument() {
  const document = {
    type: 'document',
    id: faker.string.alphanumeric(16),
    owner_id: faker.string.alphanumeric(16),
    timestamp: faker.date.recent().toISOString(),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraph(),
    tags: [faker.lorem.word(), faker.lorem.word()],
  };

  return document;
}

// console.log(JSON.stringify(generateRandomDocument()));

module.exports = { getHash, generateRandomDocument };
