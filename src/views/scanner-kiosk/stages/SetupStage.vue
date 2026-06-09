<script setup lang="ts">
/**
 * Stage 1 - 准备扫描
 * Step 1 选择考试 / Step 2 选择扫描模式 / Step 3 确认并开始
 * 数据来自 useKioskWorkflow，互斥规则查 useKioskMutex。
 */
import {
  CheckCircleFilled,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  ScanOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue'
import { computed, watch } from 'vue'
import type { SemesterCode} from '@/types';
import { getSemesterDescription, SemesterOptions } from '@/types'
import { useKioskCtx } from '../composables/kioskInjection'

const { workflow, mutex } = useKioskCtx()

const keywordModel = computed({
  get: () => workflow.examOptionFilter.keyword,
  set: (v: string) => workflow.onExamSelectSearch(v),
})

const academicYearModel = computed({
  get: () => workflow.examOptionFilter.academicYear,
  set: (v: string) => {
    workflow.examOptionFilter.academicYear = (v || '').trim()
  },
})

const isSupplement = computed(() => workflow.scanMode.value === 'SUPPLEMENT')
const classChips = computed(() => workflow.declaredClassChips.value)
const startReason = computed(() => mutex.reasonOf('startScan'))
const blockingMessages = computed(() => {
  const msgs: string[] = []
  if (!workflow.examId.value) msgs.push('请先在 Step 1 选择考试')
  else if (workflow.scanBlockedReason.value) msgs.push(workflow.scanBlockedReason.value)
  return msgs
})

const SCAN_MODE_CARDS = [
  {
    id: 'DIRECT' as const,
    label: '首次扫描',
    desc: '直接录入本场考试新批次。最常用模式。',
    icon: ScanOutlined,
  },
  {
    id: 'SUPPLEMENT' as const,
    label: '补扫',
    desc: '已扫批次发现漏页/异常时追加或替换目标页。',
    icon: SyncOutlined,
  },
  {
    id: 'ARCHIVE' as const,
    label: '历史存档',
    desc: '把往期纸质试卷影像归档到当前考试。',
    icon: HistoryOutlined,
  },
]

function selectExam(examId: string) {
  if (workflow.examId.value !== examId) workflow.onExamSelectChange(examId)
}
function clearExam() {
  if (workflow.canSwitchExam.value) workflow.onExamSelectChange('')
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
function clearExamSemesterFilter(): void {
  workflow.examOptionFilter.semester = undefined
  workflow.onExamFilterChange()
}
function selectExamSemesterFilter(semester: SemesterCode): void {
  workflow.examOptionFilter.semester = semester
  workflow.onExamFilterChange()
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
  <section class="setup-stage">
    <header class="stage-header">
      <div>
        <h2>准备扫描</h2>
        <p>选择考试、扫描模式，确认设备就绪后即可开始本批次。</p>
      </div>
      <div v-if="workflow.examOptionTotal.value > 0" class="meta">
        共 {{ workflow.examOptionTotal.value }} 个可用考试
      </div>
    </header>

    <!-- Step 1 选择考试 -->
    <article class="step">
      <header class="step-head">
        <span class="step-no">1</span>
        <div>
          <h3>选择考试</h3>
          <small>支持考试名 / 编号搜索，按学年学期过滤</small>
        </div>
        <button
          type="button"
          class="step-action"
          :disabled="!workflow.canSwitchExam.value || workflow.examOptionLoading.value"
          :title="mutex.reasonOf('switchExam') || '刷新考试列表'"
          @click="workflow.refreshExamOptionsByUser"
        >
          <ReloadOutlined :spin="workflow.examOptionLoading.value" />
          <span>刷新</span>
        </button>
      </header>

      <div class="filter-row">
        <label class="input">
          <FileSearchOutlined class="input-icon" />
          <input
            v-model="keywordModel"
            type="text"
            placeholder="搜索考试名 / 编号"
            :disabled="!workflow.canSwitchExam.value"
          />
        </label>
        <label class="input input--mid">
          <span class="input-label">学年</span>
          <input
            v-model.lazy="academicYearModel"
            type="text"
            placeholder="如 2024-2025"
            :disabled="!workflow.canSwitchExam.value"
            @change="workflow.onExamFilterChange()"
          />
        </label>
        <div class="seg" role="group">
          <span class="input-label">学期</span>
          <button
            type="button"
            class="seg-btn"
            :class="{ active: !workflow.examOptionFilter.semester }"
            :disabled="!workflow.canSwitchExam.value"
            @click="clearExamSemesterFilter"
          >
            全部
          </button>
          <button
            v-for="opt in SemesterOptions"
            :key="opt.value"
            type="button"
            class="seg-btn"
            :class="{ active: workflow.examOptionFilter.semester === opt.value }"
            :disabled="!workflow.canSwitchExam.value"
            @click="selectExamSemesterFilter(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="workflow.selectedExamOption.value" class="selected">
        <div class="selected-main">
          <CheckCircleFilled class="selected-mark" />
          <div class="selected-text">
            <strong>{{ workflow.selectedExamOption.value.examName }}</strong>
            <span class="selected-meta">
              <span>{{ workflow.selectedExamOption.value.examNo }}</span>
              <template v-if="workflow.selectedExamOption.value.courseName">
                <span class="dot" /><span>{{ workflow.selectedExamOption.value.courseName }}</span>
              </template>
              <template v-if="workflow.selectedExamOption.value.academicYear">
                <span class="dot" /><span>{{
                  workflow.selectedExamOption.value.academicYear
                }}</span>
              </template>
              <template v-if="workflow.selectedExamOption.value.semester">
                <span class="dot" /><span>{{
                  getSemesterDescription(workflow.selectedExamOption.value.semester)
                }}</span>
              </template>
              <span class="dot" /><span
                >已扫批次 {{ workflow.selectedExamOption.value.scanBatchCount }}</span
              >
            </span>
          </div>
        </div>
        <button
          type="button"
          class="selected-clear"
          :disabled="!workflow.canSwitchExam.value"
          @click="clearExam"
        >
          切换考试
        </button>
      </div>

      <div
        v-if="workflow.examOptionLoading.value && workflow.examOptions.value.length === 0"
        class="empty"
      >
        加载考试列表中…
      </div>
      <div v-else-if="workflow.examOptions.value.length === 0" class="empty">
        无符合条件的考试。修改筛选条件或点击「刷新」重试。
      </div>
      <div v-else class="exam-grid">
        <button
          v-for="opt in workflow.examOptions.value"
          :key="opt.examId"
          type="button"
          class="exam-card"
          :class="{ active: workflow.examId.value === opt.examId }"
          :disabled="!workflow.canSwitchExam.value"
          @click="selectExam(opt.examId)"
        >
          <div class="exam-card-head">
            <strong>{{ opt.examName }}</strong>
            <span v-if="workflow.examId.value === opt.examId" class="exam-card-tag">已选</span>
          </div>
          <div class="exam-card-meta">
            <span>{{ opt.examNo }}</span>
            <template v-if="opt.courseName">
              <span class="dot" /><span>{{ opt.courseName }}</span>
            </template>
          </div>
          <div class="exam-card-foot">
            <span v-if="opt.academicYear">{{ opt.academicYear }}</span>
            <span v-if="opt.semester">{{ getSemesterDescription(opt.semester) }}</span>
            <span>班级 {{ opt.classIds.length }}</span>
            <span class="exam-card-batches">已扫批次 {{ opt.scanBatchCount }}</span>
          </div>
        </button>
      </div>
    </article>

    <!-- Step 2 选择扫描模式 -->
    <article class="step">
      <header class="step-head">
        <span class="step-no">2</span>
        <div>
          <h3>选择扫描模式</h3>
          <small>SUPPLEMENT 模式必填补扫目标页号 + 原因</small>
        </div>
      </header>

      <div class="mode-grid">
        <button
          v-for="card in SCAN_MODE_CARDS"
          :key="card.id"
          type="button"
          class="mode-card"
          :class="{ active: workflow.scanMode.value === card.id }"
          :disabled="!workflow.canSwitchScanMode.value"
          :title="mutex.reasonOf('switchScanMode') || card.label"
          @click="selectMode(card.id)"
        >
          <component :is="card.icon" class="mode-card-icon" />
          <strong>{{ card.label }}</strong>
          <span>{{ card.desc }}</span>
        </button>
      </div>

      <transition name="supplement-fade">
        <div v-if="isSupplement" class="supplement">
          <div class="form-row">
            <span class="form-label">补扫方式</span>
            <div class="form-segment" role="group">
              <button
                type="button"
                class="seg-btn seg-btn--lg"
                :class="{ active: !workflow.supplementReplaceTargetPage.value }"
                :disabled="!workflow.canSwitchScanMode.value"
                @click="selectSupplementVariant(false)"
              >
                追加补扫
              </button>
              <button
                type="button"
                class="seg-btn seg-btn--lg"
                :class="{ active: workflow.supplementReplaceTargetPage.value }"
                :disabled="!workflow.canSwitchScanMode.value"
                @click="selectSupplementVariant(true)"
              >
                替换目标页
              </button>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">目标页号</span>
            <input
              v-model.number="workflow.supplementTargetPageNo.value"
              type="number"
              min="1"
              class="form-input form-input--num"
              :disabled="!workflow.canSwitchScanMode.value"
              placeholder="≥ 1"
            />
          </div>
          <div class="form-row">
            <span class="form-label">补扫原因</span>
            <input
              v-model="workflow.supplementReason.value"
              type="text"
              maxlength="120"
              class="form-input"
              :disabled="!workflow.canSwitchScanMode.value"
              placeholder="例如：漏扫、卡纸损坏、识别异常需替换"
            />
          </div>
        </div>
      </transition>

      <div class="expected-row">
        <span class="form-label">预计页数（可选）</span>
        <input
          v-model.number="workflow.expectedPages.value"
          type="number"
          min="1"
          class="form-input form-input--num"
          :disabled="isSupplement || !workflow.canEditScanSetup.value"
          :placeholder="isSupplement ? '补扫固定 1 页' : '留空由扫描仪决定'"
        />
        <span class="hint">{{ isSupplement ? '补扫批次只允许扫描目标页的一张影像' : '仅用于展示扫描进度' }}</span>
      </div>
    </article>

    <!-- Step 3 确认并开始 -->
    <article class="step step--cta">
      <header class="step-head">
        <span class="step-no">3</span>
        <div>
          <h3>确认并开始扫描</h3>
          <small>请确认考试范围、设备就绪、扫描参数后启动本批次</small>
        </div>
      </header>

      <div class="checklist">
        <span class="checklist-key">班级范围</span>
        <div v-if="classChips.length" class="chip-row">
          <span
            v-for="chip in classChips"
            :key="chip.key"
            class="class-chip"
            :class="{ missing: chip.missing }"
            :title="chip.label"
            >{{ chip.label }}</span
          >
        </div>
        <span v-else class="empty-inline">请先选择考试</span>
      </div>

      <div v-if="blockingMessages.length" class="blocked">
        <div v-for="msg in blockingMessages" :key="msg" class="blocked-row">
          <ExclamationCircleOutlined />
          <span>{{ msg }}</span>
        </div>
      </div>

      <div class="cta-wrap">
        <button
          type="button"
          class="cta-btn"
          :disabled="!workflow.canStartScan.value"
          :title="startReason || '开始本批次扫描'"
          @click="startScan"
        >
          <PlayCircleFilled class="cta-icon" />
          <span class="cta-label">
            <strong>开始{{ workflow.scanModeText(workflow.scanMode.value, '') }}</strong>
            <small v-if="!workflow.canStartScan.value">{{
              startReason || '请先完善上方步骤'
            }}</small>
            <small v-else>设备已就绪，点击开始本批次</small>
          </span>
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.setup-stage {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--kiosk-space-5) var(--kiosk-space-6);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-5);
}

.stage-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--kiosk-space-4);
}
.stage-header h2 {
  margin: 0 0 var(--kiosk-space-2);
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.stage-header p {
  margin: 0;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-secondary);
}
.meta {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
}

.step {
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  padding: var(--kiosk-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  box-shadow: var(--kiosk-shadow-1);
}
.step--cta {
  background: linear-gradient(180deg, var(--kiosk-surface) 0%, var(--kiosk-primary-soft) 100%);
  border-color: rgba(31, 95, 255, 0.2);
}

.step-head {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
}
.step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
  font-size: 18px;
  font-weight: var(--kiosk-fw-bold);
  flex: 0 0 auto;
}
.step-head h3 {
  margin: 0;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.step-head small {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.step-action {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: 40px;
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-ink-secondary);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.step-action:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  color: var(--kiosk-primary);
}
.step-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-3);
}
.input {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  flex: 1 1 320px;
  min-width: 240px;
  height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.input:focus-within {
  border-color: var(--kiosk-primary);
}
.input--mid {
  flex: 0 0 220px;
  min-width: 220px;
}
.input-icon {
  color: var(--kiosk-ink-tertiary);
  font-size: 18px;
}
.input input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
  min-width: 0;
}
.input-label {
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
}

.seg {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface-alt);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
}
.seg-btn {
  height: 40px;
  padding: 0 var(--kiosk-space-3);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--kiosk-radius-sm);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  transition:
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.seg-btn:hover:not(:disabled) {
  background: var(--kiosk-surface);
}
.seg-btn.active {
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
}
.seg-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.seg-btn--lg {
  height: var(--kiosk-h-action-lg);
  min-width: 160px;
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
}

.selected {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  background: var(--kiosk-primary-soft);
  border: 1px solid rgba(31, 95, 255, 0.25);
  border-radius: var(--kiosk-radius-md);
}
.selected-main {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  flex: 1;
  min-width: 0;
}
.selected-mark {
  font-size: 22px;
  color: var(--kiosk-primary);
}
.selected-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.selected-text strong {
  font-size: var(--kiosk-fz-h3);
  color: var(--kiosk-ink-primary);
}
.selected-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}
.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--kiosk-ink-tertiary);
  flex: 0 0 auto;
}
.selected-clear {
  height: 40px;
  padding: 0 var(--kiosk-space-4);
  background: transparent;
  border: 1px solid var(--kiosk-primary);
  border-radius: var(--kiosk-radius-md);
  color: var(--kiosk-primary);
  font-family: inherit;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  cursor: pointer;
}
.selected-clear:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.empty {
  padding: var(--kiosk-space-7) 0;
  text-align: center;
  color: var(--kiosk-ink-tertiary);
  font-size: var(--kiosk-fz-body);
  background: var(--kiosk-surface-alt);
  border: 1px dashed var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
}
.empty-inline {
  color: var(--kiosk-ink-tertiary);
  font-size: var(--kiosk-fz-label);
}

.exam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--kiosk-space-3);
  max-height: 360px;
  overflow-y: auto;
  padding: 2px;
}
.exam-card {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    box-shadow var(--kiosk-dur-fast) var(--kiosk-easing),
    background var(--kiosk-dur-fast) var(--kiosk-easing);
}
.exam-card:hover:not(:disabled):not(.active) {
  border-color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-2);
}
.exam-card.active {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.2);
}
.exam-card:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.exam-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
}
.exam-card-head strong {
  font-size: var(--kiosk-fz-h3);
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
}
.exam-card-tag {
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
  padding: 2px var(--kiosk-space-2);
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border-radius: var(--kiosk-radius-pill);
}
.exam-card-meta {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-secondary);
}
.exam-card-foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-3);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}
.exam-card-batches {
  margin-left: auto;
  color: var(--kiosk-success);
  font-weight: var(--kiosk-fw-medium);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--kiosk-space-3);
}
.mode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--kiosk-space-2);
  height: 200px;
  padding: var(--kiosk-space-5);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color var(--kiosk-dur-fast) var(--kiosk-easing),
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    transform var(--kiosk-dur-fast) var(--kiosk-easing);
}
.mode-card:hover:not(:disabled):not(.active) {
  border-color: var(--kiosk-primary);
  transform: translateY(-2px);
}
.mode-card.active {
  border-color: var(--kiosk-primary);
  background: linear-gradient(135deg, var(--kiosk-primary-soft), #fff);
  box-shadow: 0 0 0 2px rgba(31, 95, 255, 0.2);
}
.mode-card:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.mode-card-icon {
  font-size: 32px;
  color: var(--kiosk-primary);
  margin-bottom: var(--kiosk-space-1);
}
.mode-card strong {
  font-size: var(--kiosk-fz-h2);
  font-weight: var(--kiosk-fw-bold);
  color: var(--kiosk-ink-primary);
}
.mode-card span {
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  line-height: var(--kiosk-lh-base);
}

.supplement {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-4) var(--kiosk-space-5);
  background: var(--kiosk-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: var(--kiosk-radius-md);
}
.form-row {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
}
.form-label {
  flex: 0 0 110px;
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
}
.form-segment {
  display: flex;
  gap: var(--kiosk-space-2);
}
.form-input {
  flex: 1;
  height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-4);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  font-family: inherit;
  font-size: var(--kiosk-fz-body);
  color: var(--kiosk-ink-primary);
  outline: none;
  transition: border-color var(--kiosk-dur-fast) var(--kiosk-easing);
}
.form-input:focus {
  border-color: var(--kiosk-primary);
}
.form-input:disabled {
  background: var(--kiosk-neutral-soft);
  cursor: not-allowed;
}
.form-input--num {
  flex: 0 0 200px;
}

.expected-row {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  padding: var(--kiosk-space-3) 0;
}
.hint {
  flex: 1;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
}

.checklist {
  display: flex;
  align-items: baseline;
  gap: var(--kiosk-space-3);
}
.checklist-key {
  flex: 0 0 96px;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  font-weight: var(--kiosk-fw-medium);
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--kiosk-space-2);
}
.class-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 var(--kiosk-space-3);
  background: var(--kiosk-surface);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-pill);
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-primary);
}
.class-chip.missing {
  background: var(--kiosk-danger-soft);
  border-color: rgba(197, 38, 62, 0.3);
  color: var(--kiosk-danger);
}

.blocked {
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-2);
  padding: var(--kiosk-space-3) var(--kiosk-space-4);
  background: var(--kiosk-warning-soft);
  border: 1px solid rgba(217, 119, 6, 0.3);
  border-radius: var(--kiosk-radius-md);
}
.blocked-row {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-2);
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-warning);
}

.cta-wrap {
  display: flex;
  justify-content: center;
  padding: var(--kiosk-space-3) 0;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-4);
  height: var(--kiosk-h-cta);
  min-width: 480px;
  padding: 0 var(--kiosk-space-7);
  background: var(--kiosk-primary);
  color: var(--kiosk-primary-on);
  border: none;
  border-radius: var(--kiosk-radius-lg);
  font-family: inherit;
  cursor: pointer;
  box-shadow: var(--kiosk-shadow-3);
  transition:
    background var(--kiosk-dur-fast) var(--kiosk-easing),
    transform var(--kiosk-dur-fast) var(--kiosk-easing);
}
.cta-btn:hover:not(:disabled) {
  background: var(--kiosk-primary-pressed);
}
.cta-btn:active:not(:disabled) {
  transform: scale(0.985);
}
.cta-btn:disabled {
  background: var(--kiosk-neutral);
  color: var(--kiosk-ink-disabled);
  cursor: not-allowed;
  box-shadow: none;
}
.cta-icon {
  font-size: 36px;
  flex: 0 0 auto;
}
.cta-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.3;
  gap: 2px;
}
.cta-label strong {
  font-size: 28px;
  font-weight: var(--kiosk-fw-bold);
}
.cta-label small {
  font-size: var(--kiosk-fz-label);
  opacity: 0.85;
}

.supplement-fade-enter-active,
.supplement-fade-leave-active {
  transition:
    opacity var(--kiosk-dur-base) var(--kiosk-easing),
    transform var(--kiosk-dur-base) var(--kiosk-easing);
}
.supplement-fade-enter-from,
.supplement-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1280px) {
  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cta-btn {
    min-width: 360px;
  }
}
@media (max-width: 1024px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
  .cta-btn {
    min-width: 280px;
    padding: 0 var(--kiosk-space-5);
  }
  .cta-label strong {
    font-size: 22px;
  }
}
</style>
