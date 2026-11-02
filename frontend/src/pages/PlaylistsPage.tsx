import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListVideo, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playlistsApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import EmptyState from '../components/EmptyState';
import PlaylistCard from '../components/PlaylistCard';
import PlaylistFormDialog from '../components/PlaylistFormDialog';
import Spinner from '../components/Spinner';

export default function PlaylistsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = `${t('playlists.title')} - MiniTube`;
  }, [t]);

  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ['playlists', 'mine'], queryFn: () => playlistsApi.mine() });

  return (
    <div className="lib">
      <div className="lib__head">
        <h1 className="page-title" style={{ margin: 0 }}>
          {t('playlists.title')}
        </h1>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          <Plus size={18} /> {t('playlists.new')}
        </button>
      </div>

      {isPending && <Spinner />}

      {isError && (
        <EmptyState
          title={t('errors.loadFailed')}
          hint={parseError(error).message}
          action={
            <button className="btn btn--primary" onClick={() => void refetch()}>
              {t('common.retry')}
            </button>
          }
        />
      )}

      {data && data.items.length === 0 && <EmptyState icon={<ListVideo size={56} />} title={t('playlists.empty')} hint={t('playlists.emptyHint')} />}

      {data && data.items.length > 0 && (
        <div className="video-grid">
          {data.items.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      )}

      <PlaylistFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['playlists'] })}
      />
    </div>
  );
}
