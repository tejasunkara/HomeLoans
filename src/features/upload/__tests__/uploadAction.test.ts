import type { LoanDocument, ScannedPage } from '@/types';

import {
  MAX_PAGES,
  createUploadAction,
  initialUploadState,
  type UploadDeps,
  type UploadIntent,
  type UploadState,
} from '../uploadAction';

const page = (name = 'paystub.jpg'): ScannedPage => ({
  uri: `file:///${name}`,
  name,
  mimeType: 'image/jpeg',
  sizeBytes: 2048,
});

const uploaded: LoanDocument = {
  id: 'doc-new',
  name: 'Pay stub',
  category: 'income',
  folder: 'my-uploads',
  status: 'submitted',
  mimeType: 'image/jpeg',
  sizeBytes: 2048,
  pageCount: 1,
  updatedAt: '2026-10-27T00:00:00.000Z',
  sharedWith: [],
};

function setup(overrides: Partial<UploadDeps> = {}) {
  const deps: UploadDeps = {
    pickPages: jest.fn(async () => [page()]),
    upload: jest.fn(async () => uploaded),
    onUploaded: jest.fn(),
    ...overrides,
  };
  const action = createUploadAction(deps);
  const run = async (intents: UploadIntent[], from: UploadState = initialUploadState) => {
    let state = from;
    for (const intent of intents) state = await action(state, intent);
    return state;
  };
  return { deps, run };
}

describe('upload wizard action', () => {
  it('walks capture → details → review → done and notifies the documents store', async () => {
    const { deps, run } = setup();
    const state = await run([
      { type: 'add-pages', source: 'camera' },
      { type: 'continue' },
      { type: 'set-details', name: 'Pay stub', category: 'income' },
      { type: 'submit', send: true },
    ]);

    expect(state).toEqual({ step: 'done', document: uploaded });
    expect(deps.upload).toHaveBeenCalledWith({
      name: 'Pay stub',
      category: 'income',
      pages: [page()],
      submit: true,
    });
    expect(deps.onUploaded).toHaveBeenCalledWith(uploaded);
  });

  it('suggests a name from the first file but not from camera UUIDs', async () => {
    const named = await setup().run([{ type: 'add-pages', source: 'files' }, { type: 'continue' }]);
    expect(named).toMatchObject({ step: 'details', name: 'paystub' });

    const { run } = setup({ pickPages: async () => [page('3F2504E0-4F89-11D3-9A0C-0305E82C3301.jpg')] });
    expect(await run([{ type: 'add-pages', source: 'camera' }, { type: 'continue' }])).toMatchObject({ name: '' });
  });

  it('keeps existing pages when the picker is cancelled', async () => {
    const { run } = setup({ pickPages: async () => [] });
    const state = await run([{ type: 'add-pages', source: 'camera' }], { step: 'capture', pages: [page()] });
    expect(state).toEqual({ step: 'capture', pages: [page()] });
  });

  it('surfaces picker errors on the capture step', async () => {
    const { run } = setup({
      pickPages: async () => {
        throw new Error('Camera access is off.');
      },
    });
    expect(await run([{ type: 'add-pages', source: 'camera' }])).toEqual({
      step: 'capture',
      pages: [],
      error: 'Camera access is off.',
    });
  });

  it('enforces the page limit', async () => {
    const { run } = setup({ pickPages: async () => Array.from({ length: MAX_PAGES + 1 }, () => page()) });
    const state = await run([{ type: 'add-pages', source: 'files' }]);
    expect(state).toMatchObject({ step: 'capture', pages: [] });
    expect(state.step === 'capture' && state.error).toMatch(/at most/);
  });

  it('blocks continuing without pages and validates the name', async () => {
    const { run } = setup();
    expect(await run([{ type: 'continue' }])).toMatchObject({ step: 'capture', error: expect.any(String) });

    const details = await run([
      { type: 'add-pages', source: 'camera' },
      { type: 'continue' },
      { type: 'set-details', name: '  ', category: 'assets' },
    ]);
    expect(details).toMatchObject({ step: 'details', category: 'assets', error: expect.any(String) });
  });

  it('stays on review with an error when the upload fails, so the user can retry', async () => {
    const { deps, run } = setup({
      upload: async () => {
        throw new Error('Network request failed.');
      },
    });
    const state = await run([
      { type: 'add-pages', source: 'camera' },
      { type: 'continue' },
      { type: 'set-details', name: 'Pay stub', category: 'income' },
      { type: 'submit', send: true },
    ]);
    expect(state).toMatchObject({ step: 'review', name: 'Pay stub', error: 'Network request failed.' });
    expect(deps.onUploaded).not.toHaveBeenCalled();
  });

  it('goes back without losing entered details', async () => {
    const { run } = setup();
    const state = await run([
      { type: 'add-pages', source: 'camera' },
      { type: 'continue' },
      { type: 'set-details', name: 'Pay stub', category: 'income' },
      { type: 'back' },
    ]);
    expect(state).toMatchObject({ step: 'details', name: 'Pay stub', category: 'income' });
  });

  it('saves as a draft when send is false', async () => {
    const { deps, run } = setup();
    await run([
      { type: 'add-pages', source: 'camera' },
      { type: 'continue' },
      { type: 'set-details', name: 'Bank statement', category: 'assets' },
      { type: 'submit', send: false },
    ]);
    expect(deps.upload).toHaveBeenCalledWith(expect.objectContaining({ submit: false }));
  });

  it('resets from done', async () => {
    const { run } = setup();
    expect(await run([{ type: 'reset' }], { step: 'done', document: uploaded })).toEqual(initialUploadState);
  });
});
