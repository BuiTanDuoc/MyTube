import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, PauseCircle, PlayCircle, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { historyApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import VideoRow from '../components/VideoRow';
import { useInfiniteSentinel } from '../hooks/useInfiniteSentinel';
import { nextPage } from '../lib/paging';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { user, reloadUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    document.title = `${t('history.title')} - MiniTube`;
  }, [t]);

  const list = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam }) => historyApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage
  });

  const sentinel = useInfiniteSentinel(() => {
    if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
  }, !!list.hasNextPage);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['history'] });
    void queryClient.invalidateQueries({ queryKey: ['feed'] }); // "continue watching" + recommendations
  };

  const remove = useMutation({
    mutationFn: async (videoId: string) => {
      await historyApi.remove(videoId);
    },
    onSuccess: refresh,
    onError: (e) => toast.error(parseError(e).message)
  });

  const clear = useMutation({
    mutationFn: async () => {
      await historyApi.clear();
    },
    onSuccess: () => {
      setConfirmClear(false);
      toast.success(t('history.cleared'));
      refresh();
    },
    onError: (e) => toast.error(parseError(e).message)
  });

  const pause = useMutation({
    mutationFn: (paused: boolean) => historyApi.setPaused(paused),
    onSuccess: () => reloadUser(),
    onError: (e) => toast.error(parseError(e).message)
  });

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const paused = !!user?.watchHistoryPaused;

  return (
    <div className="lib">
      <div className="lib__head">
        <h1 className="page-title" style={{ margin: 0 }}>
          {t('history.title')}
        </h1>
        <div className="lib__tools">
          <button className="btn" onClick={() => pause.mutate(!paused)} disabled={pause.isPending}>
            {paused ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
            {paused ? t('history.turnOn') : t('history.pause')}
          </button>
          <button className="btn" onClick={() => setConfirmClear(true)} disabled={items.length === 0}>
            <Trash2 size={18} /> {t('history.clearAll')}
          </button>
        </div>
      </div>

      {paused && (
        <div className="alert alert--warn" role="status">
          {t('history.pausedNotice')}
        </div>
      )}

      {list.isPending && <Spinner />}

      {list.isSuccess && items.length === 0 && (
        <EmptyState icon={<History size={56} />} title={t('history.empty')} hint={t('history.emptyHint')} />
      )}

      <div className="search__list">
        {items.map((it) => (
          <VideoRow
            key={it.video.id}
            video={it.video}
            variant="large"
            progress={it.completed ? 1 : it.video.durationSeconds > 0 ? it.positionSeconds / it.video.durationSeconds : undefined}
            actions={
              <button className="icon-btn" aria-label={t('history.remove')} title={t('history.remove')} onClick={() => remove.mutate(it.video.id)}>
                <X size={20} />
              </button>
            }
          />
        ))}
      </div>
      <div ref={sentinel} className="load-more">
        {list.isFetchingNextPage && <Spinner />}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={t('history.clearTitle')}
        message={t('history.clearConfirm')}
        confirmLabel={t('history.clearAll')}
        danger
        busy={clear.isPending}
        onConfirm={() => clear.mutate()}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
