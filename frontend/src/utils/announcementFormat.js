const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "div",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "span",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

const STRIP_WITH_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "svg",
  "math",
]);

const FONT_SIZE_MAP = {
  1: "12px",
  2: "14px",
  3: "16px",
  4: "20px",
  5: "24px",
  6: "30px",
  7: "36px",
};

const KEYWORD_FONT_SIZE_MAP = {
  "xx-small": "11px",
  "x-small": "12px",
  small: "14px",
  medium: "16px",
  large: "20px",
  "x-large": "24px",
  "xx-large": "30px",
  "xxx-large": "36px",
};

const SAFE_COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(?:0|1|0?\.\d+)\s*\)|[a-z]{3,20})$/i;
const SAFE_FONT_SIZE_PATTERN = /^\d+(?:\.\d+)?(?:px|rem|em|%)$/i;
const SAFE_ALIGN_PATTERN = /^(left|center|right|justify)$/i;
const SAFE_WEIGHT_PATTERN = /^(normal|bold|bolder|lighter|[1-9]00)$/i;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const decodeEntities = (text) =>
  String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

export const hasHtmlMarkup = (value) =>
  /<\/?(?:p|br|div|b|strong|i|em|u|s|strike|span|h1|h2|h3|ul|ol|li|blockquote|font)\b[^>]*>/i.test(
    String(value ?? ""),
  );

const getAttributeValue = (rawAttrs, attrName) => {
  const match = rawAttrs.match(
    new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`, "i"),
  );
  return match ? match[1] ?? match[2] ?? match[3] ?? "" : "";
};

const sanitizeStyleString = (styleText, extraStyles = []) => {
  const declarations = [];
  for (const entry of String(styleText || "").split(";")) {
    const colonIndex = entry.indexOf(":");
    if (colonIndex < 0) continue;
    const prop = entry.slice(0, colonIndex).trim().toLowerCase();
    const val = entry.slice(colonIndex + 1).trim();
    if (!val || /expression|url\(|javascript:/i.test(val)) continue;

    if (prop === "color" && SAFE_COLOR_PATTERN.test(val)) {
      declarations.push(`color: ${val}`);
    } else if (prop === "font-size") {
      const normalizedSize = KEYWORD_FONT_SIZE_MAP[val.toLowerCase()] || val;
      if (SAFE_FONT_SIZE_PATTERN.test(normalizedSize)) {
        declarations.push(`font-size: ${normalizedSize}`);
      }
    } else if (prop === "text-align" && SAFE_ALIGN_PATTERN.test(val)) {
      declarations.push(`text-align: ${val.toLowerCase()}`);
    } else if (prop === "font-weight" && SAFE_WEIGHT_PATTERN.test(val)) {
      declarations.push(`font-weight: ${val}`);
    } else if (prop === "font-style" && /^(normal|italic|oblique)$/i.test(val)) {
      declarations.push(`font-style: ${val.toLowerCase()}`);
    } else if (
      prop === "text-decoration" &&
      /^(none|underline|line-through|underline line-through)$/i.test(val)
    ) {
      declarations.push(`text-decoration: ${val.toLowerCase()}`);
    }
  }

  for (const extra of extraStyles) {
    if (extra) declarations.push(extra);
  }
  return declarations.join("; ");
};

export function sanitizeAnnouncementHtml(input) {
  let html = String(input ?? "");
  if (!html.trim()) return "";

  for (const tag of STRIP_WITH_CONTENT_TAGS) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  html = html.replace(/<!--[\s\S]*?-->/g, "");

  return html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (fullMatch, rawTag, rawAttrs) => {
    const isClosing = fullMatch.startsWith("</");
    const tag = rawTag.toLowerCase();

    if (tag === "font") {
      if (isClosing) return "</span>";
      const extraStyles = [];
      const color = getAttributeValue(rawAttrs, "color").trim();
      if (color && SAFE_COLOR_PATTERN.test(color)) {
        extraStyles.push(`color: ${color}`);
      }
      const size = getAttributeValue(rawAttrs, "size").trim();
      if (FONT_SIZE_MAP[size]) {
        extraStyles.push(`font-size: ${FONT_SIZE_MAP[size]}`);
      }
      const safeStyle = sanitizeStyleString(getAttributeValue(rawAttrs, "style"), extraStyles);
      return safeStyle ? `<span style="${escapeHtml(safeStyle)}">` : "<span>";
    }

    if (!ALLOWED_TAGS.has(tag)) return "";
    if (isClosing) return tag === "br" ? "" : `</${tag}>`;
    if (tag === "br") return "<br>";

    const extraStyles = [];
    const alignAttr = getAttributeValue(rawAttrs, "align").trim();
    if (alignAttr && SAFE_ALIGN_PATTERN.test(alignAttr)) {
      extraStyles.push(`text-align: ${alignAttr.toLowerCase()}`);
    }
    const safeStyle = sanitizeStyleString(getAttributeValue(rawAttrs, "style"), extraStyles);
    return safeStyle ? `<${tag} style="${escapeHtml(safeStyle)}">` : `<${tag}>`;
  });
}

export function stripAnnouncementHtml(input) {
  const raw = String(input ?? "");
  if (!raw) return "";
  const withBreaks = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "• ");
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toEditorValue(input) {
  const html = String(input ?? "");
  if (!html.trim()) return "";
  if (hasHtmlMarkup(html)) {
    return sanitizeAnnouncementHtml(html);
  }
  return decodeEntities(html);
}

export function formatAnnouncementBodyHtml(input) {
  const raw = String(input ?? "");
  if (!raw.trim()) return "";
  if (hasHtmlMarkup(raw)) {
    return sanitizeAnnouncementHtml(raw);
  }
  return escapeHtml(raw).replace(/\r?\n/g, "<br>");
}

export function toEditorHtml(input) {
  const raw = String(input ?? "");
  if (!raw.trim()) return "";
  if (hasHtmlMarkup(raw)) {
    return sanitizeAnnouncementHtml(raw);
  }
  return escapeHtml(raw).replace(/\r?\n/g, "<br>");
}
