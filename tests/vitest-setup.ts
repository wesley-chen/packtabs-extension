// This file runs before the test environment is set up
// Fix for jsdom TextEncoder issue with esbuild

// Import from util module
import { TextDecoder as NodeTextDecoder,TextEncoder as NodeTextEncoder } from 'util';

// Create proper Uint8Array-based TextEncoder for jsdom
class FixedTextEncoder extends NodeTextEncoder {
  encode(input?: string): Uint8Array {
    const result = super.encode(input);

    // Ensure it's a proper Uint8Array instance
    return new Uint8Array(result);
  }
}

class FixedTextDecoder extends NodeTextDecoder {
  decode(input?: ArrayBufferView | ArrayBuffer): string {
    return super.decode(input);
  }
}

// Override global TextEncoder/TextDecoder before any other code runs
// @ts-expect-error - Overriding global for jsdom compatibility
global.TextEncoder = FixedTextEncoder;
// @ts-expect-error - Overriding global for jsdom compatibility
global.TextDecoder = FixedTextDecoder;

// Ensure Uint8Array is properly available
if (typeof global.Uint8Array === 'undefined') {
  // @ts-expect-error - Ensuring Uint8Array is available in jsdom
  global.Uint8Array = Uint8Array;
}
