import { Link } from 'react-router-dom';
import { ListVideo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlaylistDto } from '../api/types';
import { usePlaylistTitle } from '../lib/playlist';
import { apiUrl } from '../lib/url';
import VisibilityIcon from './VisibilityIcon';

export default function PlaylistCard({ playlist }: { playlist: PlaylistDto }) {
  const { t } = useTranslation();
  const titleOf = usePlaylistTitle();

  return (
    <article className="pcard">
      <Link to={`/playlist/${playlist.id}`} className="pcard__thumb" aria-hidden="true" tabIndex={-1}>
        {playlist.thumbnailUrl ? <img src={apiUrl(playlist.thumbnailUrl)} alt="" loading="lazy" /> : <ListVideo size={40} />}
        <span className="pcard__count">
          <ListVideo size={14} /> {playlist.itemCount}
        </span>
      </Link>
      <h3 className="vcard__title">
        <Link to={`/playlist/${playlist.id}`}>{titleOf(playlist)}</Link>
      </h3>
      <p className="vcard__meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <VisibilityIcon visibility={playlist.visibility} size={14} />
        {t(`visibility.${playlist.visibility}`)} · {t('playlists.videoCount', { count: playlist.itemCount })}
      </p>
    </article>
  );
}
