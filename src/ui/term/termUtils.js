/**
 * @fileoverview Utility functions for terminal UI
 * @memberof module:ui/term
 */

const chalk = require('chalk');

let rl = null;

function setReadline(readline) {
  rl = readline;
}

/**
 * @description Parses a JSON string into an object.
 * @param {string} item The JSON string to parse.
 * @returns {object} The parsed object.
 * @memberof module:ui/term
 */
function parseItem(item) {
  try {
    return JSON.parse(item);
  } catch (err) {
    console.log('Error parsing item.');
    return null;
  }
}

/**
 * @description Promisified readline.question function.
 * This seems a bit convoluted and could be refactored.
 * @param {*} question The question to ask
 * @returns {Promise<string>} The user's answer
 * @memberof module:ui/term
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * @description Formats an array of documents into a "nice" printable string.
 * @param {array} documents The array of documents to format.
 * @returns {string} The formatted string.
 * @memberof module:ui/term
 */
function formatDocuments(documents) {
  let result = ('-----------------------------------\n');

  // Format and print the documents, add colours
  documents.forEach((document, index) => {
    const formattedTimestamp = new Date(document.timestamp);
    result += `Document ${index + 1}:\n`;
    result += `  Owner: ${chalk.blue(`${document.owner}\n`)}`;
    result += `  Title: ${chalk.yellow(`${document.title}`)}`;
    result += ` Timestamp: ${chalk.yellow(`${formattedTimestamp.toLocaleDateString()} ${formattedTimestamp.toLocaleTimeString()}\n`)}`;
    result += `  Content: ${chalk.green(`${document.content}\n`)}`;
    // Add more properties as needed
    result += ('-----------------------------------\n');
  });

  // what if there are no results?
  return result;
}

module.exports = {
  setReadline,
  askQuestion,
  parseItem,
  formatDocuments,
};
