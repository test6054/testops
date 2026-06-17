<script setup lang="ts">
/**
 * KioskShortcutHintOverlay - 键盘快捷键参考卡（modal overlay）
 *
 * 触发：按 `?` 键打开（由 useKioskShortcuts 调用 ui.openShortcutHints()）。
 * 关闭：点遮罩 / 关闭按钮 / Esc 键。
 *
 * 显示分组：
 *   1. 全局键（Alt+1..4 / Esc / Space）
 *   2. 翻页键（←/→/Home/End）
 *   3. ScanningStage 视图键（缩放/旋转/灰度）
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { ui } = useKioskCtx()

const open = computed(() => ui.shortcutHintsOpen.value)

interface ShortcutItem {
  keys: string[]
  desc: string
  scope?: string
}

interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

const GROUPS: ShortcutGroup[] = [
  {
    title: '阶段切换',
    items: [
      { keys: ['Alt', '1'], desc: '准备扫描' },
      { keys: ['Alt', '2'], desc: '扫描中' },
      { keys: ['Alt', '3'], desc: '复核与异常处置' },
    ],
  },
  {
    title: '翻页（仅扫描中 / 复核）',
    items: [
      { keys: ['←'], desc: '上一页' },
      { keys: ['→'], desc: '下一页' },
      { keys: ['Home'], desc: '第一页' },
      { keys: ['End'], desc: '末页' },
    ],
  },
  {
    title: '扫描中视图',
    items: [
      { keys: ['Space'], desc: '暂停 / 继续扫描', scope: '当前批次进行中' },
      { keys: ['+', '='], desc: '放大' },
      { keys: ['-'], desc: '缩小' },
      { keys: ['0'], desc: '重置视图（缩放 / 旋转 / 灰度）' },
      { keys: ['R'], desc: '右转 90°' },
      { keys: ['Shift', 'R'], desc: '左转 90°' },
      { keys: ['G'], desc: '切换灰度' },
    ],
  },
  {
    title: '通用',
    items: [
      { keys: ['Esc'], desc: '关闭通知 / 抽屉 / 本帮助卡' },
      { keys: ['?'], desc: '打开本快捷键帮助卡' },
    ],
  },
]

// Esc 关闭
function onKeyDown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    ui.closeShortcutHints()
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) window.addEventListener('keydown', onKeyDown, { capture: true })
    else window.removeEventListener('keydown', onKeyDown, { capture: true })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown, { capture: true })
})
</script>

<template>
  <Teleport to="body">
    <transition name="hint-fade">
      <div
        v-if="open"
        class="hint-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="键盘快捷键参考"
        @click.self="ui.closeShortcutHints"
      >
        <div class="hint-card" role="document">
          <header class="hint-head">
            <h2>键盘快捷键</h2>
            <button
              type="button"
              class="hint-close"
              title="关闭 [Esc]"
              @click="ui.closeShortcutHints"
            >
              ×
            </button>
          </header>

          <div class="hint-body">
            <section v-for="group in GROUPS" :key="group.title" class="hint-group">
              <h3>{{ group.title }}</h3>
              <ul>
                <li v-for="item in group.items" :key="item.desc" class="hint-row">
                  <span class="hint-keys">
                    <template v-for="(k, idx) in item.keys" :key="k">
                      <kbd>{{ k }}</kbd>
                      <span v-if="idx < item.keys.length - 1" class="plus">+</span>
                    </template>
                  </span>
                  <span class="hint-desc">
                    {{ item.desc }}
                    <small v-if="item.scope">（{{ item.scope }}）</small>
                  </span>
                </li>
              </ul>
            </section>
          </div>

          <footer class="hint-foot">
            <small> 焦点在输入框 / 文本域 / 抽屉内表单时所有快捷键自动失效，避免误触。 </small>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.hint-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(13, 19, 32, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--kiosk-space-5);
  z-index: var(--kiosk-z-modal);
}

.hint-card {
  width: min(720px, 100%);
  max-height: min(90vh, 720px);
  background: var(--kiosk-surface);
  border-radius: var(--kiosk-radius-lg);
  box-shadow: var(--kiosk-shadow-overlay);
  display: flex;
  flex-direction: column;
  font-family: var(--kiosk-font-display);
  color: var(--kiosk-ink-primary);
  overflow: hidden;
}

.hint-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  border-bottom: 1px solid var(--kiosk-divider);
}
.hint-head h2 {
  margin: 0;
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
}
.hint-close {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: 22px;
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.hint-close:hover {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}

.hint-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--kiosk-space-5) var(--kiosk-space-6);
}

.hint-group h3 {
  margin: 0 0 var(--kiosk-space-3);
  padding-bottom: var(--kiosk-space-2);
  border-bottom: 1px solid var(--kiosk-divider);
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.hint-group ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.hint-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--kiosk-space-3);
}
.hint-keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
}
.hint-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 28px;
  padding: 0 var(--kiosk-space-2);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-bottom-width: 2px;
  border-radius: var(--kiosk-radius-sm);
  font-variant-numeric: tabular-nums;
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.plus {
  color: var(--kiosk-ink-tertiary);
  font-size: var(--kiosk-fz-caption);
}

.hint-desc {
  flex: 1;
  text-align: right;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}
.hint-desc small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  margin-left: 2px;
}

.hint-foot {
  padding: var(--kiosk-space-3) var(--kiosk-space-5);
  border-top: 1px solid var(--kiosk-divider);
  background: var(--kiosk-surface-alt);
}
.hint-foot small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity var(--kiosk-dur-base) var(--kiosk-easing);
}
.hint-fade-enter-active .hint-card,
.hint-fade-leave-active .hint-card {
  transition:
    transform var(--kiosk-dur-base) var(--kiosk-easing),
    opacity var(--kiosk-dur-base) var(--kiosk-easing);
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
}
.hint-fade-enter-from .hint-card,
.hint-fade-leave-to .hint-card {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}

@media (max-width: 1024px) {
  .hint-body {
    grid-template-columns: 1fr;
  }
}
</style>
