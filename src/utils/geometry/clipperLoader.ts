import {
  loadNativeClipperLibInstanceAsync,
  NativeClipperLibRequestedFormat,
  type ClipperLibWrapper,
} from "js-angusj-clipper/web";
import logger from "@/lib/logger";

const LOADER_NAME = "ClipperLoader";

interface ClipperGlobalHost {
  clipper?: ClipperLibWrapper;
}

let clipperPromise: Promise<ClipperLibWrapper> | null = null;

function getClipperHost(): ClipperGlobalHost {
  return globalThis as unknown as ClipperGlobalHost;
}

export async function ensureClipperLoaded(): Promise<ClipperLibWrapper> {
  const host = getClipperHost();
  if (host.clipper) {
    return host.clipper;
  }

  if (clipperPromise) {
    return clipperPromise;
  }

  clipperPromise = (async (): Promise<ClipperLibWrapper> => {
    try {
      const instance = await loadNativeClipperLibInstanceAsync(
        NativeClipperLibRequestedFormat.WasmWithAsmJsFallback,
      );
      host.clipper = instance;
      logger.info("Clipper WASM loaded", {}, LOADER_NAME);
      return instance;
    } catch (error) {
      clipperPromise = null;
      logger.error(
        "Failed to load Clipper WASM",
        { error: error instanceof Error ? error.message : String(error) },
        LOADER_NAME,
      );
      throw error;
    }
  })();

  return clipperPromise;
}

export function getClipperSync(): ClipperLibWrapper {
  const host = getClipperHost();
  if (!host.clipper) {
    throw new Error(
      "Clipper is not loaded yet. Call ensureClipperLoaded() first.",
    );
  }
  return host.clipper;
}
