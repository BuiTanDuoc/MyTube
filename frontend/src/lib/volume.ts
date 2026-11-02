const KEY = 'mt.volume';

export interface VolumeState {
  volume: number; // 0..1
  muted: boolean;
}

export function loadVolume(): VolumeState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<VolumeState>;
    if (typeof v.volume !== 'number' || !Number.isFinite(v.volume)) return null;
    return { volume: Math.min(1, Math.max(0, v.volume)), muted: !!v.muted };
  } catch {
    return null;
  }
}

export function saveVolume(state: VolumeState) {
  try {
    const next = JSON.stringify(state);
    if (localStorage.getItem(KEY) !== next) localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable (private mode, quota): the setting just won't persist */
  }
}

export const VOLUME_STORAGE_KEY = KEY;
