const debug = require('debug')('client');

const { pubItem } = require('./putPub');
const { generateKey } = require('../utils/utils');
const { saveUserProfile } = require('./userProfile');
const {
  signItem,
  getUserSessionUser,
  getUserSessionFeed,
  setUserSessionFeed,
} = require('../auth/auth');

let Database = null;

function setDb(dbInstance) {
  Database = dbInstance;
}

/**
 * @description Creates a new empty feed object for a user, without
 * signature or key.
 * @param {*} user The user object for which to create a feed.
 * @returns {Object} The new feed object.
 */
function createNewFeed(user) {
  const feed = {
    // signature: null,
    // key: null,
    type: 'feed',
    owner: user.key,
    timestamp: new Date().toISOString(),
    items: [],
  };

  debug('Created new feed.', feed);
  return feed;
}

/**
 * @description Gets the feed of a user, given a user object.
 * @param {*} user The user object for which to get the feed.
 * @returns {Object} The latest feed object.
 * TODO: could client/get() be used here instead? - remove db dependency
 */
function getUserFeed(user) {
  const lastFeedId = user.lastFeed;
  debug('getUserFeed', lastFeedId);
  if (lastFeedId) {
    const lastFeed = Database.get(lastFeedId, 'feed');
    if (lastFeed) {
      return lastFeed;
    }
  }
  return null;
}

function getFeed() {
  return getUserSessionFeed();
}

/**
 * @description Updates the current user's feed with a new document.
 * @param {} document The item to be added to the feed.
 * TODO: This is provisional and calls need to be tested / implemented.
 */
function updateUserFeed(document) {
  debug('updateUserFeed', document.key);

  const user = getUserSessionUser();
  const lastFeed = getUserFeed(user);

  // If there is no last feed, we create a new feed.
  const newFeed = createNewFeed(user);

  if (lastFeed) {
    newFeed.items = [...lastFeed.items];
  }

  newFeed.items.push(document.key);
  newFeed.key = generateKey(newFeed);

  const signature = signItem(newFeed);
  newFeed.signature = signature;

  if (lastFeed) {
    Database.delete(lastFeed.key, 'feed');
  }

  setUserSessionFeed(newFeed);
  saveUserProfile();

  // // send feed to providers
  pubItem(newFeed);
  debug('Updated user feed.', newFeed);

  // // send updated user to providers
  pubItem(user);
  debug('Updated user.', user);
}

module.exports = {
  setDb,
  createNewFeed,
  updateUserFeed,
  getUserFeed,
  getFeed,
};
