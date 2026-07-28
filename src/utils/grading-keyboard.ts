/**
 * 批阅 / 全局快捷键：判断焦点是否在可编辑控件，避免与表单输入冲突。
 * 可选体系：仅在非输入态生效，不强制打断教师正常打字。
 */

/** 是否处于文本输入控件（数字键快捷给分须拦截） */
export function isGradingKeyboardInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'textarea' || tagName === 'select') {
    return true
  }
  if (target.isContentEditable) {
    return true
  }
  return tagName === 'input'
}

/**
 * Enter 提交时仍允许 a-input-number（spinbutton）触发，数字键快捷给分则一律拦截 input。
 */
export function isGradingEnterInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'textarea' || tagName === 'select') {
    return true
  }
  if (target.isContentEditable) {
    return true
  }
  return tagName === 'input' && target.getAttribute('role') !== 'spinbutton'
}

/**
 * 单键导航（Space/字母）须避开按钮、链接、菜单项，避免抢走原生激活语义。
 */
export function isShortcutBlockingTarget(target: EventTarget | null): boolean {
  if (isGradingKeyboardInputTarget(target)) {
    return true
  }
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tagName = target.tagName.toLowerCase()
  if (tagName === 'button' || tagName === 'a' || tagName === 'summary') {
    return true
  }
  return Boolean(
    target.closest(
      'button, a, [role="button"], [role="menuitem"], [role="tab"], [role="option"], [contenteditable="true"]',
    ),
  )
}

/** 修饰键是否按下（跨平台 Cmd/Ctrl） */
export function isModKey(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey
}
