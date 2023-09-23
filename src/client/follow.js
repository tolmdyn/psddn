const debug = require('debug')('client');

const { getItem, getLatestUser } = require('./get');
const { saveUserProfile } = require('./userProfile');
const { putItem } = require('./putPub');

const { addUserToFollowing, removeUserFromFollowing, getUserSessionFollowing } = require('../auth/auth');
const { Types } = require('../models/types');
const { ResponseTypes } = require('../models/response');

function followUser(user) {
  addUserToFollowing(user);
  saveUserProfile();

  // return Object.fromEntries(getUserSessionFollowing());
  return getUserSessionFollowing();
}

function unfollowUser(user) {
  removeUserFromFollowing(user);
  saveUserProfile();

  // return Object.fromEntries(getUserSessionFollowing());
  return getUserSessionFollowing();
}

/**
 * @description Gets the latest findable users that the current user is following.
 * @returns An array of user objects or an empty array.
 */
async function getFollowedUsers() {
  const followedPeers = getUserSessionFollowing();
  // debug('Followed peers:', followedPeers);
  const userPromises = followedPeers.map(async (key) => {
    try {
      const response = await getLatestUser(key);
      if (response.responseType === ResponseTypes.Success) {
        const user = response.responseData;
        return user;
      }
    } catch (error) {
      debug('Error getting user:', error);
    }
    return null;
  });

  try {
    const users = await Promise.all(userPromises);
    // debug('Users:', users);
    return users.filter((user) => user !== null);
  } catch (error) {
    debug('Error getting users:', error);
    return [];
  }
}

/**
 * @description Gets the latest findable feeds from the current user's followed users.
 * @returns An array of feed objects or an empty array.
 */
async function getFollowedFeeds() {
  const followedPeers = getUserSessionFollowing();
  // debug('Followed peers:', followedPeers);

  // get the latest feed keys for each followed user
  const feedKeysPromises = followedPeers.map(async (userKey) => {
    try {
      const response = await getLatestUser(userKey);
      if (response.responseType === ResponseTypes.Success) {
        const feedKey = response.responseData.lastFeed;
        return feedKey;
      }
    } catch (error) {
      debug('Error getting feed key:', error);
    }
    return null;
  });

  const feedKeys = await Promise.all(feedKeysPromises);

  // get the feeds from the keys
  const feedPromises = feedKeys.map(async (key) => {
    try {
      const response = await getItem(key, Types.Feed);
      // debug('Response:', response);
      if (response.responseType === ResponseTypes.Success) {
        const feed = response.responseData;
        return feed;
      }
    } catch (error) {
      debug('Error getting feed:', error);
    }
    return null;
  });

  let feeds = null;

  try {
    const feedResults = await Promise.all(feedPromises);
    // debug('Feeds:', feeds);
    feeds = feedResults.filter((feed) => feed !== null);
    // debug('Filtered feeds:', filteredFeeds);
  } catch (error) {
    debug('Error getting feeds:', error);
    // return [];
  }

  if (feeds) {
    try {
      feeds.forEach((feed) => {
        putItem(feed);
      });
    } catch (error) {
      debug('Error putting new feeds into local database:', error.message);
    }
  }

  return feeds;
}

/**
 * @description Gets the latest findable documents from the current user's followed feeds.
 * @returns An array of document objects or an empty array.
 */
async function getFollowedDocuments() {
  // get followed feeds
  const feeds = await getFollowedFeeds();

  // get posts from feeds
  const docKeys = feeds.flatMap((feed) => feed.items);

  // assemble promises
  const docPromises = docKeys.map(async (documentKey) => {
    try {
      const response = await getItem(documentKey, Types.Document);
      if (response.responseType === ResponseTypes.Success) {
        const document = response.responseData;
        return document;
      }
    } catch (error) {
      debug('Error getting post:', error);
    }
    return null;
  });

  // get documents
  let documents = null;

  try {
    const postResults = await Promise.all(docPromises);
    documents = postResults.filter((document) => document !== null);
  } catch (error) {
    debug('Error getting documents:', error);
  }

  // put posts into local db
  if (documents) {
    try {
      documents.forEach((document) => {
        putItem(document);
      });
    } catch (error) {
      debug('Error putting new documents into local database:', error.message);
    }
  }

  documents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return documents;
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowedUsers,
  getFollowedFeeds,
  getFollowedDocuments,
};
