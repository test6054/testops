<script setup lang="ts">
/**
 * 一体机触摸屏考试选择：医院挂号式 5×2 大磁贴，单击即绑定/切换。
 */
import type { ExamScannerKioskBindExamCandidateVO } from '@/apis/mark/scanner-kiosk'
import { LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { formatExamSubMeta, formatExamTimeRange } from '@/utils/exam-display-meta'
import { useKioskCtx } from '../composables/kioskInjection'

const props = withDefaults(
  defineProps<{
    selectedExamId?: string
    /** 切换考试时排除当前已绑定考试 */
    excludeExamId?: string
    /** 父级提交中（绑定/切换），勿与全局 workflow.loading 混用 */
    interactionLocked?: boolean
    /** true=点磁贴即绑定；false=仅选中，由父级确认按钮提交 */
    instantBind?: boolean
  }>(),
  {
    interactionLocked: false,
    instantBind: false,
  },
)

const emit = defineEmits<{
  'update:selected-exam-id': [value: string | undefined]
  /** 单击选中并立即绑定/切换 */
  "confirm": [examId: string]
}>()

const { workflow } = useKioskCtx()

const searchInput = ref('')
let searchDebounce = 0

const visibleExams = computed(() => {
  const list = workflow.bindExamCandidates.value
  if (!props.excludeExamId) return list
  return list.filter((item) => item.examId !== props.excludeExamId)
})

const totalPages = computed(() => {
  const size = workflow.bindExamCandidateFilter.pageSize || 1
  return Math.max(1, Math.ceil(workflow.bindExamCandidateTotal.value / size))
})

const showPager = computed(
  () => workflow.bindExamCandidateTotal.value > workflow.bindExamCandidateFilter.pageSize,
)

const emptyHint = computed(() => {
  if (workflow.bindExamCandidateLoadIssue.value) {
    return workflow.bindExamCandidateLoadIssue.value
  }
  if (
    props.excludeExamId
    && workflow.bindExamCandidates.value.some((item) => item.examId === props.excludeExamId)
  ) {
    return '当前工位仅绑定此考试，暂无可切换目标'
  }
  return props.excludeExamId ? '暂无可切换考试' : '暂无可绑定考试'
})

watch(
  () => workflow.bindExamCandidateFilter.keyword,
  (keyword) => {
    if (searchInput.value !== keyword) {
      searchInput.value = keyword
    }
  },
  { immediate: true },
)

function activateExam(examId: string) {
  if (props.interactionLocked === true || workflow.bindExamCandidateLoading.value === true) return
  emit('update:selected-exam-id', examId)
  if (props.instantBind === true) {
    emit('confirm', examId)
  }
}

function onSearchInput() {
  if (searchDebounce) window.clearTimeout(searchDebounce)
  searchDebounce = window.setTimeout(() => {
    workflow.onBindExamCandidateSearch(searchInput.value)
  }, 300)
}

function onSearchSubmit() {
  if (searchDebounce) window.clearTimeout(searchDebounce)
  workflow.onBindExamCandidateSearch(searchInput.value)
}

function formatBatchBadge(candidate: ExamScannerKioskBindExamCandidateVO): string {
  if (candidate.hasActiveScanSession === true) {
    const batchNo = candidate.activeBatchExternalNo?.trim()
    return batchNo ? `扫描中 · ${batchNo}` : '扫描中'
  }
  return `已扫 ${candidate.deviceScanBatchCount ?? 0} 批`
}

function formatExamTimeLine(candidate: ExamScannerKioskBindExamCandidateVO): string {
  return formatExamTimeRange(candidate.examStartTime, candidate.examEndTime)
}

function formatTermLine(candidate: ExamScannerKioskBindExamCandidateVO): string {
  const parts: string[] = []
  if (candidate.academicYear?.trim()) parts.push(candidate.academicYear.trim())
  const semester = formatSemester(candidate.semester)
  if (semester) parts.push(semester)
  return parts.join(' · ')
}

function goPrevPage() {
  workflow.changeBindExamCandidatePage(workflow.bindExamCandidateFilter.pageNum - 1)
}

function goNextPage() {
  workflow.changeBindExamCandidatePage(workflow.bindExamCandidateFilter.pageNum + 1)
}
</script>

<template>
  <div class="exam-pick">
    <div class="exam-pick__toolbar">
      <div class="exam-pick__search">
        <SearchOutlined class="exam-pick__search-icon" />
        <input
          v-model="searchInput"
          type="search"
          class="exam-pick__search-input"
          placeholder="搜索考试名称或编号"
          enterkeyhint="search"
          @input="onSearchInput"
          @keydown.enter.prevent="onSearchSubmit"
        />
      </div>
      <button
        type="button"
        class="exam-pick__refresh"
        :disabled="workflow.bindExamCandidateLoading.value === true"
        @click="workflow.refreshBindExamCandidatesByUser"
      >
        <ReloadOutlined :spin="workflow.bindExamCandidateLoading.value === true" />
        <span>刷新</span>
      </button>
    </div>

    <div v-if="workflow.bindExamCandidateLoading.value === true" class="exam-pick__state">
      <UiSpin size="lg" />
      <span>加载可扫描考试中…</span>
    </div>
    <div v-else-if="visibleExams.length === 0" class="exam-pick__state exam-pick__state--empty">
      <div class="exam-pick__empty-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect
            x="12"
            y="8"
            width="40"
            height="48"
            rx="6"
            stroke="currentColor"
            stroke-width="2.5"
          />
          <path
            d="M22 22h20M22 32h20M22 42h12"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p v-if="workflow.bindExamCandidateLoadIssue.value" class="exam-pick__issue">
        {{ workflow.bindExamCandidateLoadIssue.value }}
      </p>
      <p v-else>{{ emptyHint }}</p>
      <button
        v-if="workflow.bindExamCandidateLoadIssue.value"
        type="button"
        class="exam-pick__retry"
        :disabled="workflow.bindExamCandidateLoading.value === true"
        @click="workflow.refreshBindExamCandidatesByUser"
      >
        重新加载
      </button>
    </div>
    <div v-else class="exam-pick__grid" role="listbox" aria-label="可绑定考试列表">
      <button
        v-for="exam in visibleExams"
        :key="exam.examId"
        type="button"
        role="option"
        class="exam-tile"
        :class="{
          'exam-tile--resume': exam.hasActiveScanSession === true,
          'exam-tile--selected': selectedExamId === exam.examId,
        }"
        :aria-selected="selectedExamId === exam.examId"
        :disabled="interactionLocked === true || workflow.bindExamCandidateLoading.value === true"
        @click="activateExam(exam.examId)"
      >
        <span class="exam-tile__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="4" width="36" height="40" rx="6" fill="var(--kiosk-primary-soft)" />
            <rect
              x="10"
              y="8"
              width="28"
              height="32"
              rx="4"
              stroke="var(--kiosk-primary)"
              stroke-width="2"
              fill="none"
            />
            <path
              d="M16 18h16M16 24h16M16 30h10"
              stroke="var(--kiosk-primary)"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <div class="exam-tile__body">
          <h3 class="exam-tile__title">{{ exam.examName }}</h3>
          <p v-if="exam.courseName" class="exam-tile__course">{{ exam.courseName }}</p>
          <p v-if="formatExamSubMeta(exam.examNo, exam.departmentName)" class="exam-tile__sub">
            {{ formatExamSubMeta(exam.examNo, exam.departmentName) }}
          </p>
          <p v-if="formatTermLine(exam)" class="exam-tile__meta">{{ formatTermLine(exam) }}</p>
          <p v-if="formatExamTimeLine(exam)" class="exam-tile__meta">
            {{ formatExamTimeLine(exam) }}
          </p>
        </div>
        <div class="exam-tile__foot">
          <span
            class="exam-tile__badge"
            :class="{ 'exam-tile__badge--active': exam.hasActiveScanSession === true }"
          >{{ formatBatchBadge(exam) }}</span>
        </div>
      </button>
    </div>

    <div v-if="showPager" class="exam-pick__pager">
      <button
        type="button"
        class="pager-btn"
        :disabled="
          workflow.bindExamCandidateFilter.pageNum <= 1 || workflow.bindExamCandidateLoading.value === true
        "
        @click="goPrevPage"
      >
        <LeftOutlined />
        <span>上一页</span>
      </button>
      <span class="pager-indicator">{{ workflow.bindExamCandidateFilter.pageNum }} / {{ totalPages }}</span>
      <button
        type="button"
        class="pager-btn"
        :disabled="
          workflow.bindExamCandidateFilter.pageNum >= totalPages
            || workflow.bindExamCandidateLoading.value === true
        "
        @click="goNextPage"
      >
        <span>下一页</span>
        <RightOutlined />
      </button>
    </div>
  </div>
</template>

<style scoped>
.exam-pick {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--kiosk-space-4);
  min-height: 0;
}

.exam-pick__toolbar {
  display: flex;
  gap: var(--kiosk-space-3);
}

.exam-pick__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-3);
  min-height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
}

.exam-pick__search-icon {
  color: var(--kiosk-ink-tertiary);
  font-size: 22px;
}

.exam-pick__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 20px;
  color: var(--kiosk-ink-primary);
  outline: none;
}

.exam-pick__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  min-width: 120px;
  min-height: var(--kiosk-h-input);
  padding: 0 var(--kiosk-space-4);
  border: 1px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface-alt);
  font-family: inherit;
  font-size: 18px;
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
}

.exam-pick__state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-4);
  min-height: 200px;
  color: var(--kiosk-ink-secondary);
  text-align: center;
}

.exam-pick__state--empty p {
  margin: 0;
  font-size: 20px;
  font-weight: var(--kiosk-fw-medium);
}

.exam-pick__issue {
  max-width: 520px;
  color: var(--kiosk-danger);
  line-height: 1.5;
}

.exam-pick__retry {
  min-width: 148px;
  min-height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-5);
  border: 1px solid var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  font-family: inherit;
  font-size: 18px;
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-primary);
  cursor: pointer;
}

.exam-pick__empty-icon {
  color: var(--kiosk-ink-tertiary);
}

.exam-pick__grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: minmax(196px, auto);
  gap: var(--kiosk-space-4);
  min-height: 0;
  overflow: auto;
  padding: 2px;
  align-content: start;
}

.exam-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--kiosk-space-2);
  min-height: 196px;
  padding: var(--kiosk-space-4) var(--kiosk-space-3) var(--kiosk-space-3);
  border: 2px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  background: var(--kiosk-surface);
  text-align: center;
  cursor: pointer;
  font-family: inherit;
  overflow: hidden;
  transition:
    border-color var(--kiosk-dur-base) var(--kiosk-easing),
    background var(--kiosk-dur-base) var(--kiosk-easing),
    box-shadow var(--kiosk-dur-base) var(--kiosk-easing);
}

.exam-tile:active:not(:disabled) {
  transform: translateY(1px);
}

.exam-tile:hover:not(:disabled) {
  border-color: var(--kiosk-primary);
  box-shadow: var(--kiosk-shadow-1);
}

.exam-tile:disabled {
  cursor: wait;
  opacity: 0.72;
}

.exam-tile__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.exam-tile__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--kiosk-space-1);
  width: 100%;
  min-height: 0;
}

.exam-tile__title {
  margin: 0;
  width: 100%;
  max-height: calc(17px * 1.35 * 2);
  font-size: 17px;
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  line-height: 1.35;
  overflow: hidden;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.exam-tile__course {
  margin: 0;
  width: 100%;
  flex-shrink: 0;
  font-size: var(--kiosk-fz-label);
  color: var(--kiosk-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exam-tile__sub {
  margin: 0;
  width: 100%;
  flex-shrink: 0;
  font-size: var(--kiosk-fz-caption);
  font-family: var(--kiosk-font-mono);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exam-tile__meta {
  margin: 0;
  width: 100%;
  flex-shrink: 0;
  font-size: var(--kiosk-fz-caption);
  color: var(--kiosk-ink-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exam-tile--resume {
  border-color: var(--kiosk-warning);
}

.exam-tile--selected {
  border-color: var(--kiosk-primary);
  background: var(--kiosk-primary-soft);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.exam-tile__foot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: var(--kiosk-space-2);
  width: 100%;
  margin-top: auto;
  padding-top: var(--kiosk-space-2);
  border-top: 1px solid var(--kiosk-divider);
}

.exam-tile__badge {
  flex-shrink: 0;
  padding: 2px var(--kiosk-space-2);
  border-radius: var(--kiosk-radius-sm);
  background: var(--kiosk-neutral-soft);
  font-size: 11px;
  color: var(--kiosk-ink-secondary);
  font-variant-numeric: tabular-nums;
}

.exam-tile__badge--active {
  background: var(--kiosk-warning-soft);
  color: var(--kiosk-warning);
  font-weight: var(--kiosk-fw-semibold);
}

.exam-pick__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-4);
  padding-top: var(--kiosk-space-2);
}

.pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--kiosk-space-2);
  min-width: 148px;
  min-height: var(--kiosk-h-action-md);
  padding: 0 var(--kiosk-space-5);
  border: 1px solid var(--kiosk-divider-strong);
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-surface);
  font-family: inherit;
  font-size: 20px;
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-primary);
  cursor: pointer;
}

.pager-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.pager-btn:disabled {
  color: var(--kiosk-ink-disabled);
  border-color: var(--kiosk-divider);
  cursor: not-allowed;
}

.pager-indicator {
  min-width: 88px;
  font-size: 20px;
  font-weight: var(--kiosk-fw-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--kiosk-ink-secondary);
  text-align: center;
}
</style>
