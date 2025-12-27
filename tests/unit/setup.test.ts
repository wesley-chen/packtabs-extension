import { describe, expect,it } from 'vitest';

describe('Project Setup', () => {
  it('should have Chrome API mocks available', () => {
    expect((global as any).chrome).toBeDefined();
    expect((global as any).chrome.storage).toBeDefined();
    expect((global as any).chrome.tabs).toBeDefined();
    expect((global as any).chrome.runtime).toBeDefined();
  });

  it('should support TypeScript strict mode', () => {
    const testValue = 'test';

    expect(testValue).toBe('test');
  });
});
