<script setup lang="ts">
/**
 * 全屏考试绑定向导：医院挂号式磁贴页，单击卡片即绑定。
 */
import { computed, ref, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'
import KioskExamPickPanel from './KioskExamPickPanel.vue'
import '../styles/exam-pick-gate.scss'

const { workflow } = useKioskCtx()

const visible = computed(() => workflow.needsExamBindingGate.value)
const selectedExamId = ref<string>()
const binding = ref(false)

const scanReadyCount = computed(() => workflow.bindExamCandidateTotal.value)

const statusLabel = computed(() => {
  if (workflow.bindExamCandidateLoading.value) return '加载考试中'
  if (workflow.bindExamCandidateLoadIssue.value) return '考试列表加载失败'
  if (scanReadyCount.value <= 0) return '暂无可扫描考试'
  return `${scanReadyCount.value} 场可扫描`
})

const endpointLabel = computed(() => {
  const device = workflow.kioskContext.value?.device
  return device?.deviceName?.trim() || device?.scannerDeviceId || '扫描工位'
})

async function onConfirmBind(examId: string) {
  if (binding.value) return
  binding.value = true
  try {
    await workflow.bindKioskExam(examId)
  } finally {
    binding.value = false
  }
}

watch(
  visible,
  (show) => {
    if (!show) return
    selectedExamId.value = undefined
    workflow.resetBindExamCandidateFilter()
    void workflow.loadBindExamCandidates()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="visible" class="exam-gate" role="dialog" aria-modal="true">
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

      <div class="exam-gate__bar-action" aria-hidden="true" />
    </header>

    <main class="exam-gate__main">
      <h1 class="exam-gate__heading">绑定扫描考试</h1>

      <KioskExamPickPanel
        v-model:selected-exam-id="selectedExamId"
        class="exam-gate__panel"
        :class="{ 'exam-gate__panel--busy': binding || workflow.loading.value }"
        @confirm="onConfirmBind"
      />
    </main>
  </div>
</template>
