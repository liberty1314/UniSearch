import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ cancel: vi.fn() })),
  });

  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      setTransform: vi.fn(),
      reset: vi.fn(),
      fillStyle: '',
    })),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
