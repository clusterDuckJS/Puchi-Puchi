const ALLOWED_TAGS = new Set(["B", "BR", "DIV", "EM", "I", "LI", "OL", "P", "STRONG", "U", "UL"]);
const BLOCK_TAGS = new Set(["DIV", "P"]);
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE"]);

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ""));

const textToHtml = (value) => String(value || "")
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
  .join("");

const sanitizeNode = (node, document) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return document.createTextNode("");
  }

  if (DROPPED_TAGS.has(node.tagName)) {
    return document.createTextNode("");
  }

  if (!ALLOWED_TAGS.has(node.tagName)) {
    const fragment = document.createDocumentFragment();
    node.childNodes.forEach((child) => {
      fragment.appendChild(sanitizeNode(child, document));
    });
    return fragment;
  }

  const tagName = BLOCK_TAGS.has(node.tagName) ? "p" : node.tagName.toLowerCase();
  const element = document.createElement(tagName);
  node.childNodes.forEach((child) => {
    element.appendChild(sanitizeNode(child, document));
  });
  return element;
};

const sanitizeWithBrowser = (value) => {
  const parser = new DOMParser();
  const sourceHtml = hasHtmlTags(value) ? String(value || "") : textToHtml(value);
  const parsed = parser.parseFromString(sourceHtml, "text/html");
  const container = document.createElement("div");

  parsed.body.childNodes.forEach((node) => {
    container.appendChild(sanitizeNode(node, document));
  });

  return container.innerHTML
    .replace(/<p><\/p>/g, "")
    .trim();
};

export const sanitizeRichText = (value) => {
  if (!value) return "";

  if (typeof DOMParser === "undefined" || typeof document === "undefined") {
    return hasHtmlTags(value) ? "" : escapeHtml(value);
  }

  return sanitizeWithBrowser(value);
};

export const stripRichText = (value) => {
  if (!value) return "";

  if (typeof DOMParser === "undefined") {
    return String(value).replace(/<[^>]*>/g, " ");
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(sanitizeRichText(value), "text/html");
  return parsed.body.textContent?.replace(/\s+/g, " ").trim() || "";
};
