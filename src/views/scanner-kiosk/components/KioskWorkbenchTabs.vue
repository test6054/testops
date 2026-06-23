<script setup lang="ts">
/**
 * 讯飞式主 Tab：扫描答卷 / 扫描记录。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()
const route = useRoute()
const router = useRouter()

const activeTab = computed<'scan' | 'records'>(() => {
  if (route.name === 'ScannerKioskHistory') return 'records'
  return workflow.workbenchTab.value
})

function goScan() {
  workflow.workbenchTab.value = 'scan'
  if (route.name !== 'ScannerKioskSetup') {
    router.push({ name: 'ScannerKioskSetup', query: route.query })
  }
}

function goRecords() {
  workflow.workbenchTab.value = 'records'
  if (route.name !== 'ScannerKioskHistory') {
    router.push({ name: 'ScannerKioskHistory', query: route.query })
  }
}
</script>

<template>
  <nav class="wb-tabs" aria-label="扫描工作台">
    <button
      type="button"
      class="wb-tabs__item"
      :class="{ 'wb-tabs__item--active': activeTab === 'scan' }"
      @click="goScan"
    >
      扫描答卷
    </button>
    <button
      type="button"
      class="wb-tabs__item"
      :class="{ 'wb-tabs__item--active': activeTab === 'records' }"
      @click="goRecords"
    >
      扫描记录
    </button>
  </nav>
</template>

<style scoped>
.wb-tabs {
  display: flex;
  gap: var(--kiosk-space-6);
  height: var(--kiosk-h-stage-bar);
  padding: 0 var(--kiosk-space-6);
  background: var(--kiosk-surface);
  border-bottom: 1px solid var(--kiosk-divider);
}

.wb-tabs__item {
  position: relative;
  height: 100%;
  padding: 0 var(--kiosk-space-1);
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
}

.wb-tabs__item--active {
  color: var(--kiosk-primary);
  font-weight: var(--kiosk-fw-semibold);
}

.wb-tabs__item--active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--kiosk-primary);
  border-radius: 3px 3px 0 0;
}
</style>
