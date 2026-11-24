import { expect } from '@jest/globals';

const regex = /^[a-zA-Z0-9_]{1,100}$/;

describe('Database name validation', () => {

  it('should accept valid names', () => {
    expect(regex.test('test_db')).toBe(true);
    expect(regex.test('DB123')).toBe(true);
  });

  it('should reject invalid names', () => {
    expect(regex.test('db-name')).toBe(false);
    expect(regex.test('db name')).toBe(false);
    expect(regex.test('db;DROP')).toBe(false);
  });

});