/**
 * @description: Test for feed validations
 */

const { expect } = require('chai');

// import the document schema
const { feedSchema } = require('../src/models/feed');
const { generateRandomFeed } = require('./scripts/generate');

describe('Feed Validation Tests', () => {
  it('should validate a valid feed', () => {
    const feed = generateRandomFeed(); // Function tested in utils tests
    const { error } = feedSchema.validate(feed);
    expect(error).to.be.undefined;
  });
});
