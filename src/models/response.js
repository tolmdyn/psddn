/**
 * @description The Response class and the ResponseTypes enum.
 */

/**
 * @description Represents the type of a response
 * @enum {string}
 */
const ResponseTypes = {
  Success: 'success',
  Error: 'error',
};

/**
 * @description Represents a response object
 * @class Response
 * @param {string} responseType - Type of response
 * @param {string} responseData - Response message/content
 */
class Response {
  constructor(responseType, responseData) {
    this.responseType = responseType;
    this.responseData = responseData;
  }
}

module.exports = { Response, ResponseTypes };
