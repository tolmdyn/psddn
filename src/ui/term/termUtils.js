/**
 * @description Utility functions for terminal UI
 */

const chalk = require('chalk');

let rl = null;

function setReadline(readline) {
  rl = readline;
}

function parseItem(item) {
  try {
    return JSON.parse(item);
  } catch (err) {
    console.log('Error parsing item.');
    return null;
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

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
