<script setup lang="ts">
import type { KioskUiState } from './composables/kioskInjection'
/**
 * 扫描一体机工作站 - 持久 Layout（路由父级）
 *
 * 职责（拆分后）：
 *   - 实例化 3 个 composable：useKioskWorkflow / useKioskMutex / useStageMachine
 *   - 通过 provide(KIOSK_CTX_KEY) 下行给子组件 + 4 个 stage 子路由
 *   - 通过 useKioskShortcuts 装载全局键盘快捷键
 *   - 持久骨架：AppBar / StageBar / NoticeBand / SideRail / BottomBar 已拆为独立子组件
 *   - 主区是 <router-view>，由 4 个 stage 子路由轮换
 *
 * 此文件不再持有 UI 细节，仅负责 grid 布局与组件编排。
 */
import { computed, onActivated, provide, ref, watch } from 'vue'
import KioskActivationGate from './components/KioskActivationGate.vue'
import KioskAppBar from './components/KioskAppBar.vue'
import KioskBottomBar from './components/KioskBottomBar.vue'
import KioskExamBindingGate from './components/KioskExamBindingGate.vue'
import KioskExamSwitchGate from './components/KioskExamSwitchGate.vue'
import KioskHistoryLedgerDrawer from './components/KioskHistoryLedgerDrawer.vue'
import KioskNoticeBand from './components/KioskNoticeBand.vue'
import KioskScanParamsDrawer from './components/KioskScanParamsDrawer.vue'
import KioskSettingsDrawer from './components/KioskSettingsDrawer.vue'
import KioskShortcutHintOverlay from './components/KioskShortcutHintOverlay.vue'
import KioskSideRail from './components/KioskSideRail.vue'
import KioskStageBar from './components/KioskStageBar.vue'
import KioskWorkbenchTabs from './components/KioskWorkbenchTabs.vue'
import { KIOSK_CTX_KEY } from './composables/kioskInjection'
import { useExamKioskWorkflow } from './composables/useExamKioskWorkflow'
import { useKioskMutex } from './composables/useKioskMutex'
import { useKioskShortcuts } from './composables/useKioskShortcuts'
import { useStageMachine } from './composables/useStageMachine'

const workflow = useExamKioskWorkflow()
const mutex = useKioskMutex(workflow)
const stage = useStageMachine(workflow)

// UI 共享状态（抽屉互斥 + shortcut hints overlay）
const settingsDrawerOpen = ref(false)
const scanParamsDrawerOpen = ref(false)
const shortcutHintsOpen = ref(false)
const ui: KioskUiState = {
  settingsDrawerOpen,
  scanParamsDrawerOpen,
  shortcutHintsOpen,
  openSettings() {
    if (workflow.historyLedgerBatch.value) workflow.closeBatchHistoryLedger()
    scanParamsDrawerOpen.value = false
    settingsDrawerOpen.value = true
  },
  closeSettings() {
    settingsDrawerOpen.value = false
  },
  openScanParams() {
    if (workflow.historyLedgerBatch.value) workflow.closeBatchHistoryLedger()
    settingsDrawerOpen.value = false
    scanParamsDrawerOpen.value = true
  },
  closeScanParams() {
    scanParamsDrawerOpen.value = false
  },
  viewHistoryLedger(item) {
    // 互斥：先关 settings 再触发 ledger 拉取
    if (settingsDrawerOpen.value) settingsDrawerOpen.value = false
    workflow.viewBatchHistoryLedger(item)
  },
  closeHistoryLedger() {
    workflow.closeBatchHistoryLedger()
  },
  openShortcutHints() {
    shortcutHintsOpen.value = true
  },
  closeShortcutHints() {
    shortcutHintsOpen.value = false
  },
}

const ctx = { workflow, mutex, stage, ui }

provide(KIOSK_CTX_KEY, ctx)

// 全局键盘快捷键：←/→/Home/End/Space/Esc/Alt+1..4
useKioskShortcuts(ctx)

const showBottomBar = computed(() => stage.currentStage.value === 'scanning')
const showWorkbenchChrome = computed(
  () => stage.currentStage.value === 'setup' || stage.currentStage.value === 'history',
)
const showStageBar = computed(
  () => stage.currentStage.value === 'scanning' || stage.currentStage.value === 'review',
)
const showSideRail = computed(() => showStageBar.value)

// 静默对齐路由到自动推导阶段：首屏 refreshAll 完成后再 sync，避免 context 未就绪误跳 Step2
watch(
  () => workflow.kioskBootstrapPending.value,
  (pending) => {
    if (!pending) {
      stage.autoSyncOnce()
    }
  },
  { immediate: true },
)

onActivated(() => {
  void workflow.refreshAll().then(() => {
    stage.autoSyncOnce()
  })
})
</script>

<template>
  <div class="kiosk-layout">
    <KioskAppBar />

    <KioskWorkbenchTabs v-if="showWorkbenchChrome" />
    <KioskStageBar v-else-if="showStageBar" />

    <KioskNoticeBand />

    <div class="kiosk-body" :class="{ 'kiosk-body--full': !showSideRail }">
      <main class="kiosk-main" :class="{ 'with-bottom': showBottomBar }">
        <router-view v-slot="{ Component }">
          <transition name="stage-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <KioskSideRail v-if="showSideRail" class="kiosk-aside" />
    </div>

    <transition name="bottom-bar-slide">
      <KioskBottomBar v-show="showBottomBar" />
    </transition>

    <KioskActivationGate />
    <KioskExamBindingGate />
    <KioskExamSwitchGate />

    <KioskSettingsDrawer />
    <KioskScanParamsDrawer />

    <!-- 历史批次 ledger 抽屉（点击 HistoryStage 行触发） -->
    <KioskHistoryLedgerDrawer />

    <!-- 键盘快捷键参考卡 overlay（按 ? 打开） -->
    <KioskShortcutHintOverlay />
  </div>
</template>

<style>
@import './styles/tokens.css';
</style>

<style scoped>
.kiosk-layout {
  --rail-width: var(--kiosk-w-side-rail);

  display: grid;
  grid-template-rows:
    var(--kiosk-h-app-bar)
    var(--kiosk-h-stage-bar)
    minmax(0, 1fr);
  height: 100vh;
  background: var(--kiosk-page-bg);
  font-family: var(--kiosk-font-display);
  color: var(--kiosk-ink-primary);
  font-size: var(--kiosk-fz-body);
  overflow: hidden;
}

.kiosk-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--rail-width);
  gap: var(--kiosk-space-4);
  padding: var(--kiosk-space-4);
  min-height: 0;
  overflow: hidden;
}

.kiosk-body--full {
  grid-template-columns: minmax(0, 1fr);
}

.kiosk-main {
  min-width: 0;
  min-height: 0;
  background: transparent;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.kiosk-main.with-bottom {
  padding-bottom: calc(var(--kiosk-h-bottom-bar) + var(--kiosk-space-3));
}

.kiosk-aside {
  /* 子组件自身 box-shadow / border-radius 完整保留；这里只控制位置 */
}

/* ===================== Transitions ===================== */

.stage-fade-enter-active,
.stage-fade-leave-active {
  transition:
    opacity var(--kiosk-dur-base) var(--kiosk-easing),
    transform var(--kiosk-dur-base) var(--kiosk-easing);
}
.stage-fade-enter-from,
.stage-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.bottom-bar-slide-enter-active,
.bottom-bar-slide-leave-active {
  transition:
    transform var(--kiosk-dur-slow) var(--kiosk-easing),
    opacity var(--kiosk-dur-slow) var(--kiosk-easing);
}
.bottom-bar-slide-enter-from,
.bottom-bar-slide-leave-to {
  transform: translateY(120%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .stage-fade-enter-active,
  .stage-fade-leave-active,
  .bottom-bar-slide-enter-active,
  .bottom-bar-slide-leave-active {
    transition: none !important;
  }
}

/* ===================== Responsive ===================== */

@media (max-width: 1280px) {
  .kiosk-layout {
    --rail-width: 300px;
  }
}

@media (max-width: 1024px) {
  .kiosk-layout {
    --rail-width: 0;
  }
  .kiosk-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .kiosk-aside {
    display: none;
  }
}
</style>
