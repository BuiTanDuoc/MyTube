import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { playlistsApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import type { PlaylistDto, Visibility } from '../api/types';
import Dialog from './Dialog';
import { useToast } from './Toast';

interface Props {
  open: boolean;
  /** Pass the playlist to edit it; omit to create a new one. */
  playlist?: PlaylistDto;
  onClose: () => void;
  onSaved: (playlist: PlaylistDto) => void;
}

export default function PlaylistFormDialog({ open, playlist, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} title={playlist ? t('playlists.editTitle') : t('playlists.newTitle')} onClose={onClose}>
      <Form playlist={playlist} onClose={onClose} onSaved={onSaved} />
    </Dialog>
  );
}

function Form({ playlist, onClose, onSaved }: Omit<Props, 'open'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const [title, setTitle] = useState(playlist?.title ?? '');
  const [description, setDescription] = useState(playlist?.description ?? '');
  const [visibility, setVisibility] = useState<Visibility>(playlist?.visibility ?? 'Private');

  const save = useMutation({
    mutationFn: () => {
      const body = { title: title.trim(), description: description.trim() || null, visibility };
      return playlist ? playlistsApi.update(playlist.id, body) : playlistsApi.create(body);
    },
    onSuccess: (saved) => {
      toast.success(playlist ? t('playlists.saved') : t('playlists.created'));
      onSaved(saved);
      onClose();
    },
    onError: (e) => toast.error(parseError(e).message)
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) save.mutate();
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="pl-title">{t('playlists.name')}</label>
        <input id="pl-title" className="input" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="pl-desc">{t('upload.description')}</label>
        <textarea id="pl-desc" className="textarea" value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pl-vis">{t('upload.visibility')}</label>
        <select id="pl-vis" className="select" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
          <option value="Private">{t('visibility.Private')} - {t('visibility.PrivateHint')}</option>
          <option value="Unlisted">{t('visibility.Unlisted')} - {t('visibility.UnlistedHint')}</option>
          <option value="Public">{t('visibility.Public')} - {t('visibility.PublicHint')}</option>
        </select>
      </div>
      <div className="form-actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button className="btn btn--primary" disabled={save.isPending || !title.trim()}>
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}
