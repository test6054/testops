<script setup lang="ts">
import type { KioskUiState } from '../composables/kioskInjection'
import { computed, onActivated, onMounted, provide, ref } from 'vue'
import KioskActivationGate from '../components/KioskActivationGate.vue'
import KioskAppBar from '../components/KioskAppBar.vue'
import KioskBottomBar from '../components/KioskBottomBar.vue'
import KioskExamBindingGate from '../components/KioskExamBindingGate.vue'
import KioskExamSwitchGate from '../components/KioskExamSwitchGate.vue'
import KioskHistoryLedgerDrawer from '../components/KioskHistoryLedgerDrawer.vue'
import KioskNoticeBand from '../components/KioskNoticeBand.vue'
import KioskScanParamsDrawer from '../components/KioskScanParamsDrawer.vue'
import KioskSettingsDrawer from '../components/KioskSettingsDrawer.vue'
import KioskShortcutHintOverlay from '../components/KioskShortcutHintOverlay.vue'
import KioskSideRail from '../components/KioskSideRail.vue'
import KioskStageBar from '../components/KioskStageBar.vue'
import KioskWorkbenchTabs from '../components/KioskWorkbenchTabs.vue'
import { KIOSK_CTX_KEY } from '../composables/kioskInjection'
import { useExamKioskWorkflow } from '../composables/useExamKioskWorkflow'
import { useKioskMutex } from '../composables/useKioskMutex'
import { useKioskShortcuts } from '../composables/useKioskShortcuts'
import { useStageMachine } from '../composables/useStageMachine'

const workflow = useExamKioskWorkflow()
const mutex = useKioskMutex(workflow)
const stage = useStageMachine(workflow)

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
useKioskShortcuts(ctx)

const showBottomBar = computed(() => stage.currentStage.value === 'scanning')
const showWorkbenchChrome = computed(() =>
  stage.currentStage.value === 'setup' || stage.currentStage.value === 'history',
)
const showStageBar = computed(() =>
  stage.currentStage.value === 'scanning' || stage.currentStage.value === 'review',
)
const showSideRail = computed(() => showStageBar.value)

onMounted(() => {
  setTimeout(() => stage.autoSyncOnce(), 0)
})

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
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
      <KioskSideRail v-if="showSideRail" />
    </div>
    <KioskBottomBar v-if="showBottomBar" />
    <KioskActivationGate />
    <KioskExamBindingGate />
    <KioskExamSwitchGate />
    <KioskSettingsDrawer />
    <KioskScanParamsDrawer />
    <KioskHistoryLedgerDrawer />
    <KioskShortcutHintOverlay />
  </div>
</template>

<style scoped>
@import '../styles/tokens.css';

.kiosk-layout {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  height: 100vh;
  background: var(--kiosk-bg);
  color: var(--kiosk-text);
}

.kiosk-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  min-height: 0;
  overflow: hidden;
}

.kiosk-body--full {
  grid-template-columns: 1fr;
}

.kiosk-main {
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.kiosk-main.with-bottom {
  padding-bottom: 72px;
}
</style>
