module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    mocha: true,
  },
  extends: ['eslint:recommended', 'airbnb'],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js'] }],
  },
};
