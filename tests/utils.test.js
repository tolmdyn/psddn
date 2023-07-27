/**
 * @desciption Test for util functions
 */

const { expect } = require('chai');

const { getHash, isValidKey, generateRandomDocument } = require('../src/utils/utils');
const { documentSchema } = require('../src/models/validation');

describe('Utils Tests', () => {
  it('should generate a valid document', () => {
    const doc = generateRandomDocument();
    expect(doc).to.be.an('object');
    expect(doc.type).to.equal('document');
    expect(doc.id).to.be.a('string');
    expect(doc.id).to.have.lengthOf(16);
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
    const key = getHash(doc);
    expect(isValidKey(key, doc)).to.be.true;
  });

  it('should not generate a valid hash', () => {
    const doc = generateRandomDocument();
    const key = getHash(doc);
    expect(isValidKey(key, 'invalid')).to.be.false;
  });

  it('should generate a consistent hash for same data', () => {
    const doc = generateRandomDocument();
    const key1 = getHash(doc);
    const key2 = getHash(doc);
    expect(key1).to.equal(key2);
  });

  it('should generate a different hash for different data', () => {
    const doc1 = generateRandomDocument();
    const doc2 = generateRandomDocument();
    const key1 = getHash(doc1);
    const key2 = getHash(doc2);
    expect(key1).to.not.equal(key2);
  });

  it('should generate the same hash for different object with same data', () => {
    const doc1 = generateRandomDocument();
    const doc2 = { ...doc1 };
    const key1 = getHash(doc1);
    const key2 = getHash(doc2);
    expect(key1).to.equal(key2);
  });

  it('should generate the same hash for same object with different order', () => {
    const doc1 = {
      type: 'document',
      id: '1234567890123456',
      owner: '1234567890123456',
      timestamp: '2021-03-01T00:00:00.000Z',
      title: 'Lorem ipsum dolor sit amet',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.',
      tags: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
    };

    const doc2 = {
      id: '1234567890123456',
      type: 'document',
      owner: '1234567890123456',
      timestamp: '2021-03-01T00:00:00.000Z',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. Sed sit amet ipsum mauris.',
      tags: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
      title: 'Lorem ipsum dolor sit amet',
    };

    expect(doc1).to.deep.equal(doc2);
    // order of keys is different, so string is different.
    // Therefore hashing the string is bad because it's not consistent.
    // The hash of the object must be consistent.
    expect(JSON.stringify(doc1)).to.not.equal(JSON.stringify(doc2));
    expect(getHash(JSON.stringify(doc1))).to.not.equal(JSON.stringify(doc2));

    const key1 = getHash(doc1);
    const key2 = getHash(doc2);

    expect(key1).to.equal(key2);
  });
});
