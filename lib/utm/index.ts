/**
 * UTM Parameter Tracking
 * Extract and manage UTM parameters for lead attribution
 */

export interface UTMParams {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
}

export function extractUTMParams(searchParams: URLSearchParams): UTMParams {
  return {
    utm_source: searchParams.get("utm_source") || null,
    utm_medium: searchParams.get("utm_medium") || null,
    utm_campaign: searchParams.get("utm_campaign") || null,
    utm_content: searchParams.get("utm_content") || null,
  }
}

export function hasUTMParams(params: UTMParams): boolean {
  return !!(params.utm_source || params.utm_medium || params.utm_campaign || params.utm_content)
}
