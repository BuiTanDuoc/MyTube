import { DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, GripVertical, ListVideo, Pencil, Play, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playlistsApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import type { PlaylistItemDto } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import PlaylistFormDialog from '../components/PlaylistFormDialog';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import VideoRow from '../components/VideoRow';
import VisibilityIcon from '../components/VisibilityIcon';
import { useInfiniteSentinel } from '../hooks/useInfiniteSentinel';
import { nextPage } from '../lib/paging';
import { usePlaylistTitle } from '../lib/playlist';
import NotFoundPage from './NotFoundPage';

export default function PlaylistPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const titleOf = usePlaylistTitle();
  const viewer = user?.id ?? 'anon';

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const playlist = useQuery({ queryKey: ['playlist', id, viewer], queryFn: () => playlistsApi.get(id), retry: false, enabled: !!id });

  const items = useInfiniteQuery({
    queryKey: ['playlist-items', id, viewer],
    queryFn: ({ pageParam }) => playlistsApi.items(id, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: playlist.isSuccess
  });

  // Local copy of the order so a drag feels instant; the server answer re-syncs it
  const [order, setOrder] = useState<PlaylistItemDto[]>([]);
  useEffect(() => setOrder(items.data?.pages.flatMap((p) => p.items) ?? []), [items.data]);

  const sentinel = useInfiniteSentinel(() => {
    if (items.hasNextPage && !items.isFetchingNextPage) void items.fetchNextPage();
  }, !!items.hasNextPage);

  const refreshItems = () => {
    void queryClient.invalidateQueries({ queryKey: ['playlist-items', id] });
    void queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    void queryClient.invalidateQueries({ queryKey: ['playlist-queue'] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  };

  const move = useMutation({
    mutationFn: async (v: { itemId: string; afterItemId: string | null }) => {
      await playlistsApi.move(id, v.itemId, v.afterItemId);
    },
    onError: (e) => toast.error(parseError(e).message),
    onSettled: refreshItems
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await playlistsApi.removeItem(id, itemId);
    },
    onError: (e) => toast.error(parseError(e).message),
    onSettled: refreshItems
  });

  const deletePlaylist = useMutation({
    mutationFn: async () => {
      await playlistsApi.remove(id);
    },
    onSuccess: () => {
      toast.success(t('playlists.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      navigate('/playlists', { replace: true });
    },
    onError: (e) => toast.error(parseError(e).message)
  });

  const pl = playlist.data;
  const isOwner = !!pl && user?.id === pl.owner.id;
  const canManage = isOwner && pl?.kind === 'Custom';

  useEffect(() => {
    document.title = pl ? `${titleOf(pl)} - MyTube` : 'MyTube';
  }, [pl, titleOf]);

  // ---- reordering: drag and drop (mouse) + up/down buttons (keyboard, touch) ----
  const dragFrom = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    // The API wants "put it right after <item>" (null = top)
    move.mutate({ itemId: moved.itemId, afterItemId: to > 0 ? next[to - 1].itemId : null });
  };

  const onDragStart = (e: DragEvent, index: number) => {
    dragFrom.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index)); // Firefox needs data to start a drag
  };

  const onDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    const from = dragFrom.current;
    dragFrom.current = null;
    setOverIndex(null);
    if (from !== null) reorder(from, index);
  };

  if (playlist.isPending) return <Spinner />;
  if (playlist.isError || !pl) return <NotFoundPage />;

  const first = order[0];

  return (
    <div className="lib">
      <header className="plist-head">
        <div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>
            {titleOf(pl)}
          </h1>
          <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={`/channel/${pl.owner.id}`} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Avatar name={pl.owner.displayName} src={pl.owner.avatarUrl} size={24} />
              {pl.owner.displayName}
            </Link>
            · <VisibilityIcon visibility={pl.visibility} size={14} /> {t(`visibility.${pl.visibility}`)} · {t('playlists.videoCount', { count: pl.itemCount })}
          </p>
          {pl.description && <p className="channel__bio">{pl.description}</p>}
        </div>

        <div className="lib__tools">
          {first && (
            <Link to={`/watch/${first.video.id}?list=${pl.id}`} className="btn btn--primary">
              <Play size={18} fill="currentColor" /> {t('playlists.playAll')}
            </Link>
          )}
          {canManage && (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                <Pencil size={18} /> {t('common.edit')}
              </button>
              <button className="btn" onClick={() => setDeleting(true)}>
                <Trash2 size={18} /> {t('common.delete')}
              </button>
            </>
          )}
        </div>
      </header>

      {items.isPending && <Spinner />}

      {items.isSuccess && order.length === 0 && (
        <EmptyState icon={<ListVideo size={56} />} title={t('playlists.emptyPlaylist')} hint={isOwner ? t('playlists.emptyPlaylistHint') : undefined} />
      )}

      <ol className="plist">
        {order.map((it, i) => (
          <li
            key={it.itemId}
            className={`plist__row ${overIndex === i ? 'is-over' : ''}`}
            draggable={isOwner}
            onDragStart={(e) => onDragStart(e, i)}
            onDragOver={(e) => {
              if (dragFrom.current === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDragLeave={() => setOverIndex((cur) => (cur === i ? null : cur))}
            onDrop={(e) => onDrop(e, i)}
            onDragEnd={() => {
              dragFrom.current = null;
              setOverIndex(null);
            }}
          >
            <span className="plist__lead">
              {isOwner ? <GripVertical size={18} aria-hidden="true" className="plist__grip" /> : null}
              <span className="plist__index">{i + 1}</span>
            </span>
            <VideoRow
              video={it.video}
              listId={pl.id}
              actions={
                isOwner ? (
                  <>
                    <button className="icon-btn" aria-label={t('playlists.moveUp')} disabled={i === 0 || move.isPending} onClick={() => reorder(i, i - 1)}>
                      <ChevronUp size={20} />
                    </button>
                    <button className="icon-btn" aria-label={t('playlists.moveDown')} disabled={i === order.length - 1 || move.isPending} onClick={() => reorder(i, i + 1)}>
                      <ChevronDown size={20} />
                    </button>
                    <button className="icon-btn" aria-label={t('playlists.removeVideo')} title={t('playlists.removeVideo')} onClick={() => removeItem.mutate(it.itemId)}>
                      <X size={20} />
                    </button>
                  </>
                ) : undefined
              }
            />
          </li>
        ))}
      </ol>
      <div ref={sentinel} className="load-more">
        {items.isFetchingNextPage && <Spinner />}
      </div>

      <PlaylistFormDialog open={editing} playlist={pl} onClose={() => setEditing(false)} onSaved={refreshItems} />
      <ConfirmDialog
        open={deleting}
        title={t('playlists.deleteTitle')}
        message={t('playlists.deleteConfirm', { title: titleOf(pl) })}
        confirmLabel={t('common.delete')}
        danger
        busy={deletePlaylist.isPending}
        onConfirm={() => deletePlaylist.mutate()}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}
