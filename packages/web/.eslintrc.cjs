module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Poka-yoke: Ban raw fetch() to prevent authentication bypass
    // All API calls must use apiClient which enforces auth token
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message:
          'Use apiClient from ../api/client instead of raw fetch(). ' +
          'Raw fetch() bypasses authentication token injection. ' +
          'Add endpoint functions to ../api/endpoints.ts if needed.',
      },
    ],
  },
};
