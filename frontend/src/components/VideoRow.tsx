import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { VideoListItem } from '../api/types';
import { useFormatters } from '../lib/format';
import Avatar from './Avatar';
import { useViewsText, VideoThumb } from './VideoCard';

interface Props {
  video: VideoListItem;
  variant?: 'large' | 'compact';
  /** Keeps the playlist queue open when the video is opened. */
  listId?: string;
  /** 0..1 red "watched so far" bar. */
  progress?: number;
  /** Buttons shown at the right edge (remove, move...). */
  actions?: ReactNode;
}

/** Horizontal card: search results / history (large) and the related + queue sidebars (compact). */
export default function VideoRow({ video, variant = 'compact', listId, progress, actions }: Props) {
  const fmt = useFormatters();
  const viewsText = useViewsText();
  const to = `/watch/${video.id}${listId ? `?list=${listId}` : ''}`;

  return (
    <article className={`vrow vrow--${variant} ${actions ? 'vrow--actions' : ''}`}>
      <VideoThumb video={video} progress={progress} to={to} />
      <div>
        <h3 className="vrow__title">
          <Link to={to}>{video.title}</Link>
        </h3>
        {variant === 'large' ? (
          <>
            <p className="vrow__meta">
              {viewsText(video.viewCount)}
              {video.publishedAt && <> · {fmt.timeAgo(video.publishedAt)}</>}
            </p>
            <Link to={`/channel/${video.owner.id}`} className="vrow__channel">
              <Avatar name={video.owner.displayName} src={video.owner.avatarUrl} size={24} />
              {video.owner.displayName}
            </Link>
          </>
        ) : (
          <>
            <p className="vrow__meta">
              <Link to={`/channel/${video.owner.id}`}>{video.owner.displayName}</Link>
            </p>
            <p className="vrow__meta">
              {viewsText(video.viewCount)}
              {video.publishedAt && <> · {fmt.timeAgo(video.publishedAt)}</>}
            </p>
          </>
        )}
      </div>
      {actions && <div className="vrow__actions">{actions}</div>}
    </article>
  );
}
