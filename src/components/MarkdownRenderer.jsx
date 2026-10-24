import React from "react";

/**
 * Innova Sphere — Secure React Markdown Renderer
 *
 * Renders Markdown headings, bold text, italics, ordered lists,
 * bullet lists, and links into safe React JSX elements WITHOUT using
 * dangerouslySetInnerHTML (100% XSS-safe).
 *
 * Correctly unescapes escaped markdown characters such as \*\* or 1\.
 */

// Unescape common backslash-escaped characters
function unescapeMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\\(\*)/g, "$1")
    .replace(/\\(_)/g, "$1")
    .replace(/\\(#)/g, "$1")
    .replace(/\\(\.)/g, "$1")
    .replace(/\\(-)/g, "$1")
    .replace(/\\(\[)/g, "$1")
    .replace(/\\(\])/g, "$1");
}

/**
 * Tokenize and parse inline markdown elements:
 * - Links: [text](url) or https://...
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Code: `code`
 */
function parseInline(text, keyPrefix = "inline") {
  if (!text) return [];

  // Match:
  // 1. Markdown link: [label](url)
  // 2. Raw URL: https?://\S+
  // 3. Bold: \*\*([^*]+)\*\*
  // 4. Inline code: `([^`]+)`
  // 5. Italic: \*([^*]+)\*
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s)]+|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;

  const elements = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (match[2] && match[3]) {
      // [label](url)
      elements.push(
        <a
          key={key}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="ap-md-link"
        >
          {match[2]}
        </a>
      );
    } else if (fullMatch.startsWith("http://") || fullMatch.startsWith("https://")) {
      // Raw URL
      const cleanUrl = fullMatch.replace(/[.,;!?]+$/, "");
      elements.push(
        <a
          key={key}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ap-md-link"
        >
          {cleanUrl}
        </a>
      );
    } else if (match[4]) {
      // **bold**
      elements.push(
        <strong key={key} className="ap-md-strong">
          {parseInline(match[4], `${key}-bold`)}
        </strong>
      );
    } else if (match[5]) {
      // `code`
      elements.push(
        <code key={key} className="ap-md-code">
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      // *italic*
      elements.push(
        <em key={key} className="ap-md-em">
          {match[6]}
        </em>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

export default function MarkdownRenderer({ content = "" }) {
  if (!content) return null;

  const cleaned = unescapeMarkdown(content);
  const lines = cleaned.split("\n");

  const blocks = [];
  let currentList = null; // { type: 'ol' | 'ul', items: [] }

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Heading 3 or 4: ### Heading or #### Heading
    const h3Match = trimmed.match(/^###\s+(.*)$/);
    const h2Match = trimmed.match(/^##\s+(.*)$/);
    const h1Match = trimmed.match(/^#\s+(.*)$/);
    if (h3Match || h2Match || h1Match) {
      flushList();
      const title = (h3Match || h2Match || h1Match)[1];
      blocks.push({
        type: h1Match ? "h3" : h2Match ? "h4" : "h4",
        text: title,
      });
      continue;
    }

    // Numbered list item: 1. Item or 1) Item
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList();
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    // Bullet list item: • Item, - Item, * Item
    const bulletMatch = trimmed.match(/^([•\-*])\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList();
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      continue;
    }

    // Regular paragraph
    flushList();
    blocks.push({
      type: "p",
      text: rawLine,
    });
  }

  flushList();

  return (
    <div className="ap-markdown-body">
      {blocks.map((block, idx) => {
        if (block.type === "h3") {
          return (
            <h3 key={idx} className="ap-md-h3">
              {parseInline(block.text, `h3-${idx}`)}
            </h3>
          );
        }
        if (block.type === "h4") {
          return (
            <h4 key={idx} className="ap-md-h4">
              {parseInline(block.text, `h4-${idx}`)}
            </h4>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={idx} className="ap-md-ol">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="ap-md-li">
                  {parseInline(item, `ol-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} className="ap-md-ul">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="ap-md-li">
                  {parseInline(item, `ul-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="ap-md-p">
            {parseInline(block.text, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}
