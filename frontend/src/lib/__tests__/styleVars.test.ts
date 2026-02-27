import { describe, expect, it } from 'vitest';
import { toStyleVars } from '@/lib/styleVars';

describe('toStyleVars', () => {
  it('converts css variable map into style object', () => {
    const style = toStyleVars({
      '--x': '10px',
      '--y': 42,
    });

    expect(style['--x']).toBe('10px');
    expect(style['--y']).toBe('42');
  });

  it('omits undefined and null values', () => {
    const style = toStyleVars({
      '--a': 'ok',
      '--b': undefined,
      '--c': null,
    });

    expect(style['--a']).toBe('ok');
    expect(style['--b']).toBeUndefined();
    expect(style['--c']).toBeUndefined();
  });
});
