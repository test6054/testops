/**
 * 头像输入契约工具
 * 仅允许真实资源地址进入图片头像分支，避免把姓名缩写或占位文本当成图片地址加载。
 */
export function isAvatarUrl(value?: string): boolean {
  if (!value) {
    return false
  }

  const source = value.trim()
  if (!source) {
    return false
  }

  return source.startsWith('http://')
    || source.startsWith('https://')
    || source.startsWith('data:')
    || source.startsWith('blob:')
    || source.startsWith('/')
    || source.startsWith('./')
    || source.startsWith('../')
    || source.includes('/')
}

export function normalizeAvatarUrl(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const source = value.trim()
  return isAvatarUrl(source) ? source : undefined
}
