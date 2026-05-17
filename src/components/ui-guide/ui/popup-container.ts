function ensurePopupPositionContext(container: HTMLElement) {
  if (typeof window === 'undefined' || container === document.body)
    return

  const { position } = window.getComputedStyle(container)

  if (position === 'static')
    container.style.position = 'relative'
}

export function resolvePopupContainer(triggerNode?: HTMLElement | null): HTMLElement {
  // SSR 阶段没有 DOM，弹层组件不应在服务端渲染期间挂载；显式抛错让调用错误立刻可见。
  if (typeof document === 'undefined')
    throw new Error('resolvePopupContainer 不应在 SSR 环境调用：弹层只应在客户端 mounted 后挂载')

  const container = triggerNode?.parentElement ?? document.body

  ensurePopupPositionContext(container)

  return container
}
