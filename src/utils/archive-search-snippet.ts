/**
 * 卷内 OCR 检索摘要高亮：后端 snippet 为纯文本，按关键词包裹 mark。
 */
export function highlightArchiveSearchSnippet(snippet: string, keyword: string): string {
  const trimmedKeyword = keyword.trim()
  if (!trimmedKeyword) {
    return escapeHtml(snippet)
  }
  const lowerSnippet = snippet.toLowerCase()
  const lowerKeyword = trimmedKeyword.toLowerCase()
  let cursor = 0
  let result = ''
  while (cursor < snippet.length) {
    const matchIndex = lowerSnippet.indexOf(lowerKeyword, cursor)
    if (matchIndex < 0) {
      result += escapeHtml(snippet.slice(cursor))
      break
    }
    result += escapeHtml(snippet.slice(cursor, matchIndex))
    result += `<mark class="archive-search-snippet-mark">${escapeHtml(
      snippet.slice(matchIndex, matchIndex + trimmedKeyword.length),
    )}</mark>`
    cursor = matchIndex + trimmedKeyword.length
  }
  return result
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
