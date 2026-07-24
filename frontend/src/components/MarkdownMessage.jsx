import { useState } from 'react';

// ── Inline renderer (bold, italic, code, etc.) ────────────────

function renderInline(text) {
  const parts = [];
  // Split on bold, italic, code, or bold+italic. 
  // We'll use a simpler regex that matches chunks and processes them.
  let current = text;
  let keyCount = 0;

  const pushPart = (element) => { parts.push(<span key={keyCount++}>{element}</span>); };

  // This is a naive regex loop to replace standard markdown.
  // We do bold first, then italic, then code. (To keep it simple without heavy AST)
  const renderFormatted = (str) => {
    // Process code `...`
    const codeParts = str.split(/(`[^`]+`)/g);
    return codeParts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={`code-${i}`} className="md-inline-code">{part.slice(1, -1)}</code>;
      }
      // Process bold **...**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, j) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`b-${i}-${j}`}>{bp.slice(2, -2)}</strong>;
        }
        // Process italic *...* or _..._
        const italicParts = bp.split(/(\*[^*]+\*|_[^_]+_)/g);
        return italicParts.map((ip, k) => {
          if ((ip.startsWith('*') && ip.endsWith('*')) || (ip.startsWith('_') && ip.endsWith('_'))) {
            return <em key={`i-${i}-${j}-${k}`}>{ip.slice(1, -1)}</em>;
          }
          return ip; // Plain text
        });
      });
    });
  };

  return renderFormatted(text);
}

// ── Table parser helpers ──────────────────────────────────────

function splitRow(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function isSeparator(line) {
  return splitRow(line).every((c) => /^:?-{3,}:?$/.test(c));
}

// ── Markdown parser ───────────────────────────────────────────

function parseMarkdown(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const blocks = [];
  let para = [];
  let list = [];
  let listType = 'ul'; // 'ul' or 'ol'
  let codeLines = [];
  let codeLang = '';
  let inCode = false;

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'p', text: para.join('\n') }); para = []; }
  };
  const flushList = () => {
    if (list.length) { blocks.push({ type: listType, items: list }); list = []; }
  };
  const flushCode = () => {
    if (inCode) { blocks.push({ type: 'code', lang: codeLang, text: codeLines.join('\n') }); codeLines = []; codeLang = ''; inCode = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (t.startsWith('```')) {
      if (inCode) { flushCode(); }
      else { flushPara(); flushList(); inCode = true; codeLang = t.slice(3).trim(); }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }
    if (!t) { flushPara(); flushList(); continue; }
    if (t.startsWith('# ')) { flushPara(); flushList(); blocks.push({ type: 'h1', text: t.slice(2) }); continue; }
    if (t.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', text: t.slice(3) }); continue; }
    if (t.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', text: t.slice(4) }); continue; }
    if (t.startsWith('#### ')) { flushPara(); flushList(); blocks.push({ type: 'h4', text: t.slice(5) }); continue; }

    // Unordered List
    if (t.startsWith('- ') || t.startsWith('* ')) {
      flushPara();
      if (list.length > 0 && listType !== 'ul') flushList();
      listType = 'ul';
      list.push(t.slice(2));
      continue;
    }

    // Ordered List
    const olMatch = t.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      flushPara();
      if (list.length > 0 && listType !== 'ol') flushList();
      listType = 'ol';
      list.push(olMatch[2]);
      continue;
    }

    // Blockquote
    if (t.startsWith('> ')) {
      flushPara(); flushList();
      blocks.push({ type: 'blockquote', text: t.slice(2) });
      continue;
    }

    if (t.includes('|') && i + 1 < lines.length && isSeparator(lines[i + 1] || '')) {
      flushPara(); flushList();
      const tableRows = [t, lines[i + 1].trim()];
      i++;
      while (i + 1 < lines.length && lines[i + 1].includes('|')) {
        tableRows.push(lines[i + 1].trim());
        i++;
      }
      blocks.push({ type: 'table', rows: tableRows });
      continue;
    }

    if (list.length > 0) flushList();
    para.push(t);
  }

  flushPara();
  flushList();
  flushCode();
  return blocks;
}

// ── Code block with copy button ───────────────────────────────

function CodeBlock({ lang, text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silent
    }
  };

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'code'}</span>
        <button className="md-code-copy" type="button" onClick={handleCopy}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre className="md-code-pre"><code>{text}</code></pre>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function MarkdownMessage({ text }) {
  const blocks = parseMarkdown(text || '');

  return (
    <div className="md-body">
      {blocks.map((block, i) => {
        if (block.type === 'h1') return <h1 key={i}>{renderInline(block.text)}</h1>;
        if (block.type === 'h2') return <h2 key={i}>{renderInline(block.text)}</h2>;
        if (block.type === 'h3') return <h3 key={i}>{renderInline(block.text)}</h3>;

        if (block.type === 'h4') return <h4 key={i} className="md-h4">{renderInline(block.text)}</h4>;
        if (block.type === 'blockquote') return <blockquote key={i} className="md-quote">{renderInline(block.text)}</blockquote>;

        if (block.type === 'ul') {
          return (
            <ul key={i} className="md-list">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={i} className="md-list md-list-ordered">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ol>
          );
        }

        if (block.type === 'code') {
          return <CodeBlock key={i} lang={block.lang} text={block.text} />;
        }

        if (block.type === 'table') {
          const rows = block.rows.map(splitRow);
          const headers = rows[0] || [];
          const body = rows.slice(2);
          return (
            <div key={i} className="md-table-wrap">
              <table className="md-table">
                <thead>
                  <tr>{headers.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((row, j) => (
                    <tr key={j}>{row.map((cell, k) => <td key={k}>{renderInline(cell)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={i}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
