/* eslint-disable object-curly-newline */
/**
 * @fileoverview Client functions for the application. To be used by the user interface.
 */

/**
 * create a client that:
 * -handles requests from the user/interface via an API
 * -serves requests for items from the local database
 * -if the item is not found in the local database,
 * -aquires provider address(es) from the routing modules
 * and then
 * -creates connections to remote servers and requests for items
 * -any items received from remote servers are stored in the local database
 * -and user is notified of the item?
 *
 * How does the client interface work. Should it serve a local only "web" API?
 *
 * Item is either:
 * --document
 * --feed
 * --user(info)
 *
 * # Authentication
 * -authenticate user / create session
 * -create new user (as profile)
 * -sign documents/feeds
 * -verify documents/feeds
 *
 * # Actions (Only Remote actions generate a request/response)
 * (All gets try local first then remote.)
 *
 * Unauthenticated actions (does not require a valid user session):
 * -get item (from local -> remote)
 * -get user feed
 * -get user info / public key
 * -get user documents from feed
 * -get user documents from local db
 * -get user documents from remote
 *
 * Authenticated actions (requires a valid user session):
 * -put item (add to local db only...)
 * -pub item (update feed, then send to remote) (COMBINED WITH PUT?)
 * -update user feed
 * -update followed feeds
 * -get all followed feed documents? (using get user doc from feed)
 *
 * # Users
 * -get followed users
 * -add followed user
 * -remove followed user ?
 * -get user info
 *
 */

/* --------------------------------- Client Imports --------------------------------- */
const { initDb } = require('./clientDb');
const { saveUserProfile } = require('./userProfile');
const { getUserFeed, getFeed } = require('./feed');
const { followUser, unfollowUser } = require('./follow');
const { loginUser, loginNewUser } = require('./login');
const { getItem } = require('./get');
const { putItem, pubItem } = require('./putPub');
const { createNewPost } = require('./newPost');
const { getFollowedFeeds, getFollowedUsers, getFollowedDocuments } = require('./follow');
const { pingPeer, handshakePeer, getCache, getProfile, getAllDocumentKeys, getAllUserKeys } = require('./debug');

/* -------------------------------- Module Exports ---------------------------------- */

module.exports = {
  initClient: initDb,
  loginUser,
  loginNewUser,

  getItem,
  putItem,
  pubItem,

  createNewPost,

  getFeed,
  getUserFeed,
  getFollowedFeeds,
  getFollowedUsers,
  getFollowedDocuments,

  followUser,
  unfollowUser,

  pingPeer,
  handshakePeer,
  getCache,
  getProfile,
  getAllDocumentKeys,
  getAllUserKeys,

  shutdownClient: () => { saveUserProfile(); },
};
