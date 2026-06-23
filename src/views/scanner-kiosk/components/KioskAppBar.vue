<script setup lang="ts">
/**
 * KioskAppBar - 顶部持久 bar
 *
 * 内容：
 *   左   · Brand mark + 名称（始终）
 *   中   · 当前考试 pill（点击跳到 setup stage）
 *   右   · SSE LED + 刷新 / 设备设置
 *
 * 自取 ctx，不接受 prop。父级通过 provide(KIOSK_CTX_KEY) 注入。
 */
import {
  QuestionCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { computed } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, stage, ui } = useKioskCtx()

const examPillLabel = computed(() => {
  const exam = workflow.kioskContext.value?.exam
  if (!exam) return '未选择考试'
  return exam.examName
})

const examPillSub = computed(() => {
  const exam = workflow.kioskContext.value?.exam
  if (!exam) return '请前往「准备」选考试'
  const term = workflow.examTermText.value
  return [exam.examNo, term].filter(Boolean).join(' · ')
})

const sseLedTitle = computed(() =>
  workflow.sseStreaming.value ? '实时流：已连接' : '实时流：未连接',
)

const refreshButtonDisabled = computed(() => workflow.loading.value)

function handleExamPillClick() {
  if (workflow.kioskContext.value?.kioskLockEnabled && workflow.kioskContext.value?.kioskBoundExamId) {
    return
  }
  if (stage.currentStage.value !== 'setup') stage.gotoStage('setup')
}

function handleRefresh() {
  if (workflow.loading.value) return
  workflow.refreshAll()
}

function handleOpenSettings() {
  ui.openSettings()
}

function handleOpenHints() {
  ui.openShortcutHints()
}
</script>

<template>
  <header class="app-bar">
    <div class="app-bar-brand">
      <span class="brand-mark" />
      <div class="brand-text">
        <strong>扫描工作站</strong>
        <span>纸质试卷在线批改 · 一体机端</span>
      </div>
    </div>

    <div class="app-bar-exam">
      <button type="button" class="exam-pill" @click="handleExamPillClick">
        <span class="exam-pill-label">当前考试</span>
        <span class="exam-pill-value" :title="examPillSub">{{ examPillLabel }}</span>
        <span class="exam-pill-caret">▾</span>
      </button>
    </div>

    <div class="app-bar-tools">
      <span class="sse-led" :class="{ active: workflow.sseStreaming.value }" :title="sseLedTitle" />
      <button
        type="button"
        class="icon-button"
        title="刷新工作台 [F5 / Ctrl+R 由浏览器处理]"
        :disabled="refreshButtonDisabled"
        @click="handleRefresh"
      >
        <ReloadOutlined />
      </button>
      <button type="button" class="icon-button" title="键盘快捷键 [?]" @click="handleOpenHints">
        <QuestionCircleOutlined />
      </button>
      <button type="button" class="icon-button" title="设备设置" @click="handleOpenSettings">
        <SettingOutlined />
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) minmax(420px, 2fr) auto;
  align-items: center;
  gap: var(--kiosk-space-5);
  height: var(--kiosk-h-app-bar);
  padding: 0 var(--kiosk-space-6);
  background: var(--kiosk-surface);
  border-bottom: 1px solid var(--kiosk-divider);
  z-index: var(--kiosk-z-app-bar);
}

.app-bar-brand {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-primary);
  position: relative;
}
.brand-mark::after {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: var(--kiosk-radius-sm);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-text strong {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.brand-text span {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.app-bar-exam {
  justify-self: stretch;
}

.exam-pill {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  width: 100%;
  height: 48px;
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.exam-pill:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
}
.exam-pill:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.exam-pill-label {
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-tertiary);
}
.exam-pill-value {
  flex: 1;
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exam-pill-caret {
  color: var(--kiosk-ink-tertiary);
}

.app-bar-tools {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
}

.sse-led {
  width: var(--kiosk-led-size);
  height: var(--kiosk-led-size);
  border-radius: 50%;
  background: var(--kiosk-neutral);
  margin-right: var(--kiosk-space-2);
  transition: background var(--kiosk-dur-base) var(--kiosk-easing);
}
.sse-led.active {
  background: var(--kiosk-success);
  box-shadow: 0 0 0 var(--kiosk-led-ring) var(--kiosk-success-soft);
}

.icon-button {
  width: var(--kiosk-h-icon-button);
  height: var(--kiosk-h-icon-button);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-secondary);
  font-size: 20px;
  cursor: pointer;
  transition:
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.icon-button:hover:not(:disabled) {
  background: var(--kiosk-primary-soft);
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
