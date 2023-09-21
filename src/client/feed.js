const debug = require('debug')('client');

const { pubItem } = require('./putPub');
// const { Database } = require('./clientDb');
// const Database = global.dbInstance;

const {
  // authNewUser,
  // authUserWithKey,
  // authUserWithPassword,
  // getUserSessionKey,
  signItem,
  getUserSessionUser,
  getUserSessionFeed,
  setUserSessionFeed,
  // getUserSessionFollowing,
} = require('../auth/auth');

// const { sendItemToProviders } = require('../network/providers');
const { generateKey } = require('../utils/utils');

const { saveUserProfile } = require('./userProfile');

let Database = null;

// const { RequestTypes, Request } = require('../models/request');
// const { ResponseTypes, Response } = require('../models/response');
// const { isValidItemType } = require('../models/types');
// const { validateItem } = require('../models/validation');

function setDb(dbInstance) {
  Database = dbInstance;
}

function createNewFeed(user) {
  // create new feed
  const feed = {
    // signature: null,
    // key: null,
    type: 'feed',
    owner: user.key,
    timestamp: new Date().toISOString(),
    items: [],
  };

  // feed.key = generateKey(feed);
  debug('Created new feed.', feed);
  return feed;
}

// could client/get() be used here instead? - remove db dependency
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

  // append new items
  newFeed.items.push(document.key);
  newFeed.key = generateKey(newFeed);
  // debug('lastFeed', lastFeed, 'newFeed', newFeed);

  // sign the new feed
  const signature = signItem(newFeed);
  newFeed.signature = signature;

  // delete old feed
  if (lastFeed) {
    Database.delete(lastFeed.key, 'feed');
  }

  // update local db with the feed item
  // Database.put(newFeed);

  // update usersession and profile feed
  // update user profile and database
  setUserSessionFeed(newFeed);
  saveUserProfile(); // hmm

  // // send feed to providers
  // sendItemToProviders(newFeed);
  pubItem(newFeed);
  debug('Updated user feed.', newFeed);

  // // send updated user to providers
  // sendItemToProviders(user);
  pubItem(user);
  debug('Updated user.', user);
}

module.exports = {
  setDb,
  createNewFeed,
  updateUserFeed,
  // getFollowedFeeds,
  getUserFeed,
  getFeed,
};
