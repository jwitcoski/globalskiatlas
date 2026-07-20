/**
 * Register pmtiles:// before the main map module runs (MapTiler UMD must load first).
 */
import { initPmtilesProtocol } from './pmtiles-core.js';

const sdk = typeof maptilersdk !== 'undefined' ? maptilersdk : null;
if (!sdk) {
  throw new Error('[PMTiles] maptilersdk not loaded — include maptiler-sdk.umd.min.js before this module');
}

await initPmtilesProtocol(sdk);
globalThis.__skiPmtilesProtocolReady = true;
