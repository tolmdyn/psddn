/**
 * @desciption Test for util functions
 */

const { expect } = require('chai');

const {
  generateKey,
  isValidKeyForItem,
  isValidKeyFormat,
  generateRandomDocument,
  generateRandomUser,
  generateRandomFeed,
} = require('../src/utils/utils');

const { keyRegex } = require('../src/models/match');
const { documentSchema } = require('../src/models/document');
const { userSchema } = require('../src/models/user');
const { feedSchema } = require('../src/models/feed');

// const { valid } = require('joi');

describe('Document Generation Tests', () => {
  it('should generate a valid document', () => {
    const doc = generateRandomDocument();
    expect(doc).to.be.an('object');
    expect(doc.type).to.equal('document');
    expect(doc.key).to.be.a('string');
    expect(doc.owner).to.be.a('string');
    expect(doc.owner).to.match(keyRegex);
    expect(doc.timestamp).to.be.a('string');
    expect(doc.title).to.be.a('string');
    expect(doc.title).to.have.lengthOf.at.least(5);
    expect(doc.title).to.have.lengthOf.at.most(50);
    expect(doc.content).to.be.a('string');
    expect(doc.content).to.have.lengthOf.at.least(5);
    expect(doc.content).to.have.lengthOf.at.most(2000);
    expect(doc.tags).to.be.an('array');
    expect(doc.tags).to.have.lengthOf.at.least(0);
    expect(doc.tags).to.have.lengthOf.at.most(5);

    const { error } = documentSchema.validate(doc);
    expect(error).to.be.undefined;
  });

  it('should generate a unique document', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();

    expect(doc1).to.not.deep.equal(doc2);
    expect(doc1.key).to.not.equal(doc2.key);
    expect(doc1.owner).to.not.equal(doc2.owner);
    expect(doc1.timestamp).to.not.equal(doc2.timestamp);
    expect(doc1.title).to.not.equal(doc2.title);
    /* etc */
  });

  it('should generate a valid hash from document', () => {
    const doc = generateRandomDocument();
    // const key = doc.key;
    expect(isValidKeyFormat(doc.key)).to.be.true;
    expect(isValidKeyForItem(doc.key, doc)).to.be.true;
  });

  it('should not validate an invalid document hash', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();
    // const key = doc1.id;
    expect(isValidKeyForItem(doc1.key, doc1)).to.be.true;
    expect(isValidKeyForItem(doc1.key, doc2)).to.be.false;
  });

  it('should not accept the wrong key for document', () => {
    const doc = generateRandomDocument();
    const key = '123456789ABCDEF';
    expect(isValidKeyForItem(key, doc)).to.be.false;
    expect(isValidKeyFormat(key)).to.be.false;
  });

  it('should generate a consistent hash for same document', () => {
    const doc = generateRandomDocument();
    // We are hashing a generated doc so the key will not match the id
    // But key1 and key2 should be the same
    const key1 = generateKey(doc);
    const key2 = generateKey(doc);
    expect(key1).to.equal(key2);
    expect(key1).to.not.equal(key1.id);
  });

  it('should generate a different hash for different document', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();
    const key1 = generateKey(doc1);
    const key2 = generateKey(doc2);
    expect(key1).to.not.equal(key2);
  });

  it('should generate the same hash for different document with same data', () => {
    const doc1 = generateRandomDocument();
    const doc2 = { ...doc1 };
    const key1 = generateKey(doc1);
    const key2 = generateKey(doc2);
    expect(key1).to.equal(key2);
  });

  it('should generate the same hash for same object with different parameter order', () => {
    const doc1 = {
      type: 'document',
      id: '1234567890123456',
      owner: '1234567890123456',
      timestamp: '2021-03-01T00:00:00.000Z',
      title: 'Lorem ipsum dolor sit amet',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.',
      tags: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
      signature: null,
    };

    const doc2 = {
      id: '1234567890123456',
      type: 'document',
      owner: '1234567890123456',
      timestamp: '2021-03-01T00:00:00.000Z',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.',
      tags: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
      title: 'Lorem ipsum dolor sit amet',
      signature: null,
    };

    expect(doc1).to.deep.equal(doc2);
    // Need to test that the order of keys doesn't effect the hash function
    // Otherwise it will be inconsistent for the same object
    expect(JSON.stringify(doc1)).to.not.equal(JSON.stringify(doc2));
    expect(generateKey(JSON.stringify(doc1))).to.not.equal(JSON.stringify(doc2));

    const key1 = generateKey(doc1);
    const key2 = generateKey(doc2);

    expect(key1).to.equal(key2);
  });
});

// describe('User Generation Tests', () => {
//   /* generate random user tests */
//   it('should generate a random user with valid parameters', () => {
//     const user = generateRandomUser();

//     expect(user).to.be.an('object');
//     expect(user).to.have.property('type');
//     expect(user).to.have.property('key');
//     expect(user).to.have.property('nickname');
//     expect(user).to.have.property('lastAddress');
//     expect(user).to.have.property('lastSeen');
//     expect(user.type).to.equal('user');

//     expect(user.nickname).to.be.a('string');
//     expect(user.lastAddress).to.be.a('Object');
//     // etc

//     expect(isValidKeyFormat(user.key)).to.be.true;
//     expect(isValidKeyForItem(user.key, user)).to.be.true;
//   });
// });

describe('Feed Generation Tests', () => {
  /* generate random feed tests */
  it('should generate a random feed with valid parameters', () => {
    const feed = generateRandomFeed();
    expect(feed).to.be.an('object');

    expect(feed).to.have.property('type');
    expect(feed.type).to.equal('feed');

    expect(feed).to.have.property('owner');
    expect(feed.owner).to.be.a('string');
    expect(feed.owner).to.match(keyRegex);

    expect(feed).to.have.property('timestamp');
  });
});

describe('Key Generation / Validation Tests', () => {
  it('should generate a valid key by hashing an object', () => {
    const object = {
      type: 'document',
      id: '1234567890123456',
      owner: '1234567890123456',
    };
    const key = generateKey(object);
    expect(key).to.equal('HOZB/B/8I3/2cWUtyae4nPv1vX7KjCZnOCV7iwrhJlI=');
    expect(key).to.be.a('string');
    expect(key).to.have.lengthOf(44);
    expect(key).to.match(keyRegex);

    // const { error } = keyRegex.validate(key);
    // expect(error).to.be.undefined;
  });

  it('should validate a valid key format', () => {
    // Generate a collection of random valid keys
    const validKeys = [];
    for (let i = 0; i < 10; i += 1) {
      validKeys[i] = generateKey(generateRandomDocument());
    }

    validKeys.forEach((key) => {
      expect(key).to.be.a('string');
      expect(key).to.have.lengthOf(44);
      expect(key).to.match(keyRegex);
      expect(isValidKeyFormat(key)).to.be.true;
    });
  });

  it('should not validate an invalid key format', () => {
    const invalidKeys = [
      'invalid',
      '12345',
      12345,
      { key: '1ud321KDwz6ZFuK9gi0lrr4tIt0TFXR4TR5VCJcukeE=' },
      // '1ud321KDwz6ZFuK9gi0lrr4tIt0TFXR4TR5VCJcuke',
      // '1ud321KDwz6ZFuK9gi0lrr4tIt0TFXR4TR5VCJcukeeee',
    ];

    invalidKeys.forEach((key) => {
      expect(isValidKeyFormat(key)).to.be.false;
    });
  });

  it('should validate a valid key for an item', () => {
  });

  it('should not validate an invalid key for an item', () => {
  });

  it('should generate a consistent key for the same data', () => {
  });

  it('should generate a different key for different data', () => {
  });

  it('should generate the same key for different object with same data', () => {
  });

  it('should generate the same key for same object with different parameter order', () => {
  });

  it('should generate a valid key for a document', () => {
  });

  it('should generate a valid key for a user', () => {
  });

  it('should generate a valid key for a feed', () => {
  });

  /*
  const key1 = "1a2b3c4d5e6f7g8h"; // Invalid: contains non-hex characters
  const key2 = "1a2b3c4d5e6f7h8"; // Valid: 16 hex characters
  const key3 = "1a2b3c4d5e6f7h8i9"; // Invalid: more than 16 characters

  console.log(isValidKeyForItem(kisValidKeyFormat, ey1)); // Output: false
  console.log(isValidKeyForItem(kisValidKeyFormat, ey2)); // Output: true
  console.log(isValidKeyForItem(kisValidKeyFormat, ey3)); // Output: false
  */
});
