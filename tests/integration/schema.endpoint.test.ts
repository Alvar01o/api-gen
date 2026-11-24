jest.mock('../../src/core/queue/queue', () => ({
  schemaQueue: {
    add: jest.fn().mockResolvedValue(true),
  },
}));


import request from 'supertest';
import app from '../../src/app';
import fs from 'fs';

describe('POST /schema/upload', () => {

  it('should reject invalid engine', async () => {
    const response = await request(app)
      .post('/schema/upload')
      .field('engine', 'oracle')
      .field('name', 'testdb');

    expect(response.status).toBe(400);
  });

  it('should accept valid request', async () => {

    const path = '/tmp/test.sql';
    fs.writeFileSync(path, 'CREATE TABLE test(id INT);');

    const response = await request(app)
      .post('/schema/upload')
      .field('engine', 'mysql')
      .field('name', 'testdb')
      .attach('schema', path);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

});