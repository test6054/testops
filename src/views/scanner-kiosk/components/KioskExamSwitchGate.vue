<script setup lang="ts">
/**
 * 已绑定考试后切换工位考试；与首次绑定向导分离，由顶部「当前考试」入口打开。
 */
import type { ExamScannerKioskExamOptionVO } from '@/apis/mark/scanner-kiosk'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const visible = computed(() => workflow.examSwitchGateOpen.value)
const selectedExamId = ref<string>()
const switching = ref(false)

const currentExamLabel = computed(() => {
  const exam = workflow.kioskContext.value?.exam
  if (!exam) return workflow.examId.value || '—'
  return exam.examName
})

const examSelectOptions = computed(() =>
  workflow.examOptions.value
    .filter((opt) => opt.examId !== workflow.examId.value)
    .map((opt) => ({
      value: opt.examId,
      label: formatExamLabel(opt),
    })),
)

function formatExamLabel(opt: ExamScannerKioskExamOptionVO): string {
  const parts = [opt.examName, opt.examNo]
  if (opt.courseName) parts.push(opt.courseName)
  return parts.join(' · ')
}

function onSearch(keyword: string) {
  workflow.onExamSelectSearch(keyword)
}

function closeGate() {
  workflow.closeExamSwitchGate()
}

async function confirmSwitch() {
  if (!selectedExamId.value || switching.value) return
  switching.value = true
  try {
    await workflow.bindKioskExam(selectedExamId.value)
    selectedExamId.value = undefined
  } finally {
    switching.value = false
  }
}

watch(visible, (show) => {
  if (!show) {
    selectedExamId.value = undefined
    return
  }
  workflow.resetExamOptionFilter()
  void workflow.loadExamOptions()
})
</script>

<template>
  <div v-if="visible" class="gate" role="dialog" aria-modal="true" @click.self="closeGate">
    <div class="gate__panel">
      <h1>切换扫描考试</h1>
      <p class="gate__lead">
        当前工位：<strong>{{ currentExamLabel }}</strong>。选择其他考试后将重新加载工作台上下文。
      </p>

      <div class="field">
        <span class="field__label">切换到</span>
        <div class="field__row">
          <a-select
            v-model:value="selectedExamId"
            show-search
            allow-clear
            placeholder="搜索并选择考试"
            :options="examSelectOptions"
            :filter-option="false"
            :loading="workflow.examOptionLoading.value"
            class="exam-select"
            @search="onSearch"
          />
          <button
            type="button"
            class="icon-btn"
            :disabled="workflow.examOptionLoading.value"
            @click="workflow.refreshExamOptionsByUser"
          >
            <ReloadOutlined :spin="workflow.examOptionLoading.value" />
          </button>
        </div>
      </div>

      <div class="gate__actions">
        <button type="button" class="ghost-btn" @click="closeGate">取消</button>
        <button
          type="button"
          class="primary-btn"
          :disabled="!selectedExamId || switching || workflow.loading.value"
          @click="confirmSwitch"
        >
          {{ switching ? '切换中…' : '确认切换' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: var(--kiosk-z-modal, 1200);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: var(--kiosk-space-6);
}

.gate__panel {
  width: min(560px, 100%);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-6);
  box-shadow: var(--kiosk-shadow-2);
}

.gate__panel h1 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-h1);
  font-weight: var(--kiosk-fw-bold);
}

.gate__lead {
  margin: 0 0 var(--kiosk-space-5);
  color: var(--kiosk-ink-secondary);
}

.gate__lead strong {
  color: var(--kiosk-ink-primary);
}

.field__label {
  display: block;
  margin-bottom: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
}

.field__row {
  display: flex;
  gap: var(--kiosk-space-2);
  margin-bottom: var(--kiosk-space-5);
}

.exam-select {
  flex: 1;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  cursor: pointer;
}

.gate__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--kiosk-space-3);
}

.ghost-btn,
.primary-btn {
  height: 48px;
  padding: 0 var(--kiosk-space-5);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.ghost-btn {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  color: var(--kiosk-ink-secondary);
}

.primary-btn {
  background: var(--kiosk-primary);
  color: #fff;
  border: none;
}

.primary-btn:disabled {
  background: var(--kiosk-neutral);
  cursor: not-allowed;
}
</style>
