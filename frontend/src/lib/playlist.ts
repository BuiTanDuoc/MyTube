import { useTranslation } from 'react-i18next';
import type { PlaylistKind } from '../api/types';

/** The built-in "Watch later" playlist is stored with a fixed English title; show it in the user's language. */
export function usePlaylistTitle() {
  const { t } = useTranslation();
  return (p: { kind: PlaylistKind; title: string }) => (p.kind === 'WatchLater' ? t('playlists.watchLater') : p.title);
}
