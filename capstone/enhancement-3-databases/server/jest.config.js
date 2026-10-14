/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  // The seq submit integration test boots a real in-memory mongod
  // (mongodb-memory-server) — first-time binary resolution alone can take
  // several seconds, well past Jest's 5s default.
  testTimeout: 30_000,
};
