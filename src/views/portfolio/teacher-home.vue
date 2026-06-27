<script setup lang="ts">
import type {
  PortfolioTeacherCompletenessVO,
  PortfolioTeacherPortraitVO,
  PortfolioTeacherWorkbenchSummaryVO,
  PortfolioTodoSummaryVO,
} from '@/apis/portfolio/types'
import type { UiStatPanelItem } from '@/components/ui-guide/ui/types'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import { portfolioTodoApi } from '@/apis/portfolio/todo'
import {
  PORTFOLIO_COMPLETENESS_LEVEL_LABEL,
  PORTFOLIO_COMPLETENESS_LEVEL_TONE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope, usePortfolioScopedLoader } from '@/composables/usePortfolioPageScope'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const completeness = ref<PortfolioTeacherCompletenessVO | null>(null)
const completenessAbsent = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const portraitAbsent = ref(false)
const todos = ref<PortfolioTodoSummaryVO[]>([])
const todoLoading = ref(false)
const workbenchSummary = ref<PortfolioTeacherWorkbenchSummaryVO | null>(null)
const workbenchSummaryLoading = ref(false)

const completenessPercentText = computed(() => {
  if (!completeness.value) {
    return ''
  }
  return `${completeness.value.completenessPercent}%`
})

const portraitStatItems = computed((): UiStatPanelItem[] => {
  if (!portrait.value) {
    return []
  }
  const row = portrait.value
  return [
    { key: 'composite', label: '综合画像', value: String(row.compositeScore), unit: '分', tone: 'blue' },
    { key: 'core', label: '发展核心', value: String(row.developmentCoreScore), unit: '分' },
    { key: 'teaching', label: '教学能力', value: String(row.teachingScore), unit: '分' },
    { key: 'research', label: '科研教研', value: String(row.researchScore), unit: '分' },
    { key: 'training', label: '培训发展', value: String(row.trainingScore), unit: '分' },
    { key: 'practice', label: '企业实践', value: String(row.practiceScore), unit: '分' },
  ]
})

const portraitDataInsufficient = computed(() => {
  if (!portrait.value) {
    return false
  }
  return portrait.value.officialRecordCount === 0
    && portrait.value.dimensions.every(item => item.readiness === 'PENDING')
})

async function loadDashboard() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    completenessAbsent.value = true
    portraitAbsent.value = true
    return
  }
  loading.value = true
  completenessAbsent.value = false
  portraitAbsent.value = false
  completeness.value = null
  portrait.value = null
  const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
  const [completenessResult, portraitResult] = await Promise.allSettled([
    portfolioAnalysisApi.getCompleteness(request),
    portfolioAnalysisApi.getPortrait(request),
  ])
  if (completenessResult.status === 'fulfilled') {
    completeness.value = completenessResult.value
  }
  else {
    const code = readBusinessResultCode(completenessResult.reason)
    if (code === ResultCode.DATA_NOT_FOUND) {
      completenessAbsent.value = true
    }
    else {
      showUserError(completenessResult.reason, '加载档案完整度失败')
    }
  }
  if (portraitResult.status === 'fulfilled') {
    portrait.value = portraitResult.value
  }
  else {
    const code = readBusinessResultCode(portraitResult.reason)
    if (code === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    }
    else {
      showUserError(portraitResult.reason, '加载画像摘要失败')
    }
  }
  loading.value = false
}

async function loadWorkbenchSummary() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    workbenchSummary.value = null
    return
  }
  workbenchSummaryLoading.value = true
  try {
    const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
    workbenchSummary.value = await portfolioAnalysisApi.getWorkbenchSummary(request)
  }
  catch (error) {
    workbenchSummary.value = null
    showUserError(error, '加载工作台摘要失败')
  }
  finally {
    workbenchSummaryLoading.value = false
  }
}

async function loadTodos() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    todos.value = []
    return
  }
  todoLoading.value = true
  try {
    const page = await portfolioTodoApi.pageTodos({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      pageNum: 1,
      pageSize: 20,
    })
    todos.value = readPageList(page, '加载待办失败')
  }
  catch (error) {
    showUserError(error, '加载待办失败')
  }
  finally {
    todoLoading.value = false
  }
}

function openTodo(item: PortfolioTodoSummaryVO) {
  const query: Record<string, string> = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
  if (item.archiveRecordId
    && (item.todoType === 'ARCHIVE_RETURNED' || item.todoType === 'ARCHIVE_DRAFT')) {
    query.recordId = item.archiveRecordId
  }
  if (item.todoType === 'ARCHIVE_PENDING_CONFIRM') {
    void router.push({
      path: '/portfolio/ai-candidate-confirm',
      query: item.referenceAiTaskId
        ? { ...query, taskId: item.referenceAiTaskId }
        : query,
    })
    return
  }
  if (item.todoType === 'CORRECTION_REJECTED' || item.todoType === 'CORRECTION_IN_PROGRESS') {
    if (item.categoryId) {
      query.categoryId = item.categoryId
    }
    if (item.archiveRecordId) {
      query.archiveRecordId = item.archiveRecordId
    }
    void router.push({ path: '/portfolio/teacher/correction', query })
    return
  }
  if (item.todoType === 'GAP_PENDING' || item.todoType === 'GAP_RETURNED') {
    void router.push({
      path: `/portfolio/teacher/gap/${item.refId}`,
      query,
    })
    return
  }
  if (item.todoType === 'EVALUATION_MATERIAL_CONFIRM' || item.todoType === 'EVALUATION_RETURNED_SUPPLEMENT') {
    void router.push({ path: '/portfolio/teacher/archive', query })
    return
  }
  if (item.todoType === 'DEVELOPMENT_PLAN_PENDING') {
    void router.push({ path: '/portfolio/admin/development-plan', query: { ...query, planId: item.refId } })
    return
  }
  if (item.todoType === 'DEVELOPMENT_PLAN_REVIEW') {
    void router.push({ path: '/portfolio/admin/development-plan-review', query: { ...query, planId: item.refId } })
    return
  }
  if (item.todoType === 'DUAL_TEACHER_DRAFT' || item.todoType === 'DUAL_TEACHER_RETURNED') {
    void router.push({ path: '/portfolio/teacher/dual-teacher-apply', query })
    return
  }
  if (item.categoryId) {
    void router.push({
      path: `/portfolio/teacher/archive/${item.categoryId}`,
      query,
    })
    return
  }
  void router.push({ path: '/portfolio/teacher/archive', query })
}

function goCorrection() {
  void router.push({
    path: '/portfolio/teacher/correction',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goPortrait() {
  void router.push({
    path: '/portfolio/teacher/portrait',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goArchive() {
  void router.push({
    path: '/portfolio/teacher/archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goAiConfirm() {
  void router.push({
    path: '/portfolio/ai-candidate-confirm',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goDualTeacherApply() {
  void router.push({
    path: '/portfolio/teacher/dual-teacher-apply',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goOneTable() {
  void router.push({
    path: '/portfolio/teacher/one-table',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void loadDashboard()
    void loadWorkbenchSummary()
    void loadTodos()
  }
}

usePortfolioScopedLoader(() => {
  void loadDashboard()
  void loadWorkbenchSummary()
  void loadTodos()
}, () => targetTeacherId.value, { reloadOnActivated: false })

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="教师首页" description="档案完整度与画像摘要（§17.1）">
      <template #actions>
        <UiButton v-if="!loading" @click="() => { void loadDashboard(); void loadWorkbenchSummary(); void loadTodos() }">
          刷新
        </UiButton>
      </template>
    </ContextBar>

    <div v-if="canPickTeachers && !targetTeacherId" class="teacher-home__hint">
      <UiEmpty description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数" />
    </div>

    <template v-else>
      <div class="teacher-home__grid">
        <UiCard title="档案完整度" class="teacher-home__card">
          <a-spin :spinning="loading">
            <template v-if="completeness">
              <div class="teacher-home__completeness-head">
                <span class="teacher-home__percent">{{ completenessPercentText }}</span>
                <UiTag
                  :tone="strictEnumTone(PORTFOLIO_COMPLETENESS_LEVEL_TONE, completeness.completenessLevel, '档案完整度等级')"
                >
                  {{ strictEnumLabel(PORTFOLIO_COMPLETENESS_LEVEL_LABEL, completeness.completenessLevel, '档案完整度等级') }}
                </UiTag>
              </div>
              <p class="teacher-home__meta">
                必填分类 {{ completeness.requiredCategoryDone }} / {{ completeness.requiredCategoryTotal }}
                <template v-if="completeness.computedTime">
                  · 更新于 {{ completeness.computedTime }}
                </template>
              </p>
              <p
                v-if="completeness.completenessPercent === 0 && completeness.requiredCategoryDone === 0"
                class="teacher-home__onboarding"
              >
                数据不足，请先完成建档
              </p>
            </template>
            <UiEmpty
              v-else-if="completenessAbsent && !loading"
              description="完整度重算失败，请稍后刷新"
            />
          </a-spin>
        </UiCard>

        <UiCard title="画像摘要" class="teacher-home__card">
          <template #extra>
            <UiButton variant="ghost" size="sm" :disabled="!portrait && !portraitAbsent" @click="goPortrait">
              查看画像
            </UiButton>
          </template>
          <a-spin :spinning="loading">
            <UiStatPanel
              v-if="portrait"
              :items="portraitStatItems"
              :columns="3"
              variant="strip"
              compact
            />
            <p v-if="portrait" class="teacher-home__meta">
              正式档案 {{ portrait.officialRecordCount }} 条
              <template v-if="portrait.computedTime">
                · 更新于 {{ portrait.computedTime }}
              </template>
            </p>
            <p
              v-if="portrait && portraitDataInsufficient"
              class="teacher-home__onboarding"
            >
              画像数据不足，请先完成建档
            </p>
            <UiEmpty
              v-else-if="portraitAbsent && !loading"
              description="画像快照生成失败，请稍后刷新"
            />
          </a-spin>
        </UiCard>

        <UiCard title="快捷入口" class="teacher-home__card teacher-home__card--actions">
          <div class="teacher-home__actions">
            <UiButton @click="goAiConfirm">
              AI 候选确认
            </UiButton>
            <UiButton @click="goArchive">
              我的档案
            </UiButton>
            <UiButton @click="goPortrait">
              教师画像
            </UiButton>
            <UiButton @click="goCorrection">
              我的纠错
            </UiButton>
            <UiButton @click="goDualTeacherApply">
              双师认定申请
            </UiButton>
            <UiButton @click="goOneTable">
              教师一张表
            </UiButton>
          </div>
        </UiCard>

        <UiCard title="待办聚合" class="teacher-home__card">
          <template #extra>
            <span v-if="workbenchSummary" class="teacher-home__meta">
              未完成 {{ workbenchSummary.pendingTodoCount }} 项
            </span>
          </template>
          <a-spin :spinning="todoLoading || workbenchSummaryLoading">
            <ul v-if="todos.length" class="teacher-home__todo-list">
              <li
                v-for="item in todos"
                :key="`${item.todoType}-${item.refId}`"
                class="teacher-home__todo-item"
                @click="openTodo(item)"
              >
                <p class="teacher-home__todo-title">
                  {{ item.title }}
                </p>
                <p v-if="item.summary" class="teacher-home__meta">
                  {{ item.summary }}
                </p>
                <p v-if="item.dueTime" class="teacher-home__meta">
                  截止 {{ item.dueTime }}
                </p>
              </li>
            </ul>
            <UiEmpty v-else description="暂无待办" />
          </a-spin>
        </UiCard>
      </div>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.teacher-home__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4, 16px);
}

.teacher-home__card--actions {
  grid-column: span 1;
}

.teacher-home__completeness-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3, 12px);
}

.teacher-home__percent {
  font-size: 32px;
  font-weight: var(--dp-font-weight-semibold, 600);
  line-height: 1.2;
  color: var(--dp-text-primary, #1f2937);
}

.teacher-home__meta {
  margin: var(--dp-space-3, 12px) 0 0;
  font-size: 14px;
  color: var(--dp-text-secondary, #64748b);
}

.teacher-home__onboarding {
  margin: var(--dp-space-2, 8px) 0 0;
  font-size: 14px;
  color: var(--ant-color-warning, #d48806);
}

.teacher-home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.teacher-home__todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-home__todo-item {
  padding: var(--dp-space-2, 8px) 0;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  cursor: pointer;
}

.teacher-home__todo-item:hover {
  background: var(--ant-color-fill-quaternary, #f5f5f5);
}

.teacher-home__todo-title {
  margin: 0;
  font-size: 14px;
}

.teacher-home__hint {
  padding: var(--dp-space-6, 24px) 0;
}

@media (max-width: 960px) {
  .teacher-home__grid {
    grid-template-columns: 1fr;
  }
}
</style>
