/**
 * @fileoverview This file defines the Response class and the ResponseTypes enum
 * for usage by the server and client modules.
 */

/**
 * @description: Represents the type of a response
 * @enum {string}
 */
const ResponseTypes = {
  Success: 'success',
  Error: 'error',
};

/**
 * @description: Represents a response object
 * @class Response
 * @param {string} type - Type of response
 * @param {string} data - Response message/content
 */
class Response {
  constructor(type, data) {
    this.responseType = type;
    this.responseData = data;
  }
}

module.exports = { Response, ResponseTypes };
