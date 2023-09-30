/**
 * @fileoverview Functions for following and unfollowing users. Also functions for getting
 * the latest findable users, feeds, and documents from the current user's followed users.
 * @memberof module:client
 */

const debug = require('debug')('client');

const { getItem, getLatestUser } = require('./get');
const { saveUserProfile } = require('./userProfile');
const { putItem } = require('./putPub');

const { addUserToFollowing, removeUserFromFollowing, getUserSessionFollowing } = require('../auth/auth');
const { Types } = require('../models/types');
const { ResponseTypes } = require('../models/response');

/**
 * @memberof module:client
 * @description Adds a user to the current user's following list.
 * @param {*} user The user object to follow.
 * @returns The current user's following list. (Not a response object)
 */
function followUser(user) {
  addUserToFollowing(user);
  saveUserProfile();

  return getUserSessionFollowing();
}

/**
 * @memberof module:client
 * @description Removes a user from the current user's following list.
 * @param {*} user The user object to unfollow.
 * @returns The current user's following list. (Not a response object)
 */
function unfollowUser(user) {
  removeUserFromFollowing(user);
  saveUserProfile();

  return getUserSessionFollowing();
}

/**
 * @memberof module:client
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
    return users.filter((user) => user !== null);
  } catch (error) {
    debug('Error getting users:', error);
    return [];
  }
}

/**
 * @memberof module:client
 * @description Gets the latest findable feeds from the current user's followed users.
 * @returns An array of feed objects or an empty array.
 * TODO: What should the return value be in case of error?
 */
async function getFollowedFeeds() {
  const followedPeers = getUserSessionFollowing();

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

  const feedPromises = feedKeys.map(async (key) => {
    try {
      const response = await getItem(key, Types.Feed);
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
    feeds = feedResults.filter((feed) => feed !== null);
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
 * @memberof module:client
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

/**
 * @memberof module:client
 * @description Gets a selection of the latest findable documents from the current user's
 * followed feeds.
 * @param {*} start The index of the first document to return.
 * @param {*} max The maximum number of documents to return.
 */
async function getSomeFollowedDocuments(start, max) {
  const documents = await getFollowedDocuments();

  if (documents.length === 0 || start >= documents.length) {
    return [];
  }

  return documents.slice(start, Math.min((start + max), documents.length));
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowedUsers,
  getFollowedFeeds,
  getFollowedDocuments,
  getSomeFollowedDocuments,
};
