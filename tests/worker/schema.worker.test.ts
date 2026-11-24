jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    on: (event: string, cb: any) => {
      if (event === 'close') cb(0);
    },
    stderr: { on: jest.fn() },
    stdin: { on: jest.fn() },
  })),
}));

describe('schema worker', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});