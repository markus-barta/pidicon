module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0, 'always'], // Disable 100-character limit
    'footer-max-line-length': [0, 'always'], // Also disable footer limit
  },
};
