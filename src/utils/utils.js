/**
 * @description: Utility functions for the application.
 * @module Utils
 */

const objecthash = require('object-hash');

/**
 * Get a consistent hash of an object, to be used as a key in a map.
 * For this example we can use shorter hashes to aid testing but IRL
 * we would use the full hash.
 * @param {*} input The object to be hashed
 * @returns A consistent hash of the input
 */
function generateKey(input) {
  return objecthash(input, { algorithm: 'sha256', encoding: 'base64' });
}

/**
 * @description: Check if the key is valid for the item.
 * @param {*} key The key to check
 * @param {*} item The item to hash
 * @returns True if the key is a valid hash for the item, false otherwise
 */
function isValidKeyForItem(_key, item) {
  if (!isValidKeyFormat(_key)) {
    return false;
  }
  // because user objects may have different parameters
  // we use the public key as the key instead ?
  if (item.type === 'user' || item.type === 'userProfile') {
    return _key === item.key;
  }

  const { key, signature, ...itemContent } = item;

  return _key === generateKey(itemContent);
}

/**
 * @description: Check if the key is a valid format.
 * @param {*} key The key to check
 */
function isValidKeyFormat(key) {
  const keyRegex = /^[A-Za-z0-9+/]{43,}(={0,2})$/;
  return keyRegex.test(key);
}

module.exports = {
  generateKey,
  isValidKeyForItem,
  isValidKeyFormat,
};
