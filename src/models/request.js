/**
 * @description The Request class and the RequestTypes enum.
 */

/**
 * @description: Represents the type of a request
 * @enum {string}
 */
const RequestTypes = {
  Get: 'get',
  Put: 'put',
  Ping: 'ping',
  Message: 'message',
  Handshake: 'handshake',
};

/**
 * @description: Represents a request object
 * @class Request
 * @param {string} requestType - Type of request
 * @param {object} requestData - Request data
 */
class Request {
  constructor(requestType, requestData) {
    this.requestType = requestType;
    this.requestData = requestData;
  }
}

module.exports = { Request, RequestTypes };
