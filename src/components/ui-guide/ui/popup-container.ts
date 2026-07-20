function ensurePopupPositionContext(container: HTMLElement) {
  if (typeof window === 'undefined' || container === document.body)
    return

  const { position } = window.getComputedStyle(container)

  if (position === 'static')
    container.style.position = 'relative'
}

/**
 * Select / DatePicker 下拉挂载点。
 * 创建页滚动区（overflow:auto/hidden）内挂 body，避免课程等下拉被裁切成「不能展示」。
 */
export function resolvePopupContainer(triggerNode?: HTMLElement | null): HTMLElement {
  if (typeof document === 'undefined')
    return triggerNode ?? ({} as HTMLElement)

  if (triggerNode?.closest('.create-form-page')) {
    return document.body
  }

  const container = triggerNode?.parentElement ?? document.body

  ensurePopupPositionContext(container)

  return container
}
