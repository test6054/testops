/**
 * Select / DatePicker 下拉挂载点。
 * 统一挂载到 body，避免工作台卡片和滚动容器裁切下拉菜单。
 */
export function resolvePopupContainer(triggerNode?: HTMLElement | null): HTMLElement {
  if (typeof document === 'undefined')
    return triggerNode ?? ({} as HTMLElement)

  return document.body
}
