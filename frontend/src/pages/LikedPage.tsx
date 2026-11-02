import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { videosApi } from '../api/endpoints';
import VideoGrid from '../components/VideoGrid';
import { nextPage } from '../lib/paging';

export default function LikedPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('liked.title')} - MyTube`;
  }, [t]);

  const list = useInfiniteQuery({
    queryKey: ['liked'],
    queryFn: ({ pageParam }) => videosApi.liked(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage
  });

  return (
    <div className="lib">
      <h1 className="page-title">{t('liked.title')}</h1>
      <VideoGrid query={list} emptyTitle={t('liked.empty')} emptyHint={t('liked.emptyHint')} />
    </div>
  );
}
