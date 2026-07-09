<script setup lang="ts">
import type { KioskUiState } from './composables/kioskInjection'
/**
 * 扫描一体机工作站 - 持久 Layout（路由父级）
 */
import { computed, onActivated, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import KioskActivationGate from './components/KioskActivationGate.vue'
import KioskAppBar from './components/KioskAppBar.vue'
import KioskBottomBar from './components/KioskBottomBar.vue'
import KioskExamSwitchGate from './components/KioskExamSwitchGate.vue'
import KioskHistoryLedgerDrawer from './components/KioskHistoryLedgerDrawer.vue'
import KioskNoticeBand from './components/KioskNoticeBand.vue'
import KioskSettingsDrawer from './components/KioskSettingsDrawer.vue'
import KioskStageBar from './components/KioskStageBar.vue'
import KioskWorkbenchTabs from './components/KioskWorkbenchTabs.vue'
import { KIOSK_CTX_KEY } from './composables/kioskInjection'
import { useExamKioskWorkflow } from './composables/useExamKioskWorkflow'
import {
  SCANNER_EXAM_BIND_ROUTE,
  useKioskExamRouteGuard,
} from './composables/useKioskExamRouteGuard'
import { useKioskMutex } from './composables/useKioskMutex'
import { useStageMachine } from './composables/useStageMachine'

const route = useRoute()
const workflow = useExamKioskWorkflow()
const mutex = useKioskMutex(workflow)
const stage = useStageMachine(workflow)

useKioskExamRouteGuard(workflow)

const settingsDrawerOpen = ref(false)
const ui: KioskUiState = {
  settingsDrawerOpen,
  openSettings() {
    if (workflow.historyLedgerBatch.value) workflow.closeBatchHistoryLedger()
    settingsDrawerOpen.value = true
  },
  closeSettings() {
    settingsDrawerOpen.value = false
  },
  viewHistoryLedger(item) {
    if (settingsDrawerOpen.value) settingsDrawerOpen.value = false
    workflow.viewBatchHistoryLedger(item)
  },
  closeHistoryLedger() {
    workflow.closeBatchHistoryLedger()
  },
}

const ctx = { workflow, mutex, stage, ui }

provide(KIOSK_CTX_KEY, ctx)

const isBindShell = computed(() => route.name === SCANNER_EXAM_BIND_ROUTE)
const showBindBootstrap = computed(
  () =>
    isBindShell.value
    && workflow.examBindingBootstrapPending.value
    && !workflow.needsActivationGate.value,
)
const showBootstrapShell = computed(
  () =>
    workflow.examBindingBootstrapPending.value
    && !workflow.needsActivationGate.value
    && !isBindShell.value,
)
const showWorkbenchBody = computed(() => !isBindShell.value && !showBootstrapShell.value)
const showBottomBar = computed(
  () => showWorkbenchBody.value && stage.currentStage.value === 'scanning',
)
const showWorkbenchChrome = computed(
  () =>
    showWorkbenchBody.value
    && (stage.currentStage.value === 'setup' || stage.currentStage.value === 'history'),
)
const showStageBar = computed(
  () =>
    showWorkbenchBody.value
    && (stage.currentStage.value === 'scanning' || stage.currentStage.value === 'review'),
)

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
  <div class="kiosk-layout" :class="{ 'kiosk-layout--bind': isBindShell }">
    <template v-if="isBindShell">
      <div v-if="showBindBootstrap" class="kiosk-binding-bootstrap">
        <a-spin size="large" />
        <span>正在加载考试绑定状态…</span>
      </div>
      <router-view v-else v-slot="{ Component }">
        <transition name="stage-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </template>

    <template v-else-if="showBootstrapShell">
      <div class="kiosk-binding-bootstrap">
        <a-spin size="large" />
        <span>正在加载考试绑定状态…</span>
      </div>
    </template>

    <template v-else>
      <KioskAppBar />

      <KioskWorkbenchTabs v-if="showWorkbenchChrome" />
      <KioskStageBar v-else-if="showStageBar" />

      <KioskNoticeBand />

      <div class="kiosk-body kiosk-body--full">
        <main class="kiosk-main" :class="{ 'with-bottom': showBottomBar }">
          <router-view v-slot="{ Component }">
            <transition name="stage-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </main>
      </div>

      <transition name="bottom-bar-slide">
        <KioskBottomBar v-show="showBottomBar" />
      </transition>
    </template>

    <KioskActivationGate />
    <KioskExamSwitchGate />

    <KioskSettingsDrawer />
    <KioskHistoryLedgerDrawer />
  </div>
</template>

<style>
@import './styles/tokens.css';
</style>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.kiosk-layout {
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

.kiosk-layout--bind {
  display: block;
  grid-template-rows: none;
  overflow: auto;
}

.kiosk-binding-bootstrap {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-4);
  min-height: 100vh;
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-body);
}

.kiosk-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
</style>
