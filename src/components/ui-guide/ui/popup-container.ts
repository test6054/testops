function ensurePopupPositionContext(container: HTMLElement) {
  if (typeof window === 'undefined' || container === document.body)
    return

  const { position } = window.getComputedStyle(container)

  if (position === 'static')
    container.style.position = 'relative'
}

export function resolvePopupContainer(triggerNode?: HTMLElement | null): HTMLElement {
  if (typeof document === 'undefined')
    return triggerNode ?? ({} as HTMLElement)

  const container = triggerNode?.parentElement ?? document.body

  ensurePopupPositionContext(container)

  return container
}
