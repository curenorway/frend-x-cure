/**
 * Rich Text Converter
 *
 * Converts Storyblok's rich text JSON format to Webflow-compatible HTML.
 *
 * Storyblok uses a ProseMirror-like JSON schema:
 * https://www.storyblok.com/docs/richtext-field
 *
 * Webflow expects standard HTML.
 */

/**
 * Convert Storyblok rich text JSON to HTML
 * @param {Object} richtextDoc - Storyblok rich text document
 * @returns {String} HTML string
 */
export function convertRichText(richtextDoc) {
  if (!richtextDoc) return '';

  // If it's already a string, return it
  if (typeof richtextDoc === 'string') {
    return richtextDoc;
  }

  // If it's not a valid rich text doc
  if (!richtextDoc.type || richtextDoc.type !== 'doc') {
    console.warn('Invalid rich text document:', richtextDoc);
    return '';
  }

  // Convert the document content
  const content = richtextDoc.content || [];
  return content.map(node => convertNode(node)).join('');
}

/**
 * Convert a single node to HTML
 */
function convertNode(node) {
  if (!node || !node.type) return '';

  const converter = nodeConverters[node.type];

  if (!converter) {
    console.warn(`Unknown node type: ${node.type}`, node);
    return '';
  }

  return converter(node);
}

/**
 * Apply marks (bold, italic, etc.) to text
 */
function applyMarks(text, marks = []) {
  if (!marks || marks.length === 0) return escapeHtml(text);

  let result = escapeHtml(text);

  // Apply marks in order
  for (const mark of marks) {
    result = applyMark(result, mark);
  }

  return result;
}

/**
 * Apply a single mark
 */
function applyMark(text, mark) {
  switch (mark.type) {
    case 'bold':
      return `<strong>${text}</strong>`;

    case 'italic':
      return `<em>${text}</em>`;

    case 'underline':
      return `<u>${text}</u>`;

    case 'strike':
      return `<s>${text}</s>`;

    case 'code':
      return `<code>${text}</code>`;

    case 'link':
      const href = mark.attrs?.href || '#';
      const target = mark.attrs?.target || '';
      const targetAttr = target ? ` target="${target}"` : '';
      return `<a href="${escapeHtml(href)}"${targetAttr}>${text}</a>`;

    case 'styled':
      // Custom styling - could map to classes if needed
      return text;

    case 'textStyle':
      // Text color, etc. - Webflow might not support inline styles
      return text;

    default:
      console.warn(`Unknown mark type: ${mark.type}`);
      return text;
  }
}

/**
 * Node type converters
 */
const nodeConverters = {
  // Block nodes
  paragraph: (node) => {
    const content = convertContent(node.content);
    if (!content.trim()) return '<p></p>\n';
    return `<p>${content}</p>\n`;
  },

  heading: (node) => {
    const level = node.attrs?.level || 1;
    const content = convertContent(node.content);
    return `<h${level}>${content}</h${level}>\n`;
  },

  blockquote: (node) => {
    const content = convertContent(node.content);
    return `<blockquote>${content}</blockquote>\n`;
  },

  code_block: (node) => {
    const content = convertTextContent(node.content);
    const language = node.attrs?.class || '';
    return `<pre><code${language ? ` class="${language}"` : ''}>${content}</code></pre>\n`;
  },

  horizontal_rule: () => {
    return '<hr>\n';
  },

  hard_break: () => {
    return '<br>\n';
  },

  // List nodes
  bullet_list: (node) => {
    const items = convertContent(node.content);
    return `<ul>\n${items}</ul>\n`;
  },

  ordered_list: (node) => {
    const items = convertContent(node.content);
    const start = node.attrs?.order || 1;
    const startAttr = start > 1 ? ` start="${start}"` : '';
    return `<ol${startAttr}>\n${items}</ol>\n`;
  },

  list_item: (node) => {
    const content = convertContent(node.content);
    return `  <li>${content}</li>\n`;
  },

  // Inline nodes
  text: (node) => {
    return applyMarks(node.text || '', node.marks);
  },

  image: (node) => {
    const src = node.attrs?.src || '';
    const alt = node.attrs?.alt || '';
    const title = node.attrs?.title || '';
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}>\n`;
  },

  // Storyblok-specific nodes
  blok: (node) => {
    // Nested component blocks - we'll handle these specially
    // For now, just log a warning and skip
    console.warn('Nested blok found in rich text - this needs special handling:', node);
    return '<!-- Nested component - needs manual handling -->\n';
  },

  emoji: (node) => {
    const emoji = node.attrs?.emoji || '';
    const name = node.attrs?.name || '';
    const fallback = node.attrs?.fallback || name;
    return emoji || fallback || '';
  }
};

/**
 * Convert node content (array of child nodes)
 */
function convertContent(content = []) {
  return content.map(node => convertNode(node)).join('');
}

/**
 * Convert content to plain text (no HTML)
 */
function convertTextContent(content = []) {
  return content
    .map(node => {
      if (node.type === 'text') {
        return node.text || '';
      }
      return convertTextContent(node.content);
    })
    .join('');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strip HTML tags (for plain text conversion)
 */
export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Convert rich text to plain text (no formatting)
 */
export function convertToPlainText(richtextDoc) {
  const html = convertRichText(richtextDoc);
  return stripHtml(html).trim();
}

/**
 * Get text excerpt from rich text (first N characters)
 */
export function getExcerpt(richtextDoc, maxLength = 160) {
  const text = convertToPlainText(richtextDoc);

  if (text.length <= maxLength) {
    return text;
  }

  // Find last space before maxLength
  const trimmed = text.substring(0, maxLength);
  const lastSpace = trimmed.lastIndexOf(' ');

  if (lastSpace > 0) {
    return trimmed.substring(0, lastSpace) + '...';
  }

  return trimmed + '...';
}
