import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Automatically wraps unescaped LaTeX math formulas or symbols with $...$
 * so that students always see formatted math instead of raw LaTeX code.
 */
function autoFormatLatex(text: string): string {
  if (!text) return '';

  // If the entire text starts with LaTeX environment or is a single raw formula without $
  const trimmed = text.trim();
  if (
    !trimmed.includes('$') &&
    (trimmed.startsWith('\\begin{') ||
      trimmed.startsWith('\\frac') ||
      trimmed.startsWith('\\sqrt') ||
      trimmed.startsWith('\\Delta') ||
      trimmed.includes('\\frac{') ||
      trimmed.includes('\\sqrt{') ||
      trimmed.includes('\\begin{cases}') ||
      trimmed.includes('\\pm') ||
      trimmed.includes('\\Delta') ||
      trimmed.includes('\\cdot') ||
      trimmed.includes('\\times') ||
      trimmed.includes('\\int_') ||
      /^[a-zA-Z0-9_\^\+\-\*\/\=\(\)\s\\]+=[a-zA-Z0-9_\^\+\-\*\/\=\(\)\s\\]+$/.test(trimmed))
  ) {
    if (trimmed.startsWith('\\begin{cases}') || trimmed.startsWith('\\begin{aligned}')) {
      return `$$${trimmed}$$`;
    }
    return `$${trimmed}$`;
  }

  // Auto-wrap standalone LaTeX patterns like \frac{...}{...}, \sqrt{...}, \Delta, \pm, \le, \ge, \neq
  // only if they are not already inside $...$
  let processed = text;

  // Protect existing $$...$$ and $...$
  const tokens: string[] = [];
  processed = processed.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (match) => {
    tokens.push(match);
    return `___MATH_TOKEN_${tokens.length - 1}___`;
  });

  // Auto-wrap unescaped \begin{cases} ... \end{cases}
  processed = processed.replace(/(\\begin\{cases\}[\s\S]*?\\end\{cases\})/g, '$$$1$$');

  // Auto-wrap unescaped LaTeX commands and formulas
  processed = processed.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\[\]]*\])*)/g, (match) => {
    // Exclude basic markdown escaped characters if any
    return `$${match}$`;
  });

  // Restore protected math tokens
  processed = processed.replace(/___MATH_TOKEN_(\d+)___/g, (_, idx) => tokens[parseInt(idx, 10)] || '');

  return processed;
}

export const MathView: React.FC<MathViewProps> = ({ content, className = '', inline = false }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    try {
      let text = autoFormatLatex(content);

      // 1. Replace display math $$...$$
      text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
            strict: false,
          });
          return `<div class="math-block-container my-3 py-1 text-center overflow-x-auto select-text">${rendered}</div>`;
        } catch {
          return `<div class="my-2 text-center text-slate-700 font-mono">${math}</div>`;
        }
      });

      // 2. Replace inline math $...$
      text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
            strict: false,
          });
          return `<span class="inline-math px-1 py-0.5 text-slate-900 font-medium">${rendered}</span>`;
        } catch {
          return `<span class="font-mono text-slate-800">${math}</span>`;
        }
      });

      // 3. Format basic markdown: **bold**, *italic*
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
      text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-800">$1</em>');

      // 4. Split into paragraphs and line breaks
      if (inline) {
        return text;
      }

      text = text
        .split('\n\n')
        .map((paragraph) => {
          if (paragraph.startsWith('<div class="math-block-container"')) {
            return paragraph;
          }
          const formatted = paragraph.replace(/\n/g, '<br/>');
          return `<div class="mb-2 leading-relaxed">${formatted}</div>`;
        })
        .join('');

      return text;
    } catch (e) {
      console.warn('KaTeX render warning:', e);
      return content;
    }
  }, [content, inline]);

  if (inline) {
    return (
      <span
        className={`inline-math-wrapper ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <div
      className={`math-content text-slate-800 break-words leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
