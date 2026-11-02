import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from './i18n';
import { api } from './api/client';
import { tokens } from './api/tokens';
import { installBrowserStubs, makeUser, mockApi, owner, paged, renderApp, signIn, videoItem } from './test-utils';

const playlist = (id: string, title: string, kind: 'Custom' | 'WatchLater', itemCount: number) => ({
  id,
  title,
  description: null,
  visibility: 'Private',
  kind,
  owner: { ...owner, id: 'u1', displayName: 'Me' },
  itemCount,
  thumbnailUrl: null,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: null,
  containsVideo: null
});

beforeAll(installBrowserStubs);

beforeEach(async () => {
  localStorage.clear();
  tokens.clear();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  api.defaults.adapter = undefined;
});

describe('library pages', () => {
  it('lists playlists with the built-in "Watch later" shown in the current language', async () => {
    signIn(makeUser());
    mockApi({
      'GET /api/playlists/mine': () => paged([playlist('wl', 'Watch later', 'WatchLater', 0), playlist('p1', 'My list', 'Custom', 2)])
    });

    renderApp('/playlists');

    expect(await screen.findByText('My list')).toBeTruthy();
    expect(screen.getByText('Watch later')).toBeTruthy();
    expect(screen.getByText(/2 videos/)).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('vi');
    });
    expect(await screen.findByText('Xem sau')).toBeTruthy();
  });

  it('reorders a playlist with the move buttons and tells the API where the item goes', async () => {
    signIn(makeUser());
    const calls = mockApi({
      'GET /api/playlists/p1': () => playlist('p1', 'My list', 'Custom', 3),
      'GET /api/playlists/p1/items': () =>
        paged([
          { itemId: 'ia', position: 0, addedAt: '2026-10-01T10:00:00Z', video: videoItem('va', 'Video A') },
          { itemId: 'ib', position: 1, addedAt: '2026-10-01T10:00:00Z', video: videoItem('vb', 'Video B') },
          { itemId: 'ic', position: 2, addedAt: '2026-10-01T10:00:00Z', video: videoItem('vc', 'Video C') }
        ]),
      'PUT /api/playlists/p1/items/ia/move': () => undefined
    });

    renderApp('/playlist/p1');
    await screen.findByText('Video A');

    const titles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles()).toEqual(['Video A', 'Video B', 'Video C']);

    // "Move down" on the first row: A goes after B
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(titles()).toEqual(['Video B', 'Video A', 'Video C']);

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.url.endsWith('/ia/move'))).toBe(true));
    expect(calls.find((c) => c.url.endsWith('/ia/move'))?.body).toEqual({ afterItemId: 'ib' });
  });

  it('removes a video from the watch history', async () => {
    signIn(makeUser());
    const calls = mockApi({
      'GET /api/users/me/history': () => paged([{ video: videoItem('v1', 'Seen video'), positionSeconds: 30, completed: false, watchedAt: '2026-10-02T10:00:00Z' }]),
      'DELETE /api/users/me/history/v1': () => undefined
    });

    renderApp('/history');
    expect(await screen.findByText('Seen video')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove from history' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/users/me/history/v1')).toBe(true));
  });

  it('hides the admin page from regular users but shows it to admins', async () => {
    signIn(makeUser(['User']));
    mockApi({});
    renderApp('/admin/users');
    expect(await screen.findByText('Page not found')).toBeTruthy();
    cleanup();
    vi.restoreAllMocks();

    signIn(makeUser(['User', 'Admin']));
    mockApi({
      'GET /api/admin/users': () =>
        paged([
          { id: 'u2', userName: 'bob', email: 'bob@example.com', displayName: 'Bob', emailConfirmed: false, isLockedOut: true, lockoutEnd: null, roles: ['User'], createdAt: '2026-02-01T00:00:00Z' }
        ])
    });
    renderApp('/admin/users');
    expect(await screen.findByText('Bob')).toBeTruthy();
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Unlock/ })).toBeTruthy();
  });

  it('saves a video to a playlist from the watch page (optimistic tick + API call)', async () => {
    signIn(makeUser());

    // A tiny stateful "server": the dialog refetches after every change, so the mock must remember it
    const contains = { wl: false, p1: true };
    const calls = mockApi({
      'GET /api/videos/v1': () => ({
        ...videoItem('v1', 'My great video'),
        description: 'Desc',
        streamUrl: '/api/stream/v1/master.m3u8',
        renditions: [],
        width: 1280,
        height: 720,
        likeCount: 0,
        myReaction: null,
        resumePositionSeconds: null,
        dislikeCount: null,
        sizeBytes: null,
        processingProgress: null,
        processingError: null
      }),
      'GET /api/videos/v1/related': () => [],
      'GET /api/playlists/mine': () =>
        paged([
          { ...playlist('wl', 'Watch later', 'WatchLater', 0), containsVideo: contains.wl },
          { ...playlist('p1', 'Favourites', 'Custom', 1), containsVideo: contains.p1 }
        ]),
      'POST /api/playlists/wl/items': () => {
        contains.wl = true;
        return { itemId: 'i1', position: 0, addedAt: '2026-10-01T10:00:00Z', video: videoItem('v1', 'My great video') };
      },
      'DELETE /api/playlists/p1/videos/v1': () => {
        contains.p1 = false;
        return undefined;
      }
    });

    renderApp('/watch/v1');
    await screen.findByRole('heading', { name: 'My great video' });

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    const watchLater = (await screen.findByRole('checkbox', { name: /Watch later/ })) as HTMLInputElement;
    const favourites = screen.getByRole('checkbox', { name: /Favourites/ }) as HTMLInputElement;
    expect(watchLater.checked).toBe(false);
    expect(favourites.checked).toBe(true);

    // Add to "Watch later" (the box is ticked right away, before the server answers)
    fireEvent.click(watchLater);
    await waitFor(() => expect(watchLater.checked).toBe(true));
    await waitFor(() => expect(favourites.disabled).toBe(false)); // the dialog locks while a change is in flight

    // Remove from "Favourites"
    fireEvent.click(favourites);
    await waitFor(() => expect(favourites.checked).toBe(false));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.url === '/api/playlists/wl/items')).toBe(true);
      expect(calls.some((c) => c.method === 'DELETE' && c.url === '/api/playlists/p1/videos/v1')).toBe(true);
    });
    expect(calls.find((c) => c.url === '/api/playlists/wl/items')?.body).toEqual({ videoId: 'v1' });
  });
});
