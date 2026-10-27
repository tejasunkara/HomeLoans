import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Suspense, type ReactNode } from 'react';

import { configureMockApi, resetMockApi, resources } from '@/services/api';

import { FolderBrowser } from '../components';
import { DocumentsProvider } from '../DocumentsProvider';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ Link: ({ children }: { children: ReactNode }) => children }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);

const LATENCY = 500;

async function renderDocuments() {
  await render(
    <Suspense fallback={null}>
      <DocumentsProvider>
        <FolderBrowser />
      </DocumentsProvider>
    </Suspense>,
  );
  await act(() => jest.advanceTimersByTimeAsync(LATENCY));
}

beforeEach(() => {
  jest.useFakeTimers();
  configureMockApi({ latencyMs: LATENCY, failureRate: 0 });
  resetMockApi();
  resources.invalidate();
});

afterEach(() => {
  jest.useRealTimers();
});

it('optimistically moves a sent draft out of Not Sent, then commits it to My Uploads', async () => {
  await renderDocuments();
  await fireEvent.press(screen.getByRole('tab', { name: /Not Sent/ }));
  expect(screen.getByText('Bank statement — Aug')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Send to loan team' }));

  // Before the server responds, the draft has already left Not Sent.
  expect(screen.queryByText('Bank statement — Aug')).toBeNull();
  expect(screen.getByRole('tab', { name: 'Not Sent, 0 items' })).toBeOnTheScreen();

  await act(() => jest.advanceTimersByTimeAsync(LATENCY));

  await fireEvent.press(screen.getByRole('tab', { name: /My Uploads/ }));
  expect(screen.getByText('Bank statement — Aug')).toBeOnTheScreen();
  expect(screen.getAllByLabelText('Status: Submitted').length).toBeGreaterThan(0);
});

it('rolls the draft back into Not Sent and shows an error when sending fails', async () => {
  await renderDocuments();
  await fireEvent.press(screen.getByRole('tab', { name: /Not Sent/ }));
  configureMockApi({ failureRate: 1 });

  await fireEvent.press(screen.getByRole('button', { name: 'Send to loan team' }));
  expect(screen.queryByText('Bank statement — Aug')).toBeNull();

  await act(() => jest.advanceTimersByTimeAsync(LATENCY));

  expect(screen.getByText('Bank statement — Aug')).toBeOnTheScreen();
  expect(screen.getByText(/Network request failed/)).toBeOnTheScreen();
});
