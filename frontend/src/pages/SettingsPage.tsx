import { FormEvent, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi, historyApi, profileApi } from '../api/endpoints';
import { parseError } from '../api/errors';
import type { UserDto } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX = 2 * 1024 * 1024; // matches the API limit

const passwordIsStrong = (p: string) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p);

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    document.title = `${t('settings.title')} - MyTube`;
  }, [t]);

  if (!user) return null; // RequireAuth guarantees a user

  return (
    <div className="page-narrow settings">
      <h1 className="page-title">{t('settings.title')}</h1>
      <ProfileSection user={user} />
      <PasswordSection />
      <PrivacySection user={user} />
      <AccountSection user={user} />
    </div>
  );
}

function ProfileSection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const { reloadUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const afterChange = async () => {
    await reloadUser();
    void queryClient.invalidateQueries(); // names and avatars appear in many cached lists
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await profileApi.update({ displayName: displayName.trim(), bio: bio.trim() || null });
      await afterChange();
      toast.success(t('settings.saved'));
    } catch (err) {
      setError(parseError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseAvatar = async (file: File | null) => {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return toast.error(t('settings.avatarType'));
    if (file.size > AVATAR_MAX) return toast.error(t('settings.avatarSize'));

    setAvatarBusy(true);
    try {
      await profileApi.uploadAvatar(file);
      await afterChange();
      toast.success(t('settings.avatarSaved'));
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = ''; // allows picking the same file again
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await profileApi.removeAvatar();
      await afterChange();
      setConfirmRemove(false);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setAvatarBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>{t('settings.profile')}</h2>

      <div className="avatar-edit">
        <Avatar name={user.displayName} src={user.avatarUrl} size={80} />
        <div>
          <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} hidden onChange={(e) => void chooseAvatar(e.target.files?.[0] ?? null)} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--sm" onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
              {t('settings.changePhoto')}
            </button>
            {user.avatarUrl && (
              <button type="button" className="btn btn--sm" onClick={() => setConfirmRemove(true)} disabled={avatarBusy}>
                {t('settings.removePhoto')}
              </button>
            )}
          </div>
          <p className="field__hint" style={{ marginTop: 6 }}>
            {t('settings.avatarHint')}
          </p>
        </div>
      </div>

      <form onSubmit={saveProfile}>
        <TextField id="s-name" label={t('auth.displayName')} value={displayName} onChange={setDisplayName} maxLength={100} required error={error} />
        <div className="field">
          <label htmlFor="s-bio">{t('settings.bio')}</label>
          <textarea id="s-bio" className="textarea" value={bio} maxLength={1000} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button className="btn btn--primary" disabled={busy || !displayName.trim()}>
            {t('common.save')}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmRemove}
        title={t('settings.removePhoto')}
        message={t('settings.removePhotoConfirm')}
        confirmLabel={t('common.delete')}
        danger
        busy={avatarBusy}
        onConfirm={() => void removeAvatar()}
        onClose={() => setConfirmRemove(false)}
      />
    </section>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!passwordIsStrong(next)) local.password = t('auth.passwordRule');
    if (next !== confirm) local.confirm = t('auth.passwordMismatch');
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setBusy(true);
    try {
      await profileApi.changePassword({ currentPassword: current, newPassword: next });
      toast.success(t('settings.passwordChanged'));
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      const parsed = parseError(err);
      const server: Record<string, string> = {};
      for (const [field, messages] of Object.entries(parsed.fields)) server[field] = messages[0];
      setErrors(Object.keys(server).length > 0 ? server : { currentPassword: parsed.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>{t('settings.password')}</h2>
      <form onSubmit={submit} noValidate>
        <TextField id="p-current" label={t('settings.currentPassword')} type="password" value={current} onChange={setCurrent} error={errors.currentPassword} autoComplete="current-password" required />
        <TextField id="p-new" label={t('auth.newPassword')} type="password" value={next} onChange={setNext} error={errors.password} hint={t('auth.passwordRule')} autoComplete="new-password" required />
        <TextField id="p-confirm" label={t('auth.confirmPassword')} type="password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" required />
        <p className="field__hint" style={{ marginBottom: 12 }}>
          {t('settings.passwordNote')}
        </p>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button className="btn btn--primary" disabled={busy || !current || !next}>
            {t('settings.changePassword')}
          </button>
        </div>
      </form>
    </section>
  );
}

function PrivacySection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const { reloadUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const setPaused = async (paused: boolean) => {
    setBusy(true);
    try {
      await historyApi.setPaused(paused);
      await reloadUser();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>{t('settings.privacy')}</h2>
      <label className="switch" style={{ marginBottom: 8 }}>
        <input type="checkbox" checked={user.watchHistoryPaused} disabled={busy} onChange={(e) => void setPaused(e.target.checked)} />
        {t('settings.pauseHistory')}
      </label>
      <p className="field__hint">{t('settings.pauseHistoryHint')}</p>
    </section>
  );
}

function AccountSection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const toast = useToast();

  const resend = () =>
    authApi
      .resendConfirmation(user.email)
      .then(() => toast.success(t('auth.confirmResent')))
      .catch((err) => toast.error(parseError(err).message));

  return (
    <section className="card">
      <h2>{t('settings.account')}</h2>
      <p>
        {user.email}{' '}
        <span className={`badge ${user.emailConfirmed ? 'badge--ok' : 'badge--busy'}`}>
          {user.emailConfirmed ? t('settings.verified') : t('settings.unverified')}
        </span>
      </p>
      {!user.emailConfirmed && (
        <button className="btn btn--sm" style={{ marginTop: 12 }} onClick={() => void resend()}>
          {t('auth.resendConfirmation')}
        </button>
      )}
    </section>
  );
}
