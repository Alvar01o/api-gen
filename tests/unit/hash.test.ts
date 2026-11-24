import fs from 'fs';
import { sha256File } from '../../src/shared/hash';

describe('SHA256 file hash', () => {

  it('should generate consistent hash', async () => {
    const path = '/tmp/test.sql';
    fs.writeFileSync(path, 'CREATE TABLE x(id INT);');

    const hash1 = await sha256File(path);
    const hash2 = await sha256File(path);

    expect(hash1).toBe(hash2);
  });

});