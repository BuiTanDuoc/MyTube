import { Globe, Link2, Lock } from 'lucide-react';
import type { Visibility } from '../api/types';

export default function VisibilityIcon({ visibility, size = 16 }: { visibility: Visibility; size?: number }) {
  if (visibility === 'Public') return <Globe size={size} aria-hidden="true" />;
  if (visibility === 'Unlisted') return <Link2 size={size} aria-hidden="true" />;
  return <Lock size={size} aria-hidden="true" />;
}
