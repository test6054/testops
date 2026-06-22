<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamScannerKioskExamOptionVO } from '@/apis/mark/scanner-kiosk'
/**
 * Stage 1 - 准备扫描：考试下拉 + 模式分段 + 开始按钮，单屏完成配置。
 */
import { ExclamationCircleOutlined, PlayCircleFilled, ReloadOutlined } from '@ant-design/icons-vue'
import { computed, watch } from 'vue'
import { getSemesterDescription } from '@/types'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, mutex } = useKioskCtx()

const examIdModel = computed({
  get: () => workflow.examId.value || undefined,
  set: (v: SelectValue) => workflow.onExamSelectChange(v ?? ''),
})

const examSelectOptions = computed(() =>
  workflow.examOptions.value.map((opt) => ({
    value: opt.examId,
    label: formatExamLabel(opt),
  })),
)

function formatExamLabel(opt: ExamScannerKioskExamOptionVO): string {
  const parts = [opt.examName, opt.examNo]
  if (opt.courseName) parts.push(opt.courseName)
  if (opt.scanBatchCount > 0) parts.push(`已扫${opt.scanBatchCount}批`)
  return parts.join(' · ')
}

const isSupplement = computed(() => workflow.scanMode.value === 'SUPPLEMENT')
const classChips = computed(() => workflow.declaredClassChips.value)
const scanConfigOptions = computed(() => workflow.kioskContext.value?.scanConfigOptions)
const dpiOptions = computed(() =>
  (scanConfigOptions.value?.allowedDpis ?? [300]).map((dpi) => ({ value: dpi, label: `${dpi} DPI` })),
)
const colorModeOptions = computed(() =>
  (scanConfigOptions.value?.colorModes ?? ['COLOR', 'GRAY', 'LINEART']).map((mode) => ({
    value: mode,
    label: workflow.scannerColorModeLabel(mode),
  })),
)
const duplexModeOptions = computed(() =>
  (scanConfigOptions.value?.duplexModes ?? ['SIMPLEX']).map((mode) => ({
    value: mode,
    label: workflow.scannerDuplexModeLabel(mode),
  })),
)
const startReason = computed(() => mutex.reasonOf('startScan'))

// 触屏直选阈值：选项 ≤4 时用 seg 分段直选，>4 退回 a-select 下拉
const SEG_MAX_OPTIONS = 4
const useDpiSeg = computed(() => dpiOptions.value.length <= SEG_MAX_OPTIONS)
const useColorSeg = computed(() => colorModeOptions.value.length <= SEG_MAX_OPTIONS)
const useDuplexSeg = computed(() => duplexModeOptions.value.length <= SEG_MAX_OPTIONS)
const paramsDisabled = computed(() => !workflow.canSwitchScanMode.value || !scanConfigOptions.value)
const blockingMessage = computed(() => {
  if (!workflow.examId.value) return '请选择考试'
  return workflow.scanBlockedReason.value || startReason.value || ''
})

const SCAN_MODES = [
  { id: 'DIRECT' as const, label: '首次扫描' },
  { id: 'SUPPLEMENT' as const, label: '补扫' },
  { id: 'ARCHIVE' as const, label: '历史存档' },
]

function onExamSearch(keyword: string) {
  workflow.onExamSelectSearch(keyword)
}

function selectMode(mode: 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE') {
  if (mode !== workflow.scanMode.value) workflow.changeScanMode(mode)
}

function selectSupplementVariant(replace: boolean) {
  if (workflow.canSwitchScanMode.value) workflow.supplementReplaceTargetPage.value = replace
}

function startScan() {
  if (workflow.canStartScan.value) workflow.submitScanJob()
}

watch(
  () => workflow.examId.value,
  (newId) => {
    if (!newId) return
    const exists = workflow.examOptions.value.some((x) => x.examId === newId)
    if (!exists) workflow.loadExamOptions()
  },
  { immediate: true },
)
</script>

<template>
  <section class="setup">
    <header class="setup__head">
      <h2>准备扫描</h2>
      <p>选择考试、扫描模式与扫描参数，确认后即可开始本批次。</p>
    </header>

    <article class="setup__panel">
      <div class="field">
        <label class="field__label">考试</label>
        <div class="field__row">
          <a-select
            v-model:value="examIdModel"
            show-search
            allow-clear
            placeholder="搜索并选择考试"
            :options="examSelectOptions"
            :filter-option="false"
            :loading="workflow.examOptionLoading.value"
            :disabled="!workflow.canSwitchExam.value"
            class="exam-select"
            @search="onExamSearch"
          />
          <button
            type="button"
            class="icon-btn"
            :disabled="!workflow.canSwitchExam.value || workflow.examOptionLoading.value"
            :title="mutex.reasonOf('switchExam') || '刷新考试列表'"
            @click="workflow.refreshExamOptionsByUser"
          >
            <ReloadOutlined :spin="workflow.examOptionLoading.value" />
          </button>
        </div>

        <p v-if="workflow.selectedExamOption.value" class="field__hint">
          {{ workflow.selectedExamOption.value.examNo }}
          <template v-if="workflow.selectedExamOption.value.academicYear">
            · {{ workflow.selectedExamOption.value.academicYear }}
          </template>
          <template v-if="workflow.selectedExamOption.value.semester">
            · {{ getSemesterDescription(workflow.selectedExamOption.value.semester) }}
          </template>
          · 已扫批次 {{ workflow.selectedExamOption.value.scanBatchCount }}
        </p>
      </div>

      <div class="field">
        <label class="field__label">扫描模式</label>
        <div class="seg" role="group">
          <button
            v-for="mode in SCAN_MODES"
            :key="mode.id"
            type="button"
            class="seg__btn"
            :class="{ 'seg__btn--active': workflow.scanMode.value === mode.id }"
            :disabled="!workflow.canSwitchScanMode.value"
            :title="mutex.reasonOf('switchScanMode') || mode.label"
            @click="selectMode(mode.id)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <label class="field__label">扫描参数</label>
        <div class="scan-params">
          <div class="scan-params__row">
            <span class="scan-params__label">分辨率</span>
            <div v-if="useDpiSeg" class="seg seg--params" role="group">
              <button
                v-for="opt in dpiOptions"
                :key="opt.value"
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--active': workflow.scanConfig.value.dpi === opt.value }"
                :disabled="paramsDisabled"
                @click="workflow.scanConfig.value.dpi = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <a-select
              v-else
              v-model:value="workflow.scanConfig.value.dpi"
              :options="dpiOptions"
              :disabled="paramsDisabled"
              class="scan-params__select"
            />
          </div>
          <div class="scan-params__row">
            <span class="scan-params__label">色彩</span>
            <div v-if="useColorSeg" class="seg seg--params" role="group">
              <button
                v-for="opt in colorModeOptions"
                :key="opt.value"
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--active': workflow.scanConfig.value.colorMode === opt.value }"
                :disabled="paramsDisabled"
                @click="workflow.scanConfig.value.colorMode = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <a-select
              v-else
              v-model:value="workflow.scanConfig.value.colorMode"
              :options="colorModeOptions"
              :disabled="paramsDisabled"
              class="scan-params__select"
            />
          </div>
          <div class="scan-params__row">
            <span class="scan-params__label">单双面</span>
            <div v-if="useDuplexSeg" class="seg seg--params" role="group">
              <button
                v-for="opt in duplexModeOptions"
                :key="opt.value"
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--active': workflow.scanConfig.value.duplexMode === opt.value }"
                :disabled="paramsDisabled"
                @click="workflow.scanConfig.value.duplexMode = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <a-select
              v-else
              v-model:value="workflow.scanConfig.value.duplexMode"
              :options="duplexModeOptions"
              :disabled="paramsDisabled"
              class="scan-params__select"
            />
          </div>
          <label class="scan-params__check">
            <input
              v-model="workflow.scanConfig.value.blankPageDetectionEnabled"
              type="checkbox"
              :disabled="!workflow.canSwitchScanMode.value"
            />
            <span>启用空白页检测</span>
          </label>
        </div>
      </div>

      <div v-if="isSupplement" class="supp">
        <div class="supp__grid">
          <div class="supp__cell">
            <span class="supp__label">补扫方式</span>
            <div class="seg seg--sm" role="group">
              <button
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--active': !workflow.supplementReplaceTargetPage.value }"
                :disabled="!workflow.canSwitchScanMode.value"
                @click="selectSupplementVariant(false)"
              >
                追加
              </button>
              <button
                type="button"
                class="seg__btn"
                :class="{ 'seg__btn--active': workflow.supplementReplaceTargetPage.value }"
                :disabled="!workflow.canSwitchScanMode.value"
                @click="selectSupplementVariant(true)"
              >
                替换页
              </button>
            </div>
          </div>
          <div class="supp__cell supp__cell--page">
            <span class="supp__label">目标页号</span>
            <input
              v-model.number="workflow.supplementTargetPageNo.value"
              type="number"
              min="1"
              class="supp__input"
              :disabled="!workflow.canSwitchScanMode.value"
              placeholder="≥ 1"
            />
          </div>
        </div>
        <div class="supp__reason">
          <span class="supp__label">补扫原因</span>
          <input
            v-model="workflow.supplementReason.value"
            type="text"
            maxlength="120"
            class="supp__input"
            :disabled="!workflow.canSwitchScanMode.value"
            placeholder="漏扫、卡纸损坏、识别异常需替换等"
          />
        </div>
      </div>

      <div v-if="classChips.length" class="classes">
        <span class="classes__label">班级</span>
        <div class="classes__chips">
          <span
            v-for="chip in classChips"
            :key="chip.key"
            class="chip"
            :class="{ 'chip--missing': chip.missing }"
            :title="chip.label"
          >{{ chip.label }}</span>
        </div>
      </div>

      <div class="setup__foot">
        <p v-if="!workflow.canStartScan.value && blockingMessage" class="setup__warn">
          <ExclamationCircleOutlined />
          <span>{{ blockingMessage }}</span>
        </p>
        <button
          type="button"
          class="start-btn"
          :disabled="!workflow.canStartScan.value"
          :title="startReason || '开始扫描'"
          @click="startScan"
        >
          <PlayCircleFilled />
          <span>开始{{ workflow.scanModeText(workflow.scanMode.value, '') }}</span>
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.setup {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
}

.setup__head h2 {
  margin: 0 0 var(--kiosk-space-1);
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}

.setup__head p {
  margin: 0 0 var(--kiosk-space-4);
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}

.setup__panel {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  box-shadow: var(--kiosk-shadow-1);
}

.field__label {
  display: block;
  margin-bottom: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
}

.field__row {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
}

.exam-select {
  flex: 1;
  min-width: 0;
}

.exam-select :deep(.ant-select-selector) {
  height: var(--kiosk-h-input) !important;
  border-radius: var(--kiosk-radius-md) !important;
  align-items: center;
}

.field__hint {
  margin: var(--kiosk-space-2) 0 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--kiosk-h-input);
  height: var(--kiosk-h-input);
  flex-shrink: 0;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}

.icon-btn:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.scan-params {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
}

.scan-params__row {
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: center;
  gap: var(--kiosk-space-2);
}

.scan-params__label {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.scan-params__select {
  width: 100%;
}

/* 触屏直选：扫描参数 ≤4 选项时用分段按钮替代下拉 */
.seg--params {
  width: 100%;
}

.scan-params__check {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
  cursor: pointer;
}

.scan-params__check input {
  width: 16px;
  height: 16px;
}

.seg {
  display: flex;
  gap: var(--kiosk-space-1);
  padding: 3px;
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}

.seg--sm {
  display: inline-flex;
}

.seg__btn {
  flex: 1;
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  background: transparent;
  border: none;
  border-radius: calc(var(--kiosk-radius-md) - 2px);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--kiosk-dur-fast) var(--kiosk-easing);
}

.seg--sm .seg__btn {
  flex: 0 0 auto;
  height: 32px;
  padding: 0 var(--kiosk-space-3);
}

.seg__btn--active {
  background: var(--kiosk-surface);
  color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-1);
}

.seg__btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.supp {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3);
  background: var(--kiosk-warning-soft, #fff7e6);
  border: 1px solid var(--kiosk-warning-border, #ffd591);
  border-radius: var(--kiosk-radius-md);
}

.supp__grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--kiosk-space-3);
  align-items: end;
}

.supp__cell--page {
  width: 120px;
}

.supp__label {
  display: block;
  margin-bottom: var(--kiosk-space-1);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}

.supp__reason {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--kiosk-space-2) var(--kiosk-space-3);
  align-items: center;
}

.supp__reason .supp__label {
  margin-bottom: 0;
  white-space: nowrap;
}

.supp__input {
  width: 100%;
  height: 36px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-primary);
}

.supp__input:focus {
  outline: none;
  border-color: var(--kiosk-primary);
}

.supp__input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.classes {
  display: flex;
  align-items: flex-start;
  gap: var(--kiosk-space-3);
}

.classes__label {
  flex-shrink: 0;
  padding-top: 4px;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.classes__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-1);
}

.chip {
  max-width: 160px;
  padding: 2px var(--kiosk-space-2);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-sm);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip--missing {
  border-style: dashed;
  color: var(--kiosk-ink-tertiary);
}

.setup__foot {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  padding-top: var(--kiosk-space-2);
  border-top: 1px solid var(--kiosk-divider);
}

.setup__warn {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  margin: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-warning, #d48806);
}

.start-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  width: 100%;
  height: var(--kiosk-h-action-lg);
  background: var(--kiosk-primary);
  border: none;
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: #fff;
  cursor: pointer;
  transition: opacity var(--kiosk-dur-fast) var(--kiosk-easing);
}

.start-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.start-btn:disabled {
  background: var(--kiosk-ink-disabled, #bfbfbf);
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .supp__grid {
    grid-template-columns: 1fr;
  }

  .supp__cell--page {
    width: 100%;
  }

  .supp__reason {
    grid-template-columns: 1fr;
  }
}
</style>
