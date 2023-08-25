const debug = require('debug')('client');

// const { Database } = require('./clientDb');
// const Database = global.dbInstance;

const {
  // authNewUser,
  // authUserWithKey,
  // authUserWithPassword,
  // getUserSessionKey,
  signItem,
  getUserSessionUser,
  setUserSessionFeed,
  getUserSessionProfile,
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
    type: 'feed',
    // key: null,
    owner: user.key,
    timestamp: new Date().toISOString(),
    items: [],
    // signature: null,
  };

  // feed.key = generateKey(feed);
  debug('Created new feed.', feed);
  return feed;
}

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
  return getUserFeed(getUserSessionUser());
}
/**
 * @description Updates the current user's feed with a new document.
 * @param {} document The item to be added to the feed.
 * TODO: This is provisional and calls need to be tested / implemented.
 */
function updateUserFeed(document) {
  debug('updateUserFeed', document.key);

  // get last user feed
  // const user = Database.get(getUserSessionKey(), 'user');
  const user = getUserSessionUser();

  const lastFeed = getUserFeed(user);
  // debug('lastFeed', lastFeed);
  // If there is a last feed, we want to strip off the key and signature
  // so that we can sign the feed with the new document.
  // if (lastFeed) {
  //   newFeed = { ...lastFeed };
  // }

  // If there is no last feed, we create a new feed.
  const newFeed = createNewFeed(user);

  if (lastFeed) {
    // copy items from last feed
    newFeed.items = [...lastFeed.items];
  }

  // append new items
  newFeed.items.push(document.key);

  newFeed.key = generateKey(newFeed);

  // debug('lastFeed', lastFeed, 'newFeed', newFeed);

  // sign the new feed
  const signature = signItem(newFeed);
  newFeed.signature = signature;

  // update local db with the feed item
  Database.put(newFeed);

  // delete old feed
  if (lastFeed) {
    Database.delete(lastFeed.key, 'feed');
  }
  // update usersession and profile feed
  // update user profile and database
  setUserSessionFeed(newFeed);
  saveUserProfile(getUserSessionProfile()); // hmmm

  // // send feed to providers
  // sendItemToProviders(lastFeed);
  // debug('Updated user feed.', lastFeed);

  // // send updated user to providers
  // sendItemToProviders(user);
  // debug('Updated user.', user);
}

function getFollowedFeeds() {
  // get followed peers from local db
  //    const followedPeers = getUserSessionProfile().following;

  // get feeds for peers (if available)
  // for each followed peer,
  //  -update lastFeed ?
  //  -

  // get feeds from local db
  // get provider for each feed
  // get feed from provider
  // update local db
}

module.exports = {
  setDb,
  createNewFeed,
  updateUserFeed,
  getFollowedFeeds,
  getUserFeed,
  getFeed,
};
