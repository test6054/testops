/** 批阅工作台键盘快捷键：判断当前焦点是否在文本输入控件，避免与表单输入冲突 */
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

/** Enter 提交时仍允许 a-input-number（spinbutton）触发，数字键快捷给分则一律拦截 input */
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
