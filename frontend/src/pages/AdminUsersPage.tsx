import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, LockOpen, RefreshCw, ShieldCheck, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import type { AdminUser } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteSentinel } from '../hooks/useInfiniteSentinel';
import { useFormatters } from '../lib/format';
import { nextPage } from '../lib/paging';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const fmt = useFormatters();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search.trim(), 300);

  useEffect(() => {
    document.title = `${t('admin.title')} - MiniTube`;
  }, [t]);

  const list = useInfiniteQuery({
    queryKey: ['admin-users', debounced],
    queryFn: ({ pageParam }) => adminApi.users(pageParam, debounced),
    initialPageParam: 1,
    getNextPageParam: nextPage
  });

  const sentinel = useInfiniteSentinel(() => {
    if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
  }, !!list.hasNextPage);

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const lock = useMutation({
    mutationFn: (v: { id: string; locked: boolean }) => adminApi.setLocked(v.id, v.locked),
    onSuccess: refresh,
    onError: (e) => toast.error(parseError(e).message)
  });

  const roles = useMutation({
    mutationFn: (v: { user: AdminUser; admin: boolean }) =>
      adminApi.setRoles(v.user.id, v.admin ? [...new Set([...v.user.roles, 'Admin'])] : v.user.roles.filter((r) => r !== 'Admin')),
    onSuccess: refresh,
    onError: (e) => toast.error(parseError(e).message)
  });

  const reindex = useMutation({
    mutationFn: () => adminApi.reindexSearch(),
    onSuccess: (r) => toast.success(t('admin.reindexed', { videos: r.videos, users: r.users })),
    onError: (e) => toast.error(parseError(e).message)
  });

  const users = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.totalCount;

  return (
    <div className="studio">
      <div className="studio__head">
        <h1 className="page-title" style={{ margin: 0 }}>
          {t('admin.title')}
          {total !== undefined && <span className="muted" style={{ fontSize: 16, fontWeight: 400 }}> · {total}</span>}
        </h1>
        <button className="btn" onClick={() => reindex.mutate()} disabled={reindex.isPending} title={t('admin.reindexHint')}>
          <RefreshCw size={16} /> {t('admin.reindex')}
        </button>
      </div>

      <div className="field" style={{ maxWidth: 420 }}>
        <label htmlFor="admin-search">{t('admin.search')}</label>
        <input id="admin-search" className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.isPending && <Spinner />}
      {list.isSuccess && users.length === 0 && <EmptyState title={t('admin.noUsers')} />}

      <div className="studio__list">
        {users.map((u) => {
          const isMe = u.id === me?.id;
          const isAdmin = u.roles.includes('Admin');
          return (
            <article key={u.id} className="user-row">
              <Avatar name={u.displayName} size={44} />
              <div style={{ minWidth: 0 }}>
                <div className="studio-row__title">
                  {u.displayName} <span className="muted">@{u.userName}</span>
                </div>
                <div className="studio-row__meta">
                  <span>{u.email}</span>
                  {!u.emailConfirmed && <span className="badge badge--busy">{t('settings.unverified')}</span>}
                  {isAdmin && <span className="badge badge--ok">{t('admin.roleAdmin')}</span>}
                  {u.isLockedOut && <span className="badge badge--bad">{t('admin.locked')}</span>}
                  <span>{fmt.date(u.createdAt)}</span>
                </div>
              </div>
              <div className="studio-row__actions">
                <button className="btn btn--sm" disabled={isMe || roles.isPending} onClick={() => roles.mutate({ user: u, admin: !isAdmin })}>
                  {isAdmin ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                  {isAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                </button>
                <button className="btn btn--sm" disabled={isMe || lock.isPending} onClick={() => lock.mutate({ id: u.id, locked: !u.isLockedOut })}>
                  {u.isLockedOut ? <LockOpen size={15} /> : <Lock size={15} />}
                  {u.isLockedOut ? t('admin.unlock') : t('admin.lock')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div ref={sentinel} className="load-more">
        {list.isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
