/**
 * @fileoverview Debugging functions for the client.
 */

const { getAllPeers, pingPeer, handshakePeer } = require('../network/cache');
const { getUserSessionProfile } = require('../auth/auth');
const { getLocalDocuments, getLocalUsers } = require('./get');

function getCache() {
  return getAllPeers();
}

function getProfile() {
  return getUserSessionProfile();
}

function getAllDocumentKeys() {
  // Get all documents stored in database
  const documents = getLocalDocuments();
  return documents.map((document) => document.key);
}

function getAllUserKeys() {
  // Get all users stored in database
  const users = getLocalUsers();
  return users.map((user) => user.key);
}

module.exports = {
  getCache,
  getProfile,
  pingPeer,
  handshakePeer,
  getAllDocumentKeys,
  getAllUserKeys,
};
