module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    // Customize based on your needs
    'no-console': 'off', // Allow console in Electron
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'arrow-body-style': 'off',
    'prefer-arrow-callback': 'off',
    'func-names': 'off',
    'no-param-reassign': ['error', { props: false }],
    'consistent-return': 'off',
    'max-len': ['error', { code: 120, ignoreComments: true }],
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};
