<script setup lang="ts">
/**
 * 一体机触摸屏考试选择：医院挂号式 5×2 大磁贴，单击即绑定/切换。
 */
import type { ExamScannerKioskBindExamCandidateVO } from '@/apis/mark/scanner-kiosk'
import { BookOutlined, LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { computed, ref, watch } from 'vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { useKioskCtx } from '../composables/kioskInjection'

const props = withDefaults(
  defineProps<{
    /** 切换考试时排除当前已绑定考试 */
    excludeExamId?: string
    /** 父级提交中（绑定/切换），勿与全局 workflow.loading 混用 */
    interactionLocked?: boolean
  }>(),
  {
    interactionLocked: false,
  },
)

const emit = defineEmits<{
  /** 触碰考试磁贴后立即执行绑定或切换。 */
  confirm: [examId: string]
}>()

const { workflow } = useKioskCtx()

const searchInput = ref('')
const searchInputElement = ref<HTMLInputElement>()
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

function bindExam(examId: string) {
  if (props.interactionLocked === true || workflow.bindExamCandidateLoading.value === true) return
  emit('confirm', examId)
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

/** 向本地 WebView2 宿主请求显示或收起 Windows 触摸键盘。普通浏览器不执行任何操作。 */
function postTouchKeyboard(action: 'open' | 'close') {
  const webview = (
    window as Window & { chrome?: { webview?: { postMessage: (message: string) => void } } }
  ).chrome?.webview
  webview?.postMessage(JSON.stringify({ type: 'touch-keyboard', action }))
}

/** 搜索框取得触摸焦点时显示 Windows 触摸键盘。 */
function onSearchFocus() {
  postTouchKeyboard('open')
}

/** 点击搜索框以外的触摸区域时清除焦点并收起 Windows 触摸键盘。 */
function onExamPickPointerDown(event: PointerEvent) {
  if (event.target instanceof Node && searchInputElement.value?.contains(event.target)) return
  searchInputElement.value?.blur()
  postTouchKeyboard('close')
}

/** 将后端学年与学期编码组合为考试卡片可直接扫读的学期信息。 */
function formatAcademicTerm(
  academicYear?: string,
  semester?: ExamScannerKioskBindExamCandidateVO['semester'],
): string {
  const year = academicYear?.trim()
  const term = formatSemester(semester)
  return [year, term].filter(Boolean).join(' ')
}

function goPrevPage() {
  workflow.changeBindExamCandidatePage(workflow.bindExamCandidateFilter.pageNum - 1)
}

function goNextPage() {
  workflow.changeBindExamCandidatePage(workflow.bindExamCandidateFilter.pageNum + 1)
}
</script>

<template>
  <div class="exam-pick" @pointerdown.capture="onExamPickPointerDown">
    <div class="exam-pick__toolbar">
      <div class="exam-pick__search">
        <SearchOutlined class="exam-pick__search-icon" />
        <input
          ref="searchInputElement"
          v-model="searchInput"
          type="search"
          class="exam-pick__search-input"
          placeholder="搜索考试名称"
          aria-label="搜索考试名称"
          enterkeyhint="search"
          @focus="onSearchFocus"
          @blur="postTouchKeyboard('close')"
          @input="onSearchInput"
          @keydown.enter.prevent="onSearchSubmit"
        />
      </div>
      <button
        type="button"
        class="exam-pick__refresh"
        :disabled="workflow.bindExamCandidateLoading.value"
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
      <p v-if="workflow.bindExamCandidateLoadIssue.value" class="exam-pick__issue" role="alert">
        {{ workflow.bindExamCandidateLoadIssue.value }}
      </p>
      <p v-else>{{ emptyHint }}</p>
    </div>
    <div v-else class="exam-pick__grid" role="list" aria-label="可绑定考试列表">
      <button
        v-for="exam in visibleExams"
        :key="exam.examId"
        type="button"
        role="listitem"
        class="exam-tile"
        :class="{
          'exam-tile--resume': exam.hasActiveScanSession === true,
        }"
        :aria-label="`${exam.hasActiveScanSession === true ? '继续扫描' : '绑定并进入扫描'}：${exam.examName}`"
        :disabled="interactionLocked || workflow.bindExamCandidateLoading.value"
        @click="bindExam(exam.examId)"
      >
        <div class="exam-tile__heading">
          <span class="exam-tile__icon" aria-hidden="true"><BookOutlined /></span>
          <div class="exam-tile__course-block">
            <span class="exam-tile__label">课程</span>
            <p class="exam-tile__course">{{ exam.courseName?.trim() || exam.examName }}</p>
          </div>
        </div>
        <div class="exam-tile__body">
          <span class="exam-tile__label">考试</span>
          <h3 class="exam-tile__title">{{ exam.examName }}</h3>
        </div>
        <div class="exam-tile__foot">
          <span v-if="formatAcademicTerm(exam.academicYear, exam.semester)" class="exam-tile__term">
            {{ formatAcademicTerm(exam.academicYear, exam.semester) }}
          </span>
          <span class="exam-tile__action">
            {{ exam.hasActiveScanSession === true ? '继续扫描' : '进入扫描' }}
            <RightOutlined aria-hidden="true" />
          </span>
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
  font-size: var(--dp-font-size-2xl);
  color: var(--kiosk-ink-primary);
  outline: none;
}

.exam-pick__search-input:focus-visible {
  outline: 2px solid var(--kiosk-primary);
  outline-offset: 2px;
  border-radius: var(--kiosk-radius-sm);
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
  font-size: var(--dp-font-size-xl);
  font-weight: var(--kiosk-fw-medium);
  color: var(--kiosk-ink-secondary);
  cursor: pointer;
  outline: none;
}

.exam-pick__refresh:focus-visible {
  border-color: var(--kiosk-primary);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
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
  font-size: var(--dp-font-size-2xl);
  font-weight: var(--kiosk-fw-medium);
}

.exam-pick__issue {
  max-width: 520px;
  color: var(--kiosk-danger);
  line-height: 1.5;
}

.exam-pick__empty-icon {
  color: var(--kiosk-ink-tertiary);
}

.exam-pick__grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: minmax(180px, 1fr);
  gap: var(--kiosk-space-4);
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--kiosk-space-1);
  align-content: stretch;
  overscroll-behavior: contain;
}

.exam-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: var(--kiosk-space-2);
  min-height: 180px;
  padding: var(--kiosk-space-3);
  border: 2px solid var(--kiosk-divider);
  border-radius: var(--kiosk-radius-lg);
  background: var(--kiosk-surface);
  text-align: left;
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
  width: 36px;
  height: 36px;
  border-radius: var(--kiosk-radius-md);
  background: var(--kiosk-primary-soft);
  color: var(--kiosk-primary);
  font-size: 20px;
}

.exam-tile__heading {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--kiosk-space-2);
  min-width: 0;
}

.exam-tile__course-block {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.exam-tile__label {
  color: var(--kiosk-ink-tertiary);
  font-size: var(--kiosk-fz-caption);
  font-weight: var(--kiosk-fw-medium);
  line-height: 1.2;
}

.exam-tile__course {
  width: 100%;
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-label);
  font-weight: var(--kiosk-fw-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-tile__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--kiosk-space-1);
  width: 100%;
  min-height: 0;
}

.exam-tile__title {
  margin: 0;
  width: 100%;
  flex-shrink: 0;
  margin-top: var(--kiosk-space-1);
  max-height: calc(18px * 1.35 * 2);
  font-size: 18px;
  font-weight: var(--kiosk-fw-semibold);
  color: var(--kiosk-ink-primary);
  line-height: 1.35;
  overflow: hidden;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.exam-tile--resume {
  border-color: var(--kiosk-warning);
}

.exam-tile__foot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--kiosk-space-2);
  width: 100%;
  margin-top: auto;
  padding-top: var(--kiosk-space-2);
  border-top: 1px solid var(--kiosk-divider);
}

.exam-tile__term {
  min-width: 0;
  overflow: hidden;
  color: var(--kiosk-ink-secondary);
  font-size: var(--kiosk-fz-caption);
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exam-tile__action {
  display: inline-flex;
  align-items: center;
  gap: var(--kiosk-space-1);
  color: var(--kiosk-primary);
  font-size: var(--kiosk-fz-label);
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
  font-size: var(--dp-font-size-2xl);
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
  font-size: var(--dp-font-size-2xl);
  font-weight: var(--kiosk-fw-semibold);
  font-variant-numeric: tabular-nums;
  color: var(--kiosk-ink-secondary);
  text-align: center;
}

@media (max-width: 1280px) {
  .exam-pick__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .exam-pick__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .exam-pick__toolbar {
    flex-direction: column;
  }

  .exam-pick__refresh {
    width: 100%;
  }

  .exam-pick__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
