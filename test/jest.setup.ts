// test/jest.setup.ts
import '../src/polyfill';

global.console = {
  ...global.console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
