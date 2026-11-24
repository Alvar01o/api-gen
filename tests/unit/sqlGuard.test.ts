import { validateSqlContent } from '../../src/shared/sqlGuard.service';

describe('SQL Guard', () => {

  beforeEach(() => {
    process.env.SCHEMA_ENABLE_SQL_GUARD = 'true';
    process.env.SCHEMA_FORBIDDEN_KEYWORDS = 'DROP DATABASE';
  });

  it('should throw on forbidden keyword', () => {
    expect(() =>
      validateSqlContent('DROP DATABASE test;')
    ).toThrow();
  });

  it('should pass safe sql', () => {
    expect(() =>
      validateSqlContent('CREATE TABLE test(id INT);')
    ).not.toThrow();
  });

});