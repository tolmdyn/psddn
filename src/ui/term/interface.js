/**
 * @fileoverview The terminal interface module. As basic as creating a readline instance
 * and handling the commands. All input and output is from the console / stdio.
 *
 * TODO: In a future iteration, we could use a library like blessed to create a more
 * interactive terminal UI, with windowing.
 * @memberof module:ui/term
 */

const readline = require('readline');

const { handleCommand } = require('./command');

/**
 * @description Create the readline interface and callback handler for commands.
 * @returns The readline instance
 * @memberof module:ui/term
 */
function createInterface() {
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
    rl.prompt();
  });

  return rl;
}

module.exports = {
  createInterface,
};
