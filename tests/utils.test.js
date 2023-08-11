/**
 * @desciption Test for util functions
 */

const { expect } = require('chai');

const {
  generateKey, isValidKeyForItem, isValidKeyFormat, generateRandomDocument,
} = require('../src/utils/utils');
const { documentSchema } = require('../src/models/validation');

describe('Utils Tests', () => {
  it('should generate a valid document', () => {
    const doc = generateRandomDocument();
    expect(doc).to.be.an('object');
    expect(doc.type).to.equal('document');
    // expect(doc.id).to.be.a('string');
    // expect(doc.id).to.have.lengthOf(16);
    expect(doc.owner).to.be.a('string');
    expect(doc.owner).to.have.lengthOf(16);
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
    expect(doc1.id).to.not.equal(doc2.id);
    expect(doc1.owner).to.not.equal(doc2.owner);
    expect(doc1.timestamp).to.not.equal(doc2.timestamp);
    expect(doc1.title).to.not.equal(doc2.title);
    /* etc */
  });

  it('should generate a valid hash', () => {
    const doc = generateRandomDocument();
    const key = doc.id;
    expect(isValidKeyFormat(key)).to.be.true;
    expect(isValidKeyForItem(key, doc)).to.be.true;
  });

  it('should not generate a valid hash', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();
    const key = doc1.id;
    expect(isValidKeyForItem(key, doc1)).to.be.true;
    expect(isValidKeyForItem(key, doc2)).to.be.false;
  });

  it('should not accept wrong key', () => {
    const doc = generateRandomDocument();
    const key = '123456789ABCDEF';
    expect(isValidKeyForItem(key, doc)).to.be.false;
    expect(isValidKeyFormat(key)).to.be.false;
  });

  it('should generate a consistent hash for same data', () => {
    const doc = generateRandomDocument();
    // We are hashing a generated doc so the key will not match the id
    // But key1 and key2 should be the same
    const key1 = generateKey(doc);
    const key2 = generateKey(doc);
    expect(key1).to.equal(key2);
    expect(key1).to.not.equal(key1.id);
  });

  it('should generate a different hash for different data', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();
    const key1 = generateKey(doc1);
    const key2 = generateKey(doc2);
    expect(key1).to.not.equal(key2);
  });

  it('should generate the same hash for different object with same data', () => {
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
  /*
  const key1 = "1a2b3c4d5e6f7g8h"; // Invalid: contains non-hex characters
  const key2 = "1a2b3c4d5e6f7h8"; // Valid: 16 hex characters
  const key3 = "1a2b3c4d5e6f7h8i9"; // Invalid: more than 16 characters

  console.log(isValidKeyForItem(kisValidKeyFormat, ey1)); // Output: false
  console.log(isValidKeyForItem(kisValidKeyFormat, ey2)); // Output: true
  console.log(isValidKeyForItem(kisValidKeyFormat, ey3)); // Output: false
  */
});
