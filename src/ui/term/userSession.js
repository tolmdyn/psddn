const chalk = require('chalk');

const { askQuestion, setReadline } = require('./termUtils');
const client = require('../../client');
const { shutdown } = require('../../utils/shutdown');

/**
 * @description User Session UI handling function
 * @param {*} user The user key to login with (optional)
 * @param {*} secret The user password to login with (optional)
 * @returns The user session object (or null if login failed)
 */
async function initUserSession(rl, user, secret) {
  setReadline(rl);

  if (user && secret) {
    try {
      const userSession = await client.loginUser(user, secret);
      if (userSession) {
        return userSession;
      }
    } catch (err) {
      console.log(chalk.red('Invalid user key or password.'));
    }
  }

  console.log('Would you like to CREATE a new user session or LOGIN to an existing one?');
  rl.prompt();
  const choice = await askQuestion(`Please enter ${chalk.greenBright('\'create\'')} or ${chalk.greenBright('\'login\'')}: `);

  try {
    const userSession = await handleChoice(choice, rl);
    if (userSession) {
      return userSession;
    }
  } catch (err) {
    console.log(chalk.red('Invalid user key or password.'));
  }

  // loop until valid choice, could replace with while loop
  return initUserSession(rl, null, null);
}

/**
 * @description Handles the user's choice of CREATE or LOGIN for the userSession.
 * @param {*} choice The user's choice
 * @returns The user session object (or null if login failed)
 */
async function handleChoice(choice) {
  if (choice === 'exit') {
    shutdown('Shutting down...');
  }

  if (choice === 'create') {
    const nickname = await askQuestion('Enter a nickname: ');
    const password = await askQuestion('Enter a password: ');
    return client.loginNewUser(nickname, password);
  }

  if (choice === 'login') {
    const key = await askQuestion('Enter your key: ');
    const password = await askQuestion('Enter your password: ');
    return client.loginUser(key, password);
  }

  console.log(chalk.red('Invalid choice.'));
  return null;
}

module.exports = {
  initUserSession,
};
