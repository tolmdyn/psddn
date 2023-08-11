/**
 * @description: Test for user validations
 */

const { expect } = require('chai');

// import the user schema
const { userSchema } = require('../src/models/validation');
const { generateRandomUser } = require('../src/utils/utils');

describe('User Validation Tests', () => {
  it('should validate a valid user with all fields correct', () => {
    const user = generateRandomUser();
    const { error } = userSchema.validate(user);
    expect(error).to.be.undefined;
  });

  it('should validate a valid user with "optional" fields null', () => {
    const user = generateRandomUser();

    user.lastAddress = null;
    user.lastSeen = null;
    user.nickname = null;

    const { error } = userSchema.validate(user);
    expect(error).to.be.undefined;
  });

  it('should not validate a valid user with empty "optional" parameters', () => {
    const user = generateRandomUser();

    const invalidUser = {
      type: user.type,
      publicKey: user.publicKey,
      nickname: '',
      lastSeen: '',
      lastFeed: '',
    };

    const { error } = userSchema.validate(invalidUser);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a valid user with parameters not defined', () => {
    const user = generateRandomUser();

    // for each key in the user object, delete it and test validation
    Object.keys(user).forEach((key) => {
      const invalidUser = { ...user };
      delete invalidUser[key];
      const { error } = userSchema.validate(invalidUser);
      expect(error).to.not.be.undefined;
    });
  });

  it('should not validate a user with an invalid type', () => {
    const user = generateRandomUser();
    user.type = 'invalid';
    const { error } = userSchema.validate(user);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a user with an invalid public key', () => {
    const user = generateRandomUser();
    user.publicKey = 'invalid';
    const { error } = userSchema.validate(user);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a user with an invalid public key', () => {
    const user = generateRandomUser();
    user.publicKey = 123;
    const { error } = userSchema.validate(user);
    expect(error).to.not.be.undefined;
  });

  it('should not validate a user with an invalid nickname', () => {
    const user = generateRandomUser();
    user.nickname = 1;
    const { error } = userSchema.validate(user);
    expect(error).to.not.be.undefined;
  });
});
