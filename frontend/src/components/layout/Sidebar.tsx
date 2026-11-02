import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, Flame, History, House, ListVideo, ThumbsUp, Upload, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  open: boolean;
  onNavigate: () => void;
}

export default function Sidebar({ open, onNavigate }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname, search } = useLocation();

  const tab = new URLSearchParams(search).get('tab');

  const items = [
    { to: '/', icon: House, label: t('nav.home'), active: pathname === '/' && tab !== 'trending' },
    { to: '/?tab=trending', icon: Flame, label: t('nav.trending'), active: pathname === '/' && tab === 'trending' }
  ];

  const mine = [
    { to: '/history', icon: History, label: t('nav.history'), active: pathname === '/history' },
    { to: '/playlists', icon: ListVideo, label: t('nav.playlists'), active: pathname === '/playlists' || pathname.startsWith('/playlist/') },
    { to: '/liked', icon: ThumbsUp, label: t('nav.liked'), active: pathname === '/liked' },
    { to: '/studio', icon: Clapperboard, label: t('nav.studio'), active: pathname === '/studio' },
    { to: '/upload', icon: Upload, label: t('nav.upload'), active: pathname === '/upload' }
  ];

  const admin = [{ to: '/admin/users', icon: Users, label: t('admin.title'), active: pathname === '/admin/users' }];

  const renderLink = (it: (typeof items)[number]) => (
    <Link key={it.to} to={it.to} className={`sidebar__link ${it.active ? 'is-active' : ''}`} onClick={onNavigate} aria-current={it.active ? 'page' : undefined}>
      <it.icon size={22} />
      <span>{it.label}</span>
    </Link>
  );

  return (
    <nav className={`sidebar ${open ? 'is-open' : ''}`} aria-label={t('nav.menu')}>
      {items.map(renderLink)}
      {user && (
        <>
          <div className="sidebar__sep" />
          <div className="sidebar__title">{t('nav.you')}</div>
          {mine.map(renderLink)}
        </>
      )}
      {user?.roles.includes('Admin') && (
        <>
          <div className="sidebar__sep" />
          <div className="sidebar__title">{t('nav.admin')}</div>
          {admin.map(renderLink)}
        </>
      )}
    </nav>
  );
}
