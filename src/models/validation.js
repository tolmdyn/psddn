/**
 * @file Joi validation schemas for different objects. Used to validate items.
 * @module JoiSchemas
 * @requires joi
 * @todo Split into separate files, Add regex validations for strings
 */

const { userSchema } = require('./user');
const { feedSchema } = require('./feed');
const { documentSchema } = require('./document');
const { userProfileSchema } = require('./userProfile');

/**
 * Generic function to validate any item.
 * @param {*} item The item to validate (User, Feed, Document)
 * @returns True if the item is valid, false otherwise
 */
function validateItem(item) {
  if (!item) {
    return false;
  }

  if (item.type === 'document') {
    return documentSchema.validate(item);
  }

  if (item.type === 'user') {
    return userSchema.validate(item);
  }

  if (item.type === 'feed') {
    return feedSchema.validate(item);
  }

  if (item.type === 'userProfile') {
    return userProfileSchema.validate(item);
  }
  return false;
}

module.exports = {
  validateItem,
};
