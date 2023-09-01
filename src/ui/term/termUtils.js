// Note: Utility functions for terminal UI

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

module.exports = {
  setReadline,
  askQuestion,
  parseItem,
};
