import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import RequireAdmin from './auth/RequireAdmin';
import RequireAuth from './auth/RequireAuth';
import Layout from './components/layout/Layout';
import Spinner from './components/Spinner';
import AuthLayout from './pages/AuthLayout';
import AudioPage from './pages/AudioPage';
import ChannelPage from './pages/ChannelPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HistoryPage from './pages/HistoryPage';
import HomePage from './pages/HomePage';
import LikedPage from './pages/LikedPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PlaylistPage from './pages/PlaylistPage';
import PlaylistsPage from './pages/PlaylistsPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

// Heavy or rarely used pages are loaded on demand (the player pulls in hls.js)
const WatchPage = lazy(() => import('./pages/WatchPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const StudioPage = lazy(() => import('./pages/StudioPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

export default function App() {
  const { ready } = useAuth();

  // Wait until the stored session is restored so the first requests already carry the token
  if (!ready) return <Spinner />;

  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="watch/:id" element={<WatchPage />} />
        <Route path="audio" element={<AudioPage />} />
        <Route path="results" element={<SearchPage />} />
        <Route path="channel/:id" element={<ChannelPage />} />
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="liked" element={<RequireAuth><LikedPage /></RequireAuth>} />
        <Route path="playlists" element={<RequireAuth><PlaylistsPage /></RequireAuth>} />
        <Route path="settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="studio" element={<RequireAuth><StudioPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="confirm-email" element={<ConfirmEmailPage />} />
      </Route>

      <Route path="home" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
