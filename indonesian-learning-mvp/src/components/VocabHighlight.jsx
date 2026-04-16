/**
 * 转义正则特殊字符，确保含括号等特殊字符的词语能被正确匹配。
 * @param {string} str
 * @returns {string}
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 将印尼语文本按 vocab_hints 拆分为普通文本段和高亮词段。
 * 保证所有 segment 的 content 拼接后与原始 text 完全相等。
 *
 * @param {string} text - 印尼语原文
 * @param {Array<{word: string, meaning: string, root: string, culture_hook: string}>} hints
 * @returns {Array<{type: 'text'|'highlight', content: string, hint?: object}>}
 */
export function splitTextWithHighlights(text, hints) {
  if (!hints || hints.length === 0) {
    return [{ type: 'text', content: text }]
  }

  // 1. 找出所有 hint.word 在 text 中的匹配位置（大小写不敏感）
  const matches = []
  for (const hint of hints) {
    if (!hint.word) continue
    const regex = new RegExp(escapeRegex(hint.word), 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, hint })
    }
  }

  // 2. 按 start 排序
  matches.sort((a, b) => a.start - b.start)

  // 3. 去除重叠（保留先出现的匹配）
  const nonOverlapping = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m)
      lastEnd = m.end
    }
  }

  // 4. 生成 segments
  const segments = []
  let cursor = 0
  for (const m of nonOverlapping) {
    if (m.start > cursor) {
      segments.push({ type: 'text', content: text.slice(cursor, m.start) })
    }
    segments.push({ type: 'highlight', content: text.slice(m.start, m.end), hint: m.hint })
    cursor = m.end
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', content: text.slice(cursor) })
  }

  return segments
}

/**
 * VocabHighlight 组件：在印尼语文本中渲染高亮词。
 *
 * @param {{ text: string, hints: object[], onWordClick: (hint: object) => void }} props
 */
export default function VocabHighlight({ text, hints, onWordClick }) {
  const segments = splitTextWithHighlights(text, hints)

  return (
    <span>
      {segments.map((seg, i) =>
        seg.type === 'highlight' ? (
          <span
            key={i}
            className="underline text-yellow-300 cursor-pointer hover:text-yellow-100 transition-colors"
            onClick={() => onWordClick(seg.hint)}
          >
            {seg.content}
          </span>
        ) : (
          <span key={i}>{seg.content}</span>
        )
      )}
    </span>
  )
}
