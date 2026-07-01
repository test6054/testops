<script setup lang="ts">
/**
 * 全屏考试绑定向导：工位激活后、未绑定考试时独占屏幕，对标讯飞「任务已定再扫描」。
 */
import type { ExamScannerKioskExamOptionVO } from '@/apis/mark/scanner-kiosk'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow } = useKioskCtx()

const visible = computed(() => workflow.needsExamBindingGate.value)
const selectedExamId = ref<string>()
const binding = ref(false)

const examSelectOptions = computed(() =>
  workflow.examOptions.value.map((opt) => ({
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

async function confirmBind() {
  if (!selectedExamId.value || binding.value) return
  binding.value = true
  try {
    await workflow.bindKioskExam(selectedExamId.value)
  } finally {
    binding.value = false
  }
}

watch(
  visible,
  (show) => {
    if (!show) return
    selectedExamId.value = undefined
    workflow.resetExamOptionFilter()
    void workflow.loadExamOptions()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="visible" class="gate" role="dialog" aria-modal="true">
    <div class="gate__panel">
      <h1>绑定扫描考试</h1>
      <p class="gate__lead">
        请搜索并选择本场要扫描的考试，确认后进入工作台。系统不会自动绑定列表中的第一项。
      </p>

      <div class="field">
        <span class="field__label">考试</span>
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

      <button
        type="button"
        class="primary-btn"
        :disabled="!selectedExamId || binding || workflow.loading.value"
        @click="confirmBind"
      >
        {{ binding ? '绑定中…' : '确认绑定并进入工作台' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.gate {
  position: fixed;
  inset: 0;
  z-index: calc(var(--kiosk-z-modal, 1200) - 1);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--kiosk-page-bg);
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

.primary-btn {
  width: 100%;
  height: 48px;
  background: var(--kiosk-primary);
  color: #fff;
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  font-weight: var(--kiosk-fw-semibold);
  cursor: pointer;
}

.primary-btn:disabled {
  background: var(--kiosk-neutral);
  cursor: not-allowed;
}
</style>
