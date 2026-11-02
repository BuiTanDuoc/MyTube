import { describe, expect, it } from 'vitest';
import { kindOfFile, maxBytesFor, MAX_AUDIO_BYTES, MAX_VIDEO_BYTES } from './media';

describe('media helpers', () => {
  it('detects the kind from the extension, case-insensitively', () => {
    expect(kindOfFile('holiday.MP4')).toBe('Video');
    expect(kindOfFile('song.mp3')).toBe('Audio');
    expect(kindOfFile('Track 01.FLAC')).toBe('Audio');
    expect(kindOfFile('voice.opus')).toBe('Audio');
  });

  it('rejects unsupported or missing extensions', () => {
    expect(kindOfFile('notes.txt')).toBeNull();
    expect(kindOfFile('noextension')).toBeNull();
  });

  it('uses a smaller size limit for audio', () => {
    expect(maxBytesFor('Audio')).toBe(MAX_AUDIO_BYTES);
    expect(maxBytesFor('Video')).toBe(MAX_VIDEO_BYTES);
    expect(MAX_AUDIO_BYTES).toBeLessThan(MAX_VIDEO_BYTES);
  });
});
