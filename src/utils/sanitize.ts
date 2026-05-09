/**
 * HTML 消毒工具
 * 基于 DOMPurify 提供不同场景的 XSS 防护
 */
import DOMPurify from 'dompurify'

/**
 * 消毒用户生成的富文本内容（消息、评论等）
 * 仅保留基础格式化标签，移除所有危险元素和事件处理器
 */
export function sanitizeUserHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'del', 's',
      'a', 'img',
      'ul', 'ol', 'li',
      'span', 'div',
      'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'class', 'style',
    ],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * 消毒 Markdown 渲染输出（marked/markdown 解析后的 HTML）
 * 保留 marked 输出的常用标签，移除危险元素
 */
export function sanitizeMarkdownHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'del', 's', 'sub', 'sup',
      'a', 'img',
      'ul', 'ol', 'li',
      'span', 'div',
      'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'pre', 'code',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'hr',
      'dl', 'dt', 'dd',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'src', 'alt', 'width', 'height',
      'class', 'style',
      'colspan', 'rowspan', 'align',
    ],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * 消毒管理员创建的富文本内容（公告、通知等）
 * 允许更多标签（富文本编辑器输出），但仍然移除脚本和事件处理器
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  })
}
