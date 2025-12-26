// This file runs before the test environment is set up
// Fix for jsdom TextEncoder issue with esbuild
import { TextEncoder, TextDecoder } from 'util';

// @ts-ignore
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;
