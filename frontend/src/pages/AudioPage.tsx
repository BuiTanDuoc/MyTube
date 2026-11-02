import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { videosApi } from '../api/endpoints';
import VideoGrid from '../components/VideoGrid';
import { nextPage } from '../lib/paging';

/** Public audio tracks, newest first. */
export default function AudioPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('audio.title')} - MyTube`;
  }, [t]);

  const list = useInfiniteQuery({
    queryKey: ['audio'],
    queryFn: ({ pageParam }) => videosApi.list(pageParam, undefined, 'Audio'),
    initialPageParam: 1,
    getNextPageParam: nextPage
  });

  return (
    <div className="lib">
      <h1 className="page-title">{t('audio.title')}</h1>
      <VideoGrid query={list} emptyTitle={t('audio.empty')} emptyHint={t('audio.emptyHint')} />
    </div>
  );
}
