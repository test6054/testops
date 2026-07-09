<script setup lang="ts">
import type {
  PortfolioTeacherPortraitVO,
  PortfolioTeacherWorkbenchSummaryVO,
  PortfolioTodoSummaryVO,
} from '@/apis/portfolio/types'
import { PORTFOLIO_COMPLETENESS_LEVEL_TONE } from '@/apis/portfolio/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import {
  PortfolioCompletenessLevelDescription,
  PortfolioPortraitDimensionReadinessCode,
} from '@/apis/portfolio/enums'
import { portfolioTodoApi } from '@/apis/portfolio/todo'
import PortfolioProgressCockpitBand from '@/components/portfolio/PortfolioProgressCockpitBand.vue'
import PortfolioProgressCompareDrawer from '@/components/portfolio/PortfolioProgressCompareDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const loading = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const portraitAbsent = ref(false)
const todos = ref<PortfolioTodoSummaryVO[]>([])
const todoLoading = ref(false)
const workbenchSummary = ref<PortfolioTeacherWorkbenchSummaryVO | null>(null)
const workbenchSummaryLoading = ref(false)
const compareDrawerOpen = ref(false)
const cockpitBandRef = ref<InstanceType<typeof PortfolioProgressCockpitBand> | null>(null)

const completenessPercentText = computed(() => {
  if (!workbenchSummary.value) {
    return ''
  }
  return `${workbenchSummary.value.completenessPercent}%`
})

const portraitStatItems = computed((): SignalMetric[] => {
  if (!portrait.value) {
    return []
  }
  const row = portrait.value
  return [
    {
      key: 'composite',
      label: '综合画像',
      value: String(row.compositeScore),
      unit: '分',
      tone: 'blue',
    },
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
  return (
    portrait.value.officialRecordCount === 0 &&
    portrait.value.dimensions.every(
      (item) => item.readiness === PortfolioPortraitDimensionReadinessCode.PENDING,
    )
  )
})

async function loadDashboard() {
  if (!targetTeacherId.value && canPickTeachers.value) {
    portraitAbsent.value = true
    return
  }
  loading.value = true
  portraitAbsent.value = false
  portrait.value = null
  const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
  try {
    portrait.value = await portfolioAnalysisApi.getPortrait(request)
  } catch (error) {
    const code = readBusinessResultCode(error)
    if (code === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    } else {
      showUserError(error, '加载画像摘要失败')
    }
  } finally {
    loading.value = false
  }
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
  } catch (error) {
    workbenchSummary.value = null
    showUserError(error, '加载工作台摘要失败')
  } finally {
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
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })
    todos.value = page.list
  } catch (error) {
    showUserError(error, '加载待办失败')
  } finally {
    todoLoading.value = false
  }
}

function openTodo(item: PortfolioTodoSummaryVO) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  if (
    item.archiveRecordId &&
    (item.todoType === 'ARCHIVE_RETURNED' || item.todoType === 'ARCHIVE_DRAFT')
  ) {
    query.recordId = item.archiveRecordId
  }
  if (item.todoType === 'ARCHIVE_PENDING_CONFIRM') {
    void router.push({
      path: '/portfolio/teacher/intake',
      query: item.referenceAiTaskId ? { ...query, taskId: item.referenceAiTaskId } : query,
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
  if (
    item.todoType === 'EVALUATION_MATERIAL_CONFIRM' ||
    item.todoType === 'EVALUATION_RETURNED_SUPPLEMENT'
  ) {
    void router.push({
      path: '/portfolio/teacher/evaluation',
      query: { ...query, noticeId: item.refId },
    })
    return
  }
  if (item.todoType === 'DEVELOPMENT_PLAN_PENDING') {
    void router.push({
      path: '/portfolio/admin/development-plan',
      query: { ...query, planId: item.refId },
    })
    return
  }
  if (item.todoType === 'DEVELOPMENT_PLAN_REVIEW') {
    void router.push({
      path: '/portfolio/admin/development-plan-review',
      query: { ...query, planId: item.refId },
    })
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

function handleCockpitMetricClick(key: string, context?: { academicYear?: string }) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  const academicYear = context?.academicYear
  if (academicYear) {
    query.academicYear = academicYear
  }
  if (key === 'completeness') {
    void router.push({ path: '/portfolio/teacher/one-table', query })
    return
  }
  if (key === 'delta') {
    compareDrawerOpen.value = true
    return
  }
  if (key === 'pendingReview') {
    void router.push({
      path: '/portfolio/teacher/review-status',
      query: { ...query, recordStatus: 'PENDING_REVIEW' },
    })
    return
  }
  if (key === 'returned') {
    void router.push({
      path: '/portfolio/teacher/review-status',
      query: { ...query, recordStatus: 'RETURNED' },
    })
    return
  }
  if (key === 'openGap') {
    const gapTodo = todos.value.find(
      (item) => item.todoType === 'GAP_PENDING' || item.todoType === 'GAP_RETURNED',
    )
    if (gapTodo) {
      openTodo(gapTodo)
      return
    }
    message.info('暂无补采待办')
  }
}

function goArchive() {
  void router.push({
    path: '/portfolio/teacher/archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goIntake() {
  void router.push({
    path: '/portfolio/teacher/intake',
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

function reloadHomeData() {
  void loadDashboard()
  void loadWorkbenchSummary()
  void loadTodos()
  cockpitBandRef.value?.reload()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    reloadHomeData()
  }
}

usePortfolioScopedLoader(reloadHomeData, () => targetTeacherId.value, { reloadOnActivated: true })

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="教师首页">
        <template #actions>
          <UiButton v-if="!loading" @click="reloadHomeData"> 刷新 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="!(canPickTeachers && !targetTeacherId)" #signal>
      <PortfolioProgressCockpitBand
        ref="cockpitBandRef"
        :teacher-id="targetTeacherId"
        @metric-click="handleCockpitMetricClick"
      />
    </template>

    <div v-if="canPickTeachers && !targetTeacherId" class="teacher-home__hint">
      <UiEmpty description="请从教师名册选择目标教师，或在 URL 携带 teacherId 参数" />
    </div>

    <div v-else class="teacher-home__grid">
      <UiCard
        :title="
          workbenchSummary?.currentAcademicYear
            ? `${workbenchSummary.currentAcademicYear} 档案完整度`
            : '档案完整度'
        "
        class="teacher-home__card"
      >
        <a-spin :spinning="workbenchSummaryLoading">
          <template v-if="workbenchSummary">
            <div class="teacher-home__completeness-head">
              <span class="teacher-home__percent">{{ completenessPercentText }}</span>
              <UiTag
                v-if="workbenchSummary.completenessLevel"
                :tone="
                  strictEnumTone(
                    PORTFOLIO_COMPLETENESS_LEVEL_TONE,
                    workbenchSummary.completenessLevel,
                    '档案完整度等级',
                  )
                "
              >
                {{
                  strictEnumLabel(
                    PortfolioCompletenessLevelDescription,
                    workbenchSummary.completenessLevel,
                    '档案完整度等级',
                  )
                }}
              </UiTag>
            </div>
            <p class="teacher-home__meta">
              必填分类 {{ workbenchSummary.requiredCategoryDone ?? 0 }} /
              {{ workbenchSummary.requiredCategoryTotal ?? 0 }}
            </p>
            <p
              v-if="
                workbenchSummary.completenessPercent === 0 &&
                (workbenchSummary.requiredCategoryDone ?? 0) === 0
              "
              class="teacher-home__onboarding"
            >
              数据不足，请先完成建档
            </p>
          </template>
          <UiEmpty v-else-if="!workbenchSummaryLoading" description="尚未生成档案完整度" />
        </a-spin>
      </UiCard>

      <UiCard title="画像摘要" class="teacher-home__card">
        <template #extra>
          <UiButton
            variant="ghost"
            size="sm"
            :disabled="!portrait && !portraitAbsent"
            @click="goPortrait"
          >
            查看画像
          </UiButton>
        </template>
        <a-spin :spinning="loading">
          <SignalBand v-if="portrait" :metrics="portraitStatItems" variant="inline" compact />
          <p v-if="portrait" class="teacher-home__meta">
            正式档案 {{ portrait.officialRecordCount }} 条
            <template v-if="portrait.computedTime"> · 更新于 {{ portrait.computedTime }} </template>
          </p>
          <p v-if="portrait && portraitDataInsufficient" class="teacher-home__onboarding">
            画像数据不足，请先完成建档
          </p>
          <UiEmpty v-else-if="portraitAbsent && !loading" description="尚未生成画像快照" />
        </a-spin>
      </UiCard>

      <UiCard title="快捷入口" class="teacher-home__card teacher-home__card--actions">
        <div class="teacher-home__actions">
          <UiButton @click="goIntake"> 材料采集 </UiButton>
          <UiButton @click="goArchive"> 我的档案 </UiButton>
          <UiButton @click="goPortrait"> 教师画像 </UiButton>
          <UiButton @click="goCorrection"> 我的纠错 </UiButton>
          <UiButton @click="goDualTeacherApply"> 双师认定申请 </UiButton>
          <UiButton @click="goOneTable"> 教师一张表 </UiButton>
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
              <p v-if="item.dueTime" class="teacher-home__meta">截止 {{ item.dueTime }}</p>
            </li>
          </ul>
          <UiEmpty v-else description="暂无待办" />
        </a-spin>
      </UiCard>
    </div>
  </StageWorkbenchShell>
  <PortfolioProgressCompareDrawer v-model:open="compareDrawerOpen" :teacher-id="targetTeacherId" />
</template>

<style scoped lang="scss">
.teacher-home__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
}

.teacher-home__card--actions {
  grid-column: span 1;
}

.teacher-home__completeness-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
}

.teacher-home__percent {
  font-size: 32px;
  font-weight: var(--dp-font-weight-semibold);
  line-height: 1.2;
  color: var(--dp-text-primary);
}

.teacher-home__meta {
  margin: var(--dp-space-3) 0 0;
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.teacher-home__onboarding {
  margin: var(--dp-space-2) 0 0;
  font-size: 14px;
  color: var(--ant-color-warning);
}

.teacher-home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.teacher-home__todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.teacher-home__todo-item {
  padding: var(--dp-space-2) 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);
  cursor: pointer;
}

.teacher-home__todo-item:hover {
  background: var(--ant-color-fill-quaternary);
}

.teacher-home__todo-title {
  margin: 0;
  font-size: 14px;
}

.teacher-home__hint {
  padding: var(--dp-space-6) 0;
}

@media (max-width: 960px) {
  .teacher-home__grid {
    grid-template-columns: 1fr;
  }
}
</style>
