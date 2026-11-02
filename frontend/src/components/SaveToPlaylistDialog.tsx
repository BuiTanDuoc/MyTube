import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playlistsApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import type { Paged, PlaylistDto, Visibility } from '../api/types';
import { usePlaylistTitle } from '../lib/playlist';
import Dialog from './Dialog';
import Spinner from './Spinner';
import { useToast } from './Toast';
import VisibilityIcon from './VisibilityIcon';

interface Props {
  videoId: string;
  open: boolean;
  onClose: () => void;
}

/** "Save to..." dialog: tick playlists to add / remove the video, or create a new one on the spot. */
export default function SaveToPlaylistDialog({ videoId, open, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} title={t('playlists.saveTo')} onClose={onClose}>
      <SaveList videoId={videoId} />
    </Dialog>
  );
}

function SaveList({ videoId }: { videoId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const titleOf = usePlaylistTitle();
  const key = ['playlists', 'mine', videoId] as const;

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('Private');

  const { data, isPending, isError } = useQuery({ queryKey: key, queryFn: () => playlistsApi.mine(videoId), gcTime: 0 });

  const refreshOthers = () => {
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    void queryClient.invalidateQueries({ queryKey: ['playlist'] });
    void queryClient.invalidateQueries({ queryKey: ['playlist-items'] });
    void queryClient.invalidateQueries({ queryKey: ['playlist-queue'] });
  };

  const toggle = useMutation({
    mutationFn: async ({ playlist, add }: { playlist: PlaylistDto; add: boolean }) => {
      if (add) await playlistsApi.addItem(playlist.id, videoId);
      else await playlistsApi.removeVideo(playlist.id, videoId);
    },
    onMutate: async ({ playlist, add }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Paged<PlaylistDto>>(key);
      queryClient.setQueryData<Paged<PlaylistDto>>(key, (old) =>
        old ? { ...old, items: old.items.map((p) => (p.id === playlist.id ? { ...p, containsVideo: add } : p)) } : old
      );
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(parseError(e).message);
    },
    onSettled: refreshOthers
  });

  const create = useMutation({
    mutationFn: async () => {
      const playlist = await playlistsApi.create({ title: name.trim(), description: null, visibility });
      await playlistsApi.addItem(playlist.id, videoId);
      return playlist;
    },
    onSuccess: () => {
      toast.success(t('playlists.savedTo'));
      setCreating(false);
      setName('');
      void queryClient.invalidateQueries({ queryKey: key });
      refreshOthers();
    },
    onError: (e) => toast.error(parseError(e).message)
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) create.mutate();
  };

  if (isPending) return <Spinner />;
  if (isError || !data) return <p className="field__error">{t('errors.loadFailed')}</p>;

  return (
    <>
      <ul className="save-list">
        {data.items.map((p) => (
          <li key={p.id}>
            <label>
              <input
                type="checkbox"
                checked={!!p.containsVideo}
                disabled={toggle.isPending}
                onChange={(e) => toggle.mutate({ playlist: p, add: e.target.checked })}
              />
              <span className="save-list__name">{titleOf(p)}</span>
              <VisibilityIcon visibility={p.visibility} />
            </label>
          </li>
        ))}
      </ul>

      {creating ? (
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="new-pl">{t('playlists.name')}</label>
            <input id="new-pl" className="input" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="new-pl-vis">{t('upload.visibility')}</label>
            <select id="new-pl-vis" className="select" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="Private">{t('visibility.Private')}</option>
              <option value="Unlisted">{t('visibility.Unlisted')}</option>
              <option value="Public">{t('visibility.Public')}</option>
            </select>
          </div>
          <div className="form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn--primary" disabled={create.isPending || !name.trim()}>
              {t('playlists.createAndSave')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn--block" style={{ marginTop: 16 }} onClick={() => setCreating(true)}>
          <Plus size={18} /> {t('playlists.new')}
        </button>
      )}
    </>
  );
}
