<script setup lang="ts">
/**
 * 已绑定考试后切换工位考试；医院挂号式磁贴页，单击卡片即切换。
 */
import { computed, ref, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'
import KioskExamPickPanel from './KioskExamPickPanel.vue'
import '../styles/exam-pick-gate.scss'

const { workflow } = useKioskCtx()

const visible = computed(() => workflow.examSwitchGateOpen.value)
const selectedExamId = ref<string>()
const switching = ref(false)

const currentExamLabel = computed(() => {
  const exam = workflow.kioskContext.value?.exam
  if (!exam) return workflow.examId.value || '—'
  return exam.examName
})

const scanReadyCount = computed(() => workflow.bindExamCandidateTotal.value)

const statusLabel = computed(() => {
  if (workflow.bindExamCandidateLoading.value === true) return '加载考试中'
  if (workflow.bindExamCandidateLoadIssue.value) return '考试列表加载失败'
  if (scanReadyCount.value <= 0) return '暂无可切换考试'
  return `${scanReadyCount.value} 场可切换`
})

const endpointLabel = computed(() => {
  const device = workflow.kioskContext.value?.device
  return device?.deviceName?.trim() || device?.scannerDeviceId || '扫描工位'
})

function closeGate() {
  workflow.closeExamSwitchGate()
}

async function onConfirmSwitch(examId: string) {
  if (switching.value === true) return
  switching.value = true
  try {
    await workflow.bindKioskExam(examId)
    selectedExamId.value = undefined
  } finally {
    switching.value = false
  }
}

watch(visible, (show) => {
  if (!show) {
    selectedExamId.value = undefined
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="exam-gate exam-gate--overlay" role="dialog" aria-modal="true">
      <header class="exam-gate__bar">
        <div class="exam-gate__brand">
          <div class="exam-gate__logo" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--kiosk-primary)" />
              <path
                d="M9 11h14M9 16h14M9 21h9"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <div class="exam-gate__brand-text">
            <span class="exam-gate__brand-title">扫描工作站</span>
            <span class="exam-gate__brand-sub">{{ endpointLabel }}</span>
          </div>
        </div>

        <div class="exam-gate__status">
          <span class="exam-gate__status-dot" />
          <span>{{ statusLabel }}</span>
        </div>

        <div class="exam-gate__bar-action">
          <button type="button" class="exam-gate__ghost-btn" @click="closeGate">取消</button>
        </div>
      </header>

      <main class="exam-gate__main">
        <h1 class="exam-gate__heading">切换扫描考试</h1>
        <p class="exam-gate__heading-sub">当前：{{ currentExamLabel }}</p>

        <KioskExamPickPanel
          v-model:selected-exam-id="selectedExamId"
          :exclude-exam-id="workflow.examId.value"
          class="exam-gate__panel"
          :class="{
            'exam-gate__panel--busy': switching === true || workflow.bindExamCandidateLoading.value === true,
          }"
          :interaction-locked="switching === true"
          :instant-bind="true"
          @confirm="onConfirmSwitch"
        />

        <p v-if="workflow.errorMessage.value.trim()" class="exam-gate__switch-error" role="alert">
          {{ workflow.errorMessage.value }}
        </p>
      </main>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.exam-gate__switch-error {
  margin: 0;
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-danger-soft);
  color: var(--kiosk-danger);
  font-size: var(--kiosk-fz-body);
  line-height: 1.5;
}
</style>
