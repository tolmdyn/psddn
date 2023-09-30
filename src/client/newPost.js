/**
 * @fileoverview Creates a new document and publishes it to the network.
 * @memberof client
 */

const debug = require('debug')('client');

const {
  getUserSessionKey,
  signItem,
  verifyItem,
} = require('../auth/auth');

const { generateKey } = require('../utils/utils');
const { pubItem } = require('./putPub');
const { updateUserFeed } = require('./feed');

/**
 * @description Creates a new document and publishes it to the network.
 * @param {string} title The title of the document.
 * @param {string} content The content of the document.
 * @param {Array} tags An array of tags (strings) for the document. (optional)
 * @returns A response object. Success with the item or Error and reason.
 */
async function createNewPost(title, content, tags) {
  if (!title || !content) {
    throw new Error('Title or content cannot be empty.');
  }

  const document = {
    type: 'document',
    owner: getUserSessionKey(),
    timestamp: new Date().toISOString(),
    title,
    content,
    tags: tags || [],
    // signature: null,
  };

  document.key = generateKey(document);

  const signature = signItem(document);
  document.signature = signature;

  const verified = verifyItem(document);
  debug('Verified:', verified);
  if (!verified) {
    debug('Error verifying item.');
    throw new Error('Error unable to verify item.');
  }

  const response = pubItem(document);
  updateUserFeed(document);

  return response;
}

module.exports = {
  createNewPost,
};
