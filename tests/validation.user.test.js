/**
 * @description: Test for user validations
 */

const { expect } = require('chai');

// import the user schema
const { userSchema } = require('../src/models/validation');
const { generateRandomUser } = require('../src/utils/utils');

describe('Model Validation Tests', () => {
  it('should validate a valid user', () => {
    const user = generateRandomUser();
    const { error } = userSchema.validate(user);
    console.log(error);
    expect(error).to.be.undefined;
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
