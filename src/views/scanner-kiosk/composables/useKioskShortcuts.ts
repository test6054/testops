import type { KioskCtx } from './kioskInjection'
/**
 * useKioskShortcuts - 全局键盘快捷键绑定
 *
 * 设计原则：
 *   1. 仅在 KioskLayout 中调用一次（避免多次绑定 window listener）
 *   2. 仅处理 *跨 stage 公共* 快捷键；stage 内部纯视图键（如缩放 +/-）由各 stage 自处理
 *   3. 焦点在 INPUT / TEXTAREA / contenteditable 时全部跳过
 *   4. Alt+1/2/3 切 stage 在所有阶段生效（其它修饰键不处理）
 *   5. 当 shortcutHintsOpen=true 时，仅响应 Esc（由 hint overlay 内部处理），其它键全部跳过
 *
 * 公共键映射：
 *   ←        上一页（仅 scanning / review）
 *   →        下一页（仅 scanning / review）
 *   Home     首页
 *   End      末页
 *   Space    暂停/继续（仅 scanning 阶段，且有 currentJob 处于 SCANNING/PAUSED）
 *   Esc      关闭全局通知
 *   ?        打开键盘快捷键参考卡
 *   Alt+1    切到 setup
 *   Alt+2    切到 scanning
 *   Alt+3    切到 review
 *   Alt+1..3 切 stage（Alt+4 已移除；历史页从侧栏进入）
 */
import { notification } from 'ant-design-vue'
import { onBeforeUnmount, onMounted } from 'vue'
import { KIOSK_NOTICE_KEY } from '../constants/kioskNotice'
import { KIOSK_STAGES } from './useStageMachine'

/**
 * 判断键盘事件是否应被忽略（焦点在可编辑元素上）。
 * 命中以下任一即跳过：input / textarea / select / contenteditable=true。
 */
function shouldIgnoreKey(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (target as HTMLElement).isContentEditable;
}

/**
 * Space 键专用守卫：button / [role=button] 元素在 focus 时浏览器本身把 Space 映射为 click，
 * 我们的全局 listener 必须避开这些 case，否则会出现 BottomBar 「暂停」按钮 + 全局 Space 双触发。
 */
function isSpaceOnButton(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  if (target.tagName === 'BUTTON') return true
  return target.getAttribute && target.getAttribute('role') === 'button';
}

export function useKioskShortcuts(ctx: KioskCtx): void {
  const { workflow, stage, ui } = ctx

  function getCurrentPageIndex(): number {
    if (!workflow.previewPageNo.value) return -1
    return workflow.visiblePages.value.findIndex(
      (p) => p.pageNo === workflow.previewPageNo.value,
    )
  }

  function gotoPrevPage() {
    const idx = getCurrentPageIndex()
    if (idx > 0) {
      workflow.previewPageNo.value = workflow.visiblePages.value[idx - 1].pageNo
    } else if (idx < 0 && workflow.visiblePages.value.length > 0) {
      // 没选中任何页时，上一页应跳到末页
      const pages = workflow.visiblePages.value
      workflow.previewPageNo.value = pages[pages.length - 1].pageNo
    }
  }

  function gotoNextPage() {
    const idx = getCurrentPageIndex()
    const pages = workflow.visiblePages.value
    if (idx >= 0 && idx < pages.length - 1) {
      workflow.previewPageNo.value = pages[idx + 1].pageNo
    } else if (idx < 0 && pages.length > 0) {
      // 没选中任何页时，下一页应跳到首页
      workflow.previewPageNo.value = pages[0].pageNo
    }
  }

  function gotoFirstPage() {
    const pages = workflow.visiblePages.value
    if (pages.length) workflow.previewPageNo.value = pages[0].pageNo
  }

  function gotoLastPage() {
    const pages = workflow.visiblePages.value
    if (pages.length) workflow.previewPageNo.value = pages[pages.length - 1].pageNo
  }

  function toggleScanPauseResume() {
    const job = workflow.currentJob.value
    if (!job) return
    // 仅在可暂停 / 可继续的状态下响应
    if (job.status === 'PAUSED') {
      workflow.resumeCurrentJob()
    } else if (job.status === 'SCANNING') {
      workflow.pauseCurrentJob()
    }
  }

  function clearAllNotices() {
    let cleared = false
    if (workflow.errorMessage.value) {
      workflow.errorMessage.value = ''
      cleared = true
    }
    if (workflow.successMessage.value) {
      workflow.successMessage.value = ''
      cleared = true
    }
    notification.close(KIOSK_NOTICE_KEY)
    return cleared
  }

  function onKeyDown(event: KeyboardEvent) {
    if (shouldIgnoreKey(event)) return

    // 帮助卡打开时让 overlay 自己处理 Esc，其它全局键全部跳过避免双触发
    if (ui.shortcutHintsOpen.value) return

    // ? 键打开帮助卡（独立分支，不论焦点在哪都生效；Shift+/ 物理键产生 '?'）
    if (event.key === '?') {
      event.preventDefault()
      ui.openShortcutHints()
      return
    }

    // Alt+1/2/3 切 stage（独立分支，不论焦点在哪都生效）
    if (event.altKey && /^[1-3]$/.test(event.key)) {
      const idx = Number.parseInt(event.key, 10) - 1
      const target = KIOSK_STAGES[idx]
      if (target) {
        event.preventDefault()
        stage.gotoStage(target.id)
      }
      return
    }

    // 其它修饰键组合不处理（避免与浏览器/系统快捷键冲突）
    if (event.altKey || event.ctrlKey || event.metaKey) return

    const cur = stage.currentStage.value

    // Esc - 关闭全局通知（任何阶段）
    if (event.key === 'Escape') {
      if (clearAllNotices()) event.preventDefault()
      return
    }

    // 翻页：scanning / review 阶段
    if (cur === 'scanning' || cur === 'review') {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          gotoPrevPage()
          return
        case 'ArrowRight':
          event.preventDefault()
          gotoNextPage()
          return
        case 'Home':
          event.preventDefault()
          gotoFirstPage()
          return
        case 'End':
          event.preventDefault()
          gotoLastPage()
          return
      }
    }

    // Space - 暂停/继续，仅 scanning 阶段
    // 守卫：焦点在 button 上时让浏览器原生 click 触发，不重复处理（避免 BottomBar 暂停按钮双触发）
    if (cur === 'scanning' && (event.key === ' ' || event.code === 'Space')) {
      if (isSpaceOnButton(event)) return
      const job = workflow.currentJob.value
      if (job && (job.status === 'SCANNING' || job.status === 'PAUSED')) {
        event.preventDefault()
        toggleScanPauseResume()
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
