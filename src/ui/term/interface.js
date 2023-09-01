const readline = require('readline');

const { handleCommand } = require('./command');

async function createInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // print welcome message
  console.log('Welcome to the terminal interface!');

  rl.on('line', async (input) => {
    const command = input.trim();
    const result = await handleCommand(command);
    if (result) {
      console.log(result);
    }
  });

  return rl;
}

module.exports = {
  createInterface,
};
