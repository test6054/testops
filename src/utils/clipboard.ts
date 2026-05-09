import message from 'ant-design-vue/es/message'

/**
 * 复制文本到剪贴板
 * 使用 Clipboard API（所有现代浏览器均支持）
 *
 * @param text 要复制的文本
 */
export const copyText = async (text: string | number): Promise<void> => {
  const textStr = String(text)
  try {
    await navigator.clipboard.writeText(textStr)
    message.success('复制成功')
  } catch {
    message.error('复制失败，请手动复制')
  }
}
