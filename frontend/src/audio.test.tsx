import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from './i18n';
import { api } from './api/client';
import { tokens } from './api/tokens';
import { installBrowserStubs, makeUser, mockApi, owner, paged, renderApp, signIn, videoItem } from './test-utils';

const audioItem = (id: string, title: string) => ({ ...videoItem(id, title), kind: 'Audio' });

const audioDto = {
  ...audioItem('a1', 'Evening song'),
  description: null,
  streamUrl: '/api/stream/a1/master.m3u8',
  renditions: [{ name: '128k', width: 0, height: 0, bitrateKbps: 128 }],
  width: 0,
  height: 0,
  likeCount: 0,
  myReaction: null,
  resumePositionSeconds: null,
  dislikeCount: null,
  sizeBytes: null,
  processingProgress: null,
  processingError: null
};

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

describe('audio support', () => {
  it('plays an audio item in an <audio> element (no <video>, no quality menu)', async () => {
    mockApi({
      'GET /api/videos/a1': () => audioDto,
      'GET /api/videos/a1/related': () => [],
      'GET /api/search/suggestions': () => []
    });

    const { container } = renderApp('/watch/a1');

    expect(await screen.findByRole('heading', { name: 'Evening song' })).toBeTruthy();
    expect(container.querySelector('audio')).not.toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.player--audio')).not.toBeNull();
  });

  it('lists public audio on the Audio page with an Audio tag', async () => {
    mockApi({
      'GET /api/videos': () => paged([audioItem('a1', 'Evening song'), audioItem('a2', 'Morning song')])
    });

    renderApp('/audio');

    expect(await screen.findByText('Evening song')).toBeTruthy();
    expect(screen.getByText('Morning song')).toBeTruthy();
    expect(screen.getAllByText('Audio').length).toBeGreaterThan(0);
  });

  it('uploading an .mp3 creates an Audio item', async () => {
    signIn(makeUser());
    const calls = mockApi({
      'POST /api/videos': () => ({ ...audioDto, id: 'a9', status: 'PendingUpload' }),
      'PUT /api/videos/a9/source': () => ({ ...audioDto, id: 'a9', status: 'Queued' }),
      'GET /api/videos/a9': () => ({ ...audioDto, id: 'a9', status: 'Ready', owner })
    });

    const { container } = renderApp('/upload');
    await screen.findByText('Upload video or audio');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { files: [new File(['abc'], 'Evening song.mp3', { type: 'audio/mpeg' })] } });

    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === '/api/videos')).toBe(true));
    const create = calls.find((c) => c.method === 'POST' && c.url === '/api/videos');
    expect(create?.body).toMatchObject({ title: 'Evening song', kind: 'Audio' });
    expect(await screen.findByText('Your audio is ready', undefined, { timeout: 6000 })).toBeTruthy();
  }, 15000);

  it('rejects unsupported files', async () => {
    signIn(makeUser());
    mockApi({});

    const { container } = renderApp('/upload');
    await screen.findByText('Upload video or audio');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt')] } });

    expect(await screen.findByText(/Unsupported file type/)).toBeTruthy();
  });
});
