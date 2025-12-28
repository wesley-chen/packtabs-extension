// This file runs before the test environment is set up
// Fix for jsdom TextEncoder issue with esbuild

// Import from util module
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';

// Create proper Uint8Array-based TextEncoder for jsdom
class FixedTextEncoder {
  encode(input?: string): Uint8Array {
    const encoder = new NodeTextEncoder();
    const result = encoder.encode(input);

    // Ensure it's a proper Uint8Array instance
    return new Uint8Array(result);
  }

  encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
    const encoder = new NodeTextEncoder();

    return encoder.encodeInto(source, destination);
  }

  get encoding(): string {
    return 'utf-8';
  }
}

class FixedTextDecoder {
  private readonly _encoding: string;
  private readonly _fatal: boolean;
  private readonly _ignoreBOM: boolean;

  constructor(encoding = 'utf-8', options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
    this._encoding = encoding;
    this._fatal = options.fatal ?? false;
    this._ignoreBOM = options.ignoreBOM ?? false;
  }

  decode(input?: BufferSource): string {
    const decoder = new NodeTextDecoder(this._encoding, {
      fatal: this._fatal,
      ignoreBOM: this._ignoreBOM,
    });

    return decoder.decode(input as any);
  }

  get encoding(): string {
    return this._encoding;
  }

  get fatal(): boolean {
    return this._fatal;
  }

  get ignoreBOM(): boolean {
    return this._ignoreBOM;
  }
}

// Override global TextEncoder/TextDecoder before any other code runs
global.TextEncoder = FixedTextEncoder as any;
global.TextDecoder = FixedTextDecoder as any;

// Ensure Uint8Array is properly available
if (typeof global.Uint8Array === 'undefined') {
  (global as any).Uint8Array = Uint8Array;
}
