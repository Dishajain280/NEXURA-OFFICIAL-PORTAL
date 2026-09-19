/**
 * Sanitize a URL for use in `<a href>` attributes.
 *
 * Only allows http: and https: protocols. Anything else (javascript:,
 * data:, vbscript:, file:, etc.) is replaced with "#" so the link is
 * inert rather than executing arbitrary code on click.
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== "string") return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "#";
};

/**
 * Open a sanitized URL in a new tab. Returns false if the URL is unsafe.
 */
export const openSafeUrl = (url) => {
  const safe = sanitizeUrl(url);
  if (safe === "#") return false;
  window.open(safe, "_blank", "noopener,noreferrer");
  return true;
};
