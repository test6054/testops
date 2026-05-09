/**
 * AI编辑器全局配置
 * 提供统一的AI编辑器配置和性能优化
 * 解决aieditor.js的性能问题和setTimeout超时警告
 */

import type { AiEditor, AiEditorOptions } from 'aieditor'

/**
 * 全局AI编辑器性能配置
 */
export const AIEDITOR_PERFORMANCE_CONFIG = {
  enableSpellCheck: true,
  enableAutoSave: true,
  enableHistoryTracking: true,
  debounceDelay: 300,
  updateThrottle: 500,
}

/**
 * 获取性能配置
 */
export function getPerformanceConfig() {
  return AIEDITOR_PERFORMANCE_CONFIG
}

/**
 * 创建优化的AI编辑器配置
 */
export function createOptimizedAiEditorConfig(baseConfig: Partial<AiEditorOptions> = {}): Partial<AiEditorOptions> {
  const perfConfig = getPerformanceConfig()

  // 如果是只读模式，不显示工具栏
  const toolbarKeys = baseConfig.editable === false
    ? []
    : (baseConfig.toolbarKeys || [
        'undo', 'redo', '|',
        'heading', 'font-size', '|',
        'bold', 'italic', 'underline', 'strike', 'code', '|',
        'align', '|',
        'bullet-list', 'ordered-list', 'indent-decrease', 'indent-increase', '|',
        'break', 'image', 'link', 'table',
      ])

  return {
    ...baseConfig,
    theme: baseConfig.theme || 'light',
    placeholder: baseConfig.placeholder || '请输入内容',
    toolbarKeys,
    // 工具栏位置：顶部
    // @ts-ignore - AiEditor 支持此配置但类型定义可能缺失
    textSelectionBubbleMenu: { enable: true },
    onChange: baseConfig.onChange && createDebouncedCallback(baseConfig.onChange, perfConfig.debounceDelay),
    onFocus: baseConfig.onFocus,
    onBlur: baseConfig.onBlur,
    onCreated: baseConfig.onCreated,
  }
}

/**
 * 创建防抖回调函数（仅用于 onChange 回调）
 */
function createDebouncedCallback(
  callback: (editor: AiEditor) => void,
  delay: number,
): (editor: AiEditor) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (editor: AiEditor) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      callback(editor)
      timeoutId = null
    }, delay)
  }
}

/**
 * 全局定时器管理器
 * 用于跟踪和清理AI编辑器相关的定时器
 */
class AiEditorTimerManager {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private static instance: AiEditorTimerManager | null = null

  static getInstance(): AiEditorTimerManager {
    if (!this.instance) {
      this.instance = new AiEditorTimerManager()
    }
    return this.instance
  }

  /**
   * 创建受管理的定时器
   */
  setTimeout(key: string, callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    this.clearTimeout(key)
    const timer = setTimeout(() => {
      callback()
      this.timers.delete(key)
    }, delay)

    this.timers.set(key, timer)
    return timer
  }

  /**
   * 清除定时器
   */
  clearTimeout(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * 清除所有定时器
   */
  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }
}

export const aiEditorTimerManager = AiEditorTimerManager.getInstance()

/**
 * 页面卸载时清理所有AI编辑器定时器
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    aiEditorTimerManager.clearAll()
  })
}
