import { beforeEach, describe, expect, it } from 'vitest';
import { loadVolume, saveVolume } from './volume';

describe('volume persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips volume and mute', () => {
    expect(loadVolume()).toBeNull();
    saveVolume({ volume: 0.35, muted: true });
    expect(loadVolume()).toEqual({ volume: 0.35, muted: true });
  });

  it('ignores corrupt data and clamps out-of-range values', () => {
    localStorage.setItem('mt.volume', 'nope');
    expect(loadVolume()).toBeNull();
    localStorage.setItem('mt.volume', JSON.stringify({ volume: 5, muted: false }));
    expect(loadVolume()?.volume).toBe(1);
  });
});
