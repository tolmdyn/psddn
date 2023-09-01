const { askQuestion, setReadline } = require('./termUtils');
const client = require('../../client/client');

async function initUserSession(rl, user, secret) {
  setReadline(rl);

  if (user && secret) {
    const userSession = await client.loginUser(user, secret);
    return userSession;
  }

  console.log('Would you like to CREATE a new user session or LOGIN to an existing one?');
  const choice = await askQuestion('Please enter "create" or "login": ');

  if (choice === 'create') {
    const nickname = await askQuestion('Enter a nickname: ');
    const password = await askQuestion('Enter a password: ');
    const userSession = await client.loginNewUser(nickname, password);
    return userSession;
  }

  if (choice === 'login') {
    const key = await askQuestion('Enter your key: ');
    const password = await askQuestion('Enter your password: ');
    const userSession = await client.loginUser(key, password);
    return userSession;
  }

  console.log('Invalid choice.');

  // loop until valid choice, could replace with while loop
  return initUserSession(rl, user, secret);
}

module.exports = {
  initUserSession,
};
