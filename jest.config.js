module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/__tests__/services/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  testPathIgnorePatterns: [
    '/supabase/functions/_tests/',
    '/__tests__/App.test.tsx',
  ],
};
