module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    mocha: true,
  },
  extends: ['eslint:recommended', 'airbnb'],
  overrides: [
    {
      files: ['**/*.test.js'],
      rules: {
        'no-unused-expressions': 'off',
        'no-unused-vars': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
    'no-use-before-define': ['error', { functions: false, classes: false }],
  },
};
