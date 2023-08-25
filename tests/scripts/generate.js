const { faker } = require('@faker-js/faker');

const { generateKey } = require('../../src/utils/utils');
const { createNewUser } = require('../../src/auth/auth');
/**
 * Generate a random document object for testing.
 * @returns A random document object
 */
function generateRandomDocument() {
  const document = {
    type: 'document',
    owner: generateKey(faker.string.alphanumeric(16)),
    timestamp: faker.date.recent().toISOString(),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraph(),
    tags: [faker.lorem.word(), faker.lorem.word()],
  };

  document.key = generateKey(document);
  document.signature = null;

  return document;
}

function generateRandomUser(keepSecretKey = false) {
  const { user, secretKey } = createNewUser(faker.internet.userName());
  user.lastAddress = { ip: faker.internet.ipv4(), port: faker.internet.port() };
  user.lastSeen = faker.date.recent().toISOString();
  // Add feed key here after implementing feeds
  // user.lastFeed = null;

  if (keepSecretKey) {
    // embed secretKey in user object for testing
    user.secretKey = secretKey;
  }

  return user;
}

function generateRandomFeed() {
  // TODO: Implement
  const feed = {
    type: 'feed',
    // id: faker.string.alphanumeric(16),
    // owner: generateKey(faker.string.alphanumeric(16)),

    timestamp: faker.date.recent().toISOString(),
    documents: [],
  };

  feed.owner = generateKey(faker.string.alphanumeric(16));
  feed.key = generateKey(feed);
  feed.signature = null;

  return feed;
}

module.exports = {
  generateRandomDocument,
  generateRandomUser,
  generateRandomFeed,
};
