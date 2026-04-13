import bbox from "@turf/bbox";
import type * as GeoJSON from "geojson";
import { SERVICE_ENDPOINTS } from "@/utils/config/serviceEndpoints";
import logger from "@/lib/logger";
import type { LmrVerificationResult, LmrPixelAnalysis } from "@/types/domain/lmr";

const SERVICE_NAME = "LmrVerificationService";
const IMAGE_SIZE = 64;
const BBOX_PADDING_DEG = 0.001;
const REQUEST_TIMEOUT_MS = 10_000;
const LMR_INDICATIVE_AREA_LAYER = 4;
const LMR_EXCLUSION_LAYER = 6;
const TOD_AREA_LAYER = 3;

const MAX_VERIFICATION_CACHE_ENTRIES = 300;
export const DEFAULT_LMR_BATCH_CONCURRENCY = 10;

const LMR_ORANGE = {
  rMin: 230,
  rMax: 255,
  gMin: 170,
  gMax: 200,
  bMin: 70,
  bMax: 100,
} as const;

const TOD_MAUVE = {
  rMin: 190,
  rMax: 220,
  gMin: 165,
  gMax: 195,
  bMin: 190,
  bMax: 220,
} as const;

const EXCLUSION_DARK = {
  rMax: 60,
  gMax: 60,
  bMax: 60,
} as const;

type Bbox = [number, number, number, number];

const resultCache = new Map<string, { result: LmrVerificationResult; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function evictIfAtCapacity<K, V>(cache: Map<K, V>, maxEntries: number): void {
  while (cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    cache.delete(oldest);
  }
}

function setBoundedCacheEntry<K, V>(cache: Map<K, V>, key: K, value: V, maxEntries: number): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else {
    evictIfAtCapacity(cache, maxEntries);
  }
  cache.set(key, value);
}

function collectPositions(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): GeoJSON.Position[] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  return geometry.coordinates.flat(2);
}

function hashCoordinatesFnv1a(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): string {
  let hash = 0x811c9dc5;
  for (const p of collectPositions(geometry)) {
    const lng = p[0];
    const lat = p[1];
    if (lng === undefined || lat === undefined) {
      continue;
    }
    const chunk = `${lng.toFixed(6)},${lat.toFixed(6)};`;
    for (const unit of chunk) {
      hash ^= unit.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193);
      hash >>>= 0;
    }
  }
  return hash.toString(16).padStart(8, "0");
}

function computeGeometryHash(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): string {
  const extent = bbox(geometry);
  const bboxStr = `${extent[0].toFixed(6)},${extent[1].toFixed(6)},${extent[2].toFixed(6)},${extent[3].toFixed(6)}`;
  const coordHash = hashCoordinatesFnv1a(geometry);
  return `${geometry.type}-${coordHash}-${bboxStr}`;
}

function getCachedResult(hash: string): LmrVerificationResult | null {
  const cached = resultCache.get(hash);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    resultCache.delete(hash);
    return null;
  }
  return cached.result;
}

function setCachedResult(hash: string, result: LmrVerificationResult): void {
  setBoundedCacheEntry(resultCache, hash, { result, timestamp: Date.now() }, MAX_VERIFICATION_CACHE_ENTRIES);
}

function isWgs84BboxValid(bboxExtent: Bbox): boolean {
  const [xmin, ymin, xmax, ymax] = bboxExtent;
  if (![xmin, ymin, xmax, ymax].every((n) => Number.isFinite(n))) {
    return false;
  }
  if (xmin > xmax || ymin > ymax) {
    return false;
  }
  return xmin >= -180 && xmax <= 180 && ymin >= -90 && ymax <= 90;
}

export function computePropertyBbox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): Bbox {
  const extent = bbox(geometry);
  return [extent[0], extent[1], extent[2], extent[3]];
}

export function padBbox(bboxExtent: Bbox, paddingDeg: number = BBOX_PADDING_DEG): Bbox {
  return [
    bboxExtent[0] - paddingDeg,
    bboxExtent[1] - paddingDeg,
    bboxExtent[2] + paddingDeg,
    bboxExtent[3] + paddingDeg,
  ];
}

function buildExportUrl(bboxExtent: Bbox, layerId: number): string {
  const bboxStr = bboxExtent.join(",");
  const params = new URLSearchParams({
    bbox: bboxStr,
    bboxSR: "4326",
    imageSR: "4326",
    size: `${IMAGE_SIZE},${IMAGE_SIZE}`,
    format: "png32",
    transparent: "true",
    layers: `show:${layerId}`,
    f: "image",
  });
  return `${SERVICE_ENDPOINTS.LMR}/export?${params.toString()}`;
}

async function fetchImageAsCanvas(url: string, signal: AbortSignal, layerId: number): Promise<ImageData | null> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(imageBitmap, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
    return ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  } catch (error) {
    if ((error as Error).name === "AbortError") return null;
    logger.warn(
      "Failed to fetch LMR image",
      {
        error: error instanceof Error ? error.message : String(error),
        layerId,
        endpoint: SERVICE_ENDPOINTS.LMR,
      },
      SERVICE_NAME,
    );
    return null;
  }
}

export function buildPolygonMask(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon, bboxExtent: Bbox): ImageData | null {
  const canvas = new OffscreenCanvas(IMAGE_SIZE, IMAGE_SIZE);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const [bxMin, byMin, bxMax, byMax] = bboxExtent;
  const bw = bxMax - bxMin;
  const bh = byMax - byMin;

  const drawRing = (ring: GeoJSON.Position[]): void => {
    for (let i = 0; i < ring.length; i++) {
      const coord = ring[i];
      if (!coord) continue;
      const lng = coord[0] ?? 0;
      const lat = coord[1] ?? 0;
      const px = ((lng - bxMin) / bw) * IMAGE_SIZE;
      const py = ((byMax - lat) / bh) * IMAGE_SIZE;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  ctx.fillStyle = "white";
  ctx.beginPath();

  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      drawRing(ring);
    }
  } else {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        drawRing(ring);
      }
    }
  }

  ctx.fill("evenodd");
  return ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
}

export function analysePixelsWithMask(lmrImageData: ImageData, maskImageData: ImageData): LmrPixelAnalysis {
  const lmrPx = lmrImageData.data;
  const maskPx = maskImageData.data;
  let orangeInProperty = 0;
  let totalPropertyPixels = 0;
  let orangeOutsideProperty = 0;

  for (let i = 0; i < lmrPx.length; i += 4) {
    const inMask = (maskPx[i] ?? 0) > 0;
    const r = lmrPx[i] ?? 0;
    const g = lmrPx[i + 1] ?? 0;
    const b = lmrPx[i + 2] ?? 0;
    const a = lmrPx[i + 3] ?? 0;
    const isOrange =
      a > 0 &&
      r >= LMR_ORANGE.rMin &&
      r <= LMR_ORANGE.rMax &&
      g >= LMR_ORANGE.gMin &&
      g <= LMR_ORANGE.gMax &&
      b >= LMR_ORANGE.bMin &&
      b <= LMR_ORANGE.bMax;

    if (inMask) {
      totalPropertyPixels++;
      if (isOrange) orangeInProperty++;
    } else if (isOrange) {
      orangeOutsideProperty++;
    }
  }

  const coveragePercent = totalPropertyPixels > 0 ? (orangeInProperty / totalPropertyPixels) * 100 : 0;

  return {
    orangeInProperty,
    totalPropertyPixels,
    coveragePercent,
    orangeOutsideProperty,
  };
}

function analyseExclusionWithMask(exclusionImageData: ImageData, maskImageData: ImageData): number {
  const exPx = exclusionImageData.data;
  const maskPx = maskImageData.data;
  let exclusionInProperty = 0;

  for (let i = 0; i < exPx.length; i += 4) {
    const inMask = (maskPx[i] ?? 0) > 0;
    if (!inMask) continue;

    const r = exPx[i] ?? 0;
    const g = exPx[i + 1] ?? 0;
    const b = exPx[i + 2] ?? 0;
    const a = exPx[i + 3] ?? 0;
    const isDark = a > 0 && r <= EXCLUSION_DARK.rMax && g <= EXCLUSION_DARK.gMax && b <= EXCLUSION_DARK.bMax;

    if (isDark) exclusionInProperty++;
  }

  return exclusionInProperty;
}

export async function checkLmrViaImageExport(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Promise<LmrVerificationResult> {
  const geoHash = computeGeometryHash(geometry);
  const cached = getCachedResult(geoHash);
  if (cached) return cached;

  const unavailable: LmrVerificationResult = {
    isInLmrArea: false,
    source: "mapServer",
    coveragePercent: 0,
    confidence: "unavailable",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const propBbox = computePropertyBbox(geometry);
    if (!isWgs84BboxValid(propBbox)) {
      return unavailable;
    }

    const paddedBbox = padBbox(propBbox);
    const mask = buildPolygonMask(geometry, paddedBbox);
    if (!mask) return unavailable;

    const lmrUrl = buildExportUrl(paddedBbox, LMR_INDICATIVE_AREA_LAYER);
    const exclusionUrl = buildExportUrl(paddedBbox, LMR_EXCLUSION_LAYER);

    const [lmrImage, exclusionImage] = await Promise.all([
      fetchImageAsCanvas(lmrUrl, controller.signal, LMR_INDICATIVE_AREA_LAYER),
      fetchImageAsCanvas(exclusionUrl, controller.signal, LMR_EXCLUSION_LAYER),
    ]);

    if (!lmrImage) return unavailable;

    const pixelAnalysis = analysePixelsWithMask(lmrImage, mask);

    let adjustedOrange = pixelAnalysis.orangeInProperty;
    if (exclusionImage) {
      const exclusionCount = analyseExclusionWithMask(exclusionImage, mask);
      adjustedOrange = Math.max(0, adjustedOrange - exclusionCount);
    }

    const adjustedCoverage =
      pixelAnalysis.totalPropertyPixels > 0 ? (adjustedOrange / pixelAnalysis.totalPropertyPixels) * 100 : 0;

    const result: LmrVerificationResult = {
      isInLmrArea: adjustedOrange > 0,
      source: "mapServer",
      coveragePercent: Math.round(adjustedCoverage * 10) / 10,
      pixelAnalysis,
      confidence: "confirmed",
    };

    setCachedResult(geoHash, result);
    return result;
  } catch (error) {
    logger.error(
      "LMR MapServer verification failed",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE_NAME,
    );
    return unavailable;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface TodVerificationResult {
  isInTodArea: boolean;
  coveragePercent: number;
  confidence: "confirmed" | "unavailable";
}

const todResultCache = new Map<string, { result: TodVerificationResult; timestamp: number }>();

function getTodCachedResult(hash: string): TodVerificationResult | null {
  const cached = todResultCache.get(hash);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    todResultCache.delete(hash);
    return null;
  }
  return cached.result;
}

export async function checkTodViaImageExport(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Promise<TodVerificationResult> {
  const geoHash = computeGeometryHash(geometry);
  const cachedTod = getTodCachedResult(geoHash);
  if (cachedTod) {
    return cachedTod;
  }

  const unavailable: TodVerificationResult = {
    isInTodArea: false,
    coveragePercent: 0,
    confidence: "unavailable",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const propBbox = computePropertyBbox(geometry);
    if (!isWgs84BboxValid(propBbox)) {
      return unavailable;
    }

    const paddedBbox = padBbox(propBbox);
    const mask = buildPolygonMask(geometry, paddedBbox);
    if (!mask) return unavailable;

    const todUrl = buildExportUrl(paddedBbox, TOD_AREA_LAYER);
    const todImage = await fetchImageAsCanvas(todUrl, controller.signal, TOD_AREA_LAYER);
    if (!todImage) return unavailable;

    const todPx = todImage.data;
    const maskPx = mask.data;
    let todInProperty = 0;
    let totalPropertyPixels = 0;

    for (let i = 0; i < todPx.length; i += 4) {
      const inMask = (maskPx[i] ?? 0) > 0;
      if (!inMask) continue;
      totalPropertyPixels++;

      const r = todPx[i] ?? 0;
      const g = todPx[i + 1] ?? 0;
      const b = todPx[i + 2] ?? 0;
      const a = todPx[i + 3] ?? 0;
      const isMauve =
        a > 0 &&
        r >= TOD_MAUVE.rMin &&
        r <= TOD_MAUVE.rMax &&
        g >= TOD_MAUVE.gMin &&
        g <= TOD_MAUVE.gMax &&
        b >= TOD_MAUVE.bMin &&
        b <= TOD_MAUVE.bMax;

      if (isMauve) todInProperty++;
    }

    const coveragePercent = totalPropertyPixels > 0 ? Math.round((todInProperty / totalPropertyPixels) * 1000) / 10 : 0;

    const result: TodVerificationResult = {
      isInTodArea: todInProperty > 0,
      coveragePercent,
      confidence: "confirmed",
    };

    setBoundedCacheEntry(todResultCache, geoHash, { result, timestamp: Date.now() }, MAX_VERIFICATION_CACHE_ENTRIES);
    return result;
  } catch (error) {
    logger.error(
      "TOD MapServer verification failed",
      { error: error instanceof Error ? error.message : String(error) },
      SERVICE_NAME,
    );
    return unavailable;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function batchCheckLmr(
  geometries: Array<{
    id: string;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  }>,
  concurrency: number = DEFAULT_LMR_BATCH_CONCURRENCY,
): Promise<Map<string, LmrVerificationResult>> {
  const results = new Map<string, LmrVerificationResult>();
  const queue = [...geometries];

  const processNext = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const result = await checkLmrViaImageExport(item.geometry);
      results.set(item.id, result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, geometries.length) }, () => processNext());
  await Promise.all(workers);

  return results;
}
