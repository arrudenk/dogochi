module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Тільки чисті модулі — вони не тягнуть react-native і тестуються без пристрою.
  testMatch: [
    '<rootDir>/src/core/**/__tests__/**/*.test.ts',
    '<rootDir>/src/store/**/__tests__/**/*.test.ts',
    '<rootDir>/src/pixel/**/__tests__/**/*.test.ts',
  ],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
