import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from './App';
import { api } from './api/client';
import { tokens } from './api/tokens';
import type { UserDto } from './api/types';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './theme/ThemeContext';

export interface Call {
  method: string;
  url: string;
  body: unknown;
}

type Handler = (body: unknown) => unknown;

/** Replaces the network: handlers are keyed "METHOD /api/path". Unknown routes answer 404. */
export function mockApi(handlers: Record<string, Handler>): Call[] {
  const calls: Call[] = [];

  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toUpperCase();
    const url = config.url ?? '';
    const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : config.data;
    calls.push({ method, url, body });

    const handler = handlers[`${method} ${url}`];
    if (!handler) {
      throw new AxiosError(`not mocked: ${method} ${url}`, '404', config, null, { status: 404, statusText: '', data: {}, headers: {}, config });
    }
    const data = handler(body);
    return { data: data ?? {}, status: data === undefined ? 204 : 200, statusText: 'OK', headers: {}, config };
  };

  return calls;
}

export const owner = { id: 'o1', userName: 'owner', displayName: 'Owner Name', avatarUrl: null };

export const videoItem = (id: string, title: string) => ({
  id,
  kind: 'Video',
  title,
  thumbnailUrl: null,
  durationSeconds: 125,
  visibility: 'Public',
  status: 'Ready',
  processingProgress: 100,
  viewCount: 10,
  owner,
  createdAt: '2026-10-01T10:00:00Z',
  publishedAt: '2026-10-01T10:05:00Z'
});

export const paged = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 });

export const makeUser = (roles: string[] = ['User']): UserDto => ({
  id: 'u1',
  userName: 'me',
  email: 'me@example.com',
  emailConfirmed: true,
  watchHistoryPaused: false,
  displayName: 'Me',
  bio: null,
  avatarUrl: null,
  roles,
  createdAt: '2026-01-01T00:00:00Z'
});

/** Pretends a session is stored: the app restores it through a mocked /auth/refresh. */
export function signIn(user: UserDto) {
  tokens.set('stored-access', new Date(Date.now() + 15 * 60_000).toISOString(), 'stored-refresh');
  vi.spyOn(axios, 'post').mockResolvedValue({
    data: {
      accessToken: 'fresh-access',
      accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      refreshToken: 'fresh-refresh',
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      user
    }
  });
}

export function installBrowserStubs() {
  class FakeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeObserver;

  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia;

  // jsdom has no <dialog> behaviour
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

export function renderApp(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
