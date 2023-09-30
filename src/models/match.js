/**
 * @fileoverview Regular expressions for key validation
 */

const keyRegex = /^[A-Za-z0-9+/]{43,46}(={0,2})$/;
const longKeyRegex = /^[A-Za-z0-9+=/]{88}$/;

module.exports = {
  keyRegex,
  longKeyRegex,
};
