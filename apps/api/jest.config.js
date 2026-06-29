/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.module.ts', '!main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // Native addons (e.g. @node-rs/argon2) keep a libuv threadpool alive after
  // tests finish, which Jest reports as a lingering worker. Exit cleanly once
  // all suites pass — there are no JS-level open handles (verified via
  // --detectOpenHandles).
  forceExit: true,
  moduleNameMapper: {
    '^@leadarrow/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
};
