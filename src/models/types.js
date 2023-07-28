/**
* @description: Represents the type of an item in the database.
*/
const Types = {
  Feed: 'feed',
  User: 'user',
  Document: 'document',
};

/**
 * @description: Checks if the given type is a valid item type
 * @param {*} type - Type to check
 * @returns {boolean} True if the type is valid, false otherwise
 */
function isValidItemType(type) {
  return Object.values(Types).includes(type);
}

// const { Feed, User, Document } = Types;

module.exports = { Types, isValidItemType };
