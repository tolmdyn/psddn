const debug = require('debug')('client');

const {
  getUserSessionKey,
  signItem,
  verifyItem,
} = require('../auth/auth');

const { generateKey } = require('../utils/utils');
const { pubItem } = require('./putPub');
const { updateUserFeed } = require('./feed');

async function createNewPost(title, content, tags) {
  // create new document
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

  // sign the new document
  const signature = signItem(document);
  document.signature = signature;

  // verify sig
  const verified = verifyItem(document);
  debug('Verified:', verified);
  if (!verified) {
    debug('Error verifying item.');
    throw new Error('Error unable to verify item.');
  }
  // publish item
  const response = await pubItem(document);

  // update user feed
  updateUserFeed(document);

  return response;
}

module.exports = {
  createNewPost,
};
