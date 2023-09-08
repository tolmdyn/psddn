const { askQuestion, setReadline } = require('./termUtils');
const client = require('../../client');

async function initUserSession(rl, user, secret) {
  setReadline(rl);

  if (user && secret) {
    try {
      const userSession = await client.loginUser(user, secret);
      if (userSession) {
        return userSession;
      }
    } catch (err) {
      console.log('Invalid user key or password.');
    }
  }

  console.log('Would you like to CREATE a new user session or LOGIN to an existing one?');
  const choice = await askQuestion('Please enter "create" or "login": ');

  try {
    const userSession = await handleChoice(choice, rl);
    if (userSession) {
      return userSession;
    }
  } catch (err) {
    console.log('Invalid user key or password.');
  }

  // loop until valid choice, could replace with while loop
  return initUserSession(rl, null, null);
}

async function handleChoice(choice) {
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

  console.log('Invalid choice.');
  return null;
}

module.exports = {
  initUserSession,
};
