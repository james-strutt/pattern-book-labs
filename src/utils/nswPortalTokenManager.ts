import logger from "@/lib/logger";
import { proxyRequest } from "@/utils/services/proxyService";

const NSW_PORTAL_DOMAINS = [
  "portal.data.nsw.gov.au",
  "mapprod3.environment.nsw.gov.au",
  "portal.spatial.nsw.gov.au",
];

export function isNSWPortalService(
  serviceUrl: string | null | undefined
): boolean {
  if (!serviceUrl) return false;
  try {
    const url = new URL(serviceUrl);
    return NSW_PORTAL_DOMAINS.some(
      (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function getNSWPortalToken(
  serviceUrl: string | null | undefined
): Promise<string | null> {
  if (!isNSWPortalService(serviceUrl)) {
    logger.debug(
      "Service not NSW Portal, skipping shared token",
      { serviceUrl },
      "getNSWPortalToken"
    );
    return null;
  }

  try {
    const token = localStorage.getItem("arcgis_token");

    if (!token) {
      logger.debug(
        "No shared NSW Portal token available",
        {},
        "getNSWPortalToken"
      );
      return null;
    }

    logger.debug(
      "Using shared NSW Portal token for service",
      {},
      "getNSWPortalToken"
    );
    return token;
  } catch (error) {
    logger.error(
      "Error getting NSW Portal token",
      { error },
      "getNSWPortalToken"
    );
    return null;
  }
}

export interface TokenContext {
  token: string | null | undefined;
}

export function getNSWPortalTokenFromContext(
  serviceUrl: string | null | undefined,
  tokenContext: TokenContext
): string | null {
  if (!isNSWPortalService(serviceUrl)) {
    logger.debug(
      "Service not NSW Portal, skipping shared token",
      { serviceUrl },
      "getNSWPortalTokenFromContext"
    );
    return null;
  }

  const { token } = tokenContext;

  if (!token) {
    logger.debug(
      "No shared NSW Portal token available",
      {},
      "getNSWPortalTokenFromContext"
    );
    return null;
  }

  logger.debug(
    "Using shared NSW Portal token for service",
    {},
    "getNSWPortalTokenFromContext"
  );
  return token;
}

const DEFAULT_VALIDATION_URL =
  "https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer";

export async function validateNSWPortalToken(
  token: string | null | undefined,
  testUrl: string = DEFAULT_VALIDATION_URL
): Promise<boolean> {
  if (!token) return false;

  try {
    const data = (await proxyRequest(`${testUrl}?f=json`, {
      headers: { Authorization: `Bearer ${token}` },
    })) as {
      error?: unknown;
    };
    return !data.error;
  } catch (error) {
    logger.error(
      "Token validation failed",
      { error },
      "validateNSWPortalToken"
    );
    return false;
  }
}

export interface FallbackTokenSource {
  layerId: number;
  serviceEndpoint: string;
  name: string;
}

function extractTokenFromVectorTileUrl(
  vectorTileUrl: string | null | undefined,
  logPrefix: string
): string | null {
  if (!vectorTileUrl) return null;

  try {
    const urlParts = vectorTileUrl.split(/\/featureServer\/\{z\}\/\{x\}\/\{y\}\//i);
    const queryPart = urlParts?.[1] ?? "";
    const decodedUrl = decodeURIComponent(queryPart);
    
    const searchParams = new URLSearchParams(decodedUrl.replace(/^\?/, ""));
    const extractedToken = searchParams.get("token");

    if (extractedToken) {
      logger.debug(
        `${logPrefix} Using extracted token from vector tiles`,
        { tokenLength: extractedToken.length },
        "getTokenWithFallback"
      );
      return extractedToken;
    }

    logger.debug(
      `${logPrefix} Vector tile URL found but no token in it`,
      { urlPartLength: decodedUrl.length },
      "getTokenWithFallback"
    );
  } catch (error) {
    logger.error(
      `${logPrefix} Error extracting token from vector tiles`,
      { error },
      "getTokenWithFallback"
    );
  }

  return null;
}

export async function getTokenWithFallback(
  serviceUrl: string | null | undefined,
  vectorTileUrl: string | null | undefined,
  logPrefix = ""
): Promise<string | null> {
  logger.debug(
    `${logPrefix} Token retrieval attempt`,
    {
      hasServiceUrl: !!serviceUrl,
      hasVectorTileUrl: !!vectorTileUrl,
      vectorTileUrlPreview: vectorTileUrl ? vectorTileUrl.substring(0, 100) + '...' : 'none'
    },
    "getTokenWithFallback"
  );

  const sharedToken = await getNSWPortalToken(serviceUrl);
  if (sharedToken) {
    logger.debug(
      `${logPrefix} Using shared NSW Portal token`,
      { tokenLength: sharedToken.length },
      "getTokenWithFallback"
    );
    return sharedToken;
  }

  const extractedToken = extractTokenFromVectorTileUrl(vectorTileUrl, logPrefix);
  if (extractedToken) {
    return extractedToken;
  }

  logger.warn(`${logPrefix} No token available`, {}, "getTokenWithFallback");
  return null;
}

export interface ProjectLayer {
  layer: number;
  layer_full?: {
    vector_source?: {
      tiles?: string[];
    };
  };
}

export async function getTokenWithFallbackSources(
  primaryServiceEndpoint: string,
  primaryVectorTileUrl: string | null | undefined,
  fallbackSources: FallbackTokenSource[],
  projectLayers: ProjectLayer[] | null,
  logPrefix = ""
): Promise<string | null> {
  const primaryToken = await getTokenWithFallback(
    primaryServiceEndpoint,
    primaryVectorTileUrl,
    logPrefix
  );

  if (primaryToken) {
    return primaryToken;
  }

  for (const fallback of fallbackSources) {
    const fallbackLayer = projectLayers?.find(
      (layer) => layer.layer === fallback.layerId
    );
    const fallbackVectorTileUrl =
      fallbackLayer?.layer_full?.vector_source?.tiles?.[0] ?? null;

    if (fallbackVectorTileUrl) {
      const fallbackLogPrefix = `${logPrefix}[FALLBACK-${fallback.name}]`;
      const fallbackToken = await getTokenWithFallback(
        fallback.serviceEndpoint,
        fallbackVectorTileUrl,
        fallbackLogPrefix
      );

      if (fallbackToken) {
        logger.debug(
          `${logPrefix} Using fallback token from ${fallback.name}`,
          { layerId: fallback.layerId },
          "getTokenWithFallbackSources"
        );
        return fallbackToken;
      }
    }
  }

  logger.warn(
    `${logPrefix} No token available from primary or fallback sources`,
    { fallbackCount: fallbackSources.length },
    "getTokenWithFallbackSources"
  );
  return null;
}
