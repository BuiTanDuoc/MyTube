import type { MediaKind } from '../api/types';

// Keep in sync with Video:AllowedExtensions / Video:AllowedAudioExtensions and the size limits on the API.
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.mkv', '.webm', '.avi'];
export const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.oga', '.opus', '.wma'];
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // Video:MaxUploadBytes
export const MAX_AUDIO_BYTES = 500 * 1024 * 1024; // Video:MaxAudioUploadBytes

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  return i < 0 ? '' : fileName.slice(i).toLowerCase();
}

/** Decides from the file extension whether a file is a video or an audio track (null = not supported). */
export function kindOfFile(fileName: string): MediaKind | null {
  const ext = extensionOf(fileName);
  if (VIDEO_EXTENSIONS.includes(ext)) return 'Video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'Audio';
  return null;
}

export const maxBytesFor = (kind: MediaKind) => (kind === 'Audio' ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES);
