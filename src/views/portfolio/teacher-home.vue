<script setup lang="ts">
import type {
  PortfolioTeacherPortraitVO,
  PortfolioTeacherWorkbenchSummaryVO,
  PortfolioTodoSummaryVO,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioAnalysisApi } from '@/apis/portfolio/analysis'
import {
  PortfolioCompletenessLevelDescription,
  PortfolioPortraitDimensionReadinessCode,
} from '@/apis/portfolio/enums'
import { portfolioTodoApi } from '@/apis/portfolio/todo'
import { PORTFOLIO_COMPLETENESS_LEVEL_TONE } from '@/apis/portfolio/types'
import PortfolioProgressCockpitBand from '@/components/portfolio/PortfolioProgressCockpitBand.vue'
import PortfolioProgressCompareDrawer from '@/components/portfolio/PortfolioProgressCompareDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  usePortfolioPageScope,
  usePortfolioScopedLoader,
} from '@/composables/usePortfolioPageScope'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioArchiveRecordStatusCode } from '@/types/enums/portfolio-archive-record-status-enum'
import { PortfolioTodoTypeCode } from '@/types/enums/portfolio-todo-type-enum'
import { ResultCode } from '@/types/enums/result-code'
import { readBusinessResultCode, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const router = useRouter()
const { targetTeacherId, canPickTeachers, currentUserId } = usePortfolioPageScope()

const loading = ref(false)
const portrait = ref<PortfolioTeacherPortraitVO | null>(null)
const portraitAbsent = ref(false)
const todos = ref<PortfolioTodoSummaryVO[]>([])
const todoLoading = ref(false)
const workbenchSummary = ref<PortfolioTeacherWorkbenchSummaryVO | null>(null)
const workbenchSummaryLoading = ref(false)
const compareDrawerOpen = ref(false)
const cockpitBandRef = ref<InstanceType<typeof PortfolioProgressCockpitBand> | null>(null)
const acknowledgingTodoKey = ref('')

function todoCourseScopeLabel(item: PortfolioTodoSummaryVO): string {
  if (!item.courseCode) {
    return ''
  }
  const parts = [item.courseCode]
  if (item.academicYear) {
    parts.push(item.academicYear)
  }
  if (item.semester) {
    parts.push(`第${item.semester}学期`)
  }
  return parts.join(' · ')
}
const homeRequestToken = ref(0)

const completenessPercentText = computed(() => {
  if (!workbenchSummary.value) {
    return ''
  }
  return `${workbenchSummary.value.completenessPercent}%`
})

const portraitDataInsufficient = computed(() => {
  if (!portrait.value) {
    return false
  }
  return (
    portrait.value.officialRecordCount === 0
    && portrait.value.dimensions.every(
      (item) => item.readiness === PortfolioPortraitDimensionReadinessCode.PENDING,
    )
  )
})

const canManageOwnPrivacy = computed(() =>
  Boolean(targetTeacherId.value && targetTeacherId.value === currentUserId.value),
)

/** 教师首页切换目标教师时必须让旧首页请求失效，避免上一位教师画像/待办回填当前首页。 */
function resetHomeContext() {
  homeRequestToken.value += 1
  portrait.value = null
  portraitAbsent.value = false
  todos.value = []
  workbenchSummary.value = null
  compareDrawerOpen.value = false
}

async function loadDashboard() {
  const requestToken = homeRequestToken.value
  if (!targetTeacherId.value && canPickTeachers.value) {
    if (homeRequestToken.value === requestToken) {
      portraitAbsent.value = true
    }
    return
  }
  loading.value = true
  portraitAbsent.value = false
  portrait.value = null
  const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
  try {
    const nextPortrait = await portfolioAnalysisApi.getPortrait(request)
    if (homeRequestToken.value !== requestToken) {
      return
    }
    portrait.value = nextPortrait
  } catch (error) {
    if (homeRequestToken.value !== requestToken) {
      return
    }
    const code = readBusinessResultCode(error)
    if (code === ResultCode.DATA_NOT_FOUND) {
      portraitAbsent.value = true
    } else {
      showUserError(error, '加载画像摘要失败')
    }
  } finally {
    if (homeRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function loadWorkbenchSummary() {
  const requestToken = homeRequestToken.value
  if (!targetTeacherId.value && canPickTeachers.value) {
    if (homeRequestToken.value === requestToken) {
      workbenchSummary.value = null
    }
    return
  }
  workbenchSummaryLoading.value = true
  try {
    const request = targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}
    const nextSummary = await portfolioAnalysisApi.getWorkbenchSummary(request)
    if (homeRequestToken.value !== requestToken) {
      return
    }
    workbenchSummary.value = nextSummary
  } catch (error) {
    if (homeRequestToken.value !== requestToken) {
      return
    }
    workbenchSummary.value = null
    showUserError(error, '加载工作台摘要失败')
  } finally {
    if (homeRequestToken.value === requestToken) {
      workbenchSummaryLoading.value = false
    }
  }
}

async function loadTodos() {
  const requestToken = homeRequestToken.value
  if (!targetTeacherId.value && canPickTeachers.value) {
    if (homeRequestToken.value === requestToken) {
      todos.value = []
    }
    return
  }
  todoLoading.value = true
  try {
    const page = await portfolioTodoApi.pageTodos({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      pageNum: 1,
      pageSize: DEFAULT_LIST_PAGE_SIZE,
    })
    if (homeRequestToken.value !== requestToken) {
      return
    }
    todos.value = page.list
  } catch (error) {
    if (homeRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载待办失败')
  } finally {
    if (homeRequestToken.value === requestToken) {
      todoLoading.value = false
    }
  }
}

async function loadFirstTodoByTypes(
  todoTypes: PortfolioTodoTypeCode[],
): Promise<PortfolioTodoSummaryVO | null> {
  for (const todoType of todoTypes) {
    const page = await portfolioTodoApi.pageTodos({
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      todoType,
      pageNum: 1,
      pageSize: 1,
    })
    const row = page.list?.[0]
    if (row) {
      return row
    }
  }
  return null
}

function openTodo(item: PortfolioTodoSummaryVO) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  if (
    item.archiveRecordId
    && (item.todoType === PortfolioTodoTypeCode.ARCHIVE_RETURNED
      || item.todoType === PortfolioTodoTypeCode.ARCHIVE_DRAFT)
  ) {
    query.recordId = item.archiveRecordId
  }
  if (item.todoType === PortfolioTodoTypeCode.ARCHIVE_PENDING_CONFIRM) {
    if (!item.referenceAiTaskId) {
      if (item.categoryId) {
        void router.push({
          path: `/portfolio/teacher/archive/${item.categoryId}`,
          query: item.archiveRecordId ? { ...query, recordId: item.archiveRecordId } : query,
        })
        return
      }
      void router.push({
        path: '/portfolio/teacher/archive',
        query: item.archiveRecordId ? { ...query, recordId: item.archiveRecordId } : query,
      })
      return
    }
    void router.push({
      path: '/portfolio/teacher/intake',
      query: { ...query, taskId: item.referenceAiTaskId },
    })
    return
  }
  if (
    item.todoType === PortfolioTodoTypeCode.CORRECTION_REJECTED
    || item.todoType === PortfolioTodoTypeCode.CORRECTION_IN_PROGRESS
  ) {
    if (item.categoryId) {
      query.categoryId = item.categoryId
    }
    if (item.archiveRecordId) {
      query.archiveRecordId = item.archiveRecordId
    }
    void router.push({ path: '/portfolio/teacher/correction', query })
    return
  }
  if (
    item.todoType === PortfolioTodoTypeCode.GAP_PENDING
    || item.todoType === PortfolioTodoTypeCode.GAP_RETURNED
  ) {
    void router.push({
      path: `/portfolio/teacher/gap/${item.refId}`,
      query,
    })
    return
  }
  if (
    item.todoType === PortfolioTodoTypeCode.EVALUATION_MATERIAL_CONFIRM
    || item.todoType === PortfolioTodoTypeCode.EVALUATION_RETURNED_SUPPLEMENT
  ) {
    void router.push({
      path: '/portfolio/teacher/evaluation',
      query: { ...query, noticeId: item.refId },
    })
    return
  }
  if (item.todoType === PortfolioTodoTypeCode.DEVELOPMENT_PLAN_PENDING) {
    void router.push({
      path: '/portfolio/admin/development-plan',
      query: { ...query, planId: item.refId },
    })
    return
  }
  if (item.todoType === PortfolioTodoTypeCode.DEVELOPMENT_PLAN_REVIEW) {
    void router.push({
      path: '/portfolio/department/development-plan-review',
      query: { ...query, planId: item.refId },
    })
    return
  }
  if (
    item.todoType === PortfolioTodoTypeCode.DUAL_TEACHER_DRAFT
    || item.todoType === PortfolioTodoTypeCode.DUAL_TEACHER_RETURNED
  ) {
    void router.push({ path: '/portfolio/scene/dual-teacher', query })
    return
  }
  if (item.categoryId) {
    const categoryQuery = item.archiveRecordId
      ? { ...query, recordId: item.archiveRecordId }
      : query
    void router.push({
      path: `/portfolio/teacher/archive/${item.categoryId}`,
      query: categoryQuery,
    })
    return
  }
  void router.push({ path: '/portfolio/teacher/archive', query })
}

async function acknowledgeRejectedCorrection(item: PortfolioTodoSummaryVO) {
  if (item.todoType !== PortfolioTodoTypeCode.CORRECTION_REJECTED || acknowledgingTodoKey.value) {
    return
  }
  const confirmed = await confirmAsync({
    title: '确认已知悉纠错驳回结果',
    content: '确认后该提醒将从待办中移除；纠错工单及驳回意见仍会保留。',
    type: 'warning',
    okText: '确认知悉',
  })
  if (!confirmed) return
  const operationKey = `${item.todoType}:${item.refId}`
  acknowledgingTodoKey.value = operationKey
  try {
    await portfolioTodoApi.completeTodo({ todoType: item.todoType, refId: item.refId })
    message.success('已确认知悉')
    await Promise.all([loadTodos(), loadWorkbenchSummary()])
  } catch (error) {
    showUserError(error, '确认待办失败')
  } finally {
    if (acknowledgingTodoKey.value === operationKey) acknowledgingTodoKey.value = ''
  }
}

function goCorrection() {
  void router.push({
    path: '/portfolio/teacher/correction',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goPrivacySettings() {
  void router.push({
    path: '/portfolio/teacher/privacy-consent',
    query: { teacherId: targetTeacherId.value, mode: 'manage' },
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
  if (key === 'courseArchive') {
    void router.push({ path: '/portfolio/teacher/course-archive', query })
    return
  }
  if (key === 'pendingReview') {
    void router.push({
      path: '/portfolio/teacher/review-status',
      query: { ...query, recordStatus: PortfolioArchiveRecordStatusCode.PENDING_REVIEW },
    })
    return
  }
  if (key === 'returned') {
    void router.push({
      path: '/portfolio/teacher/review-status',
      query: { ...query, recordStatus: PortfolioArchiveRecordStatusCode.RETURNED },
    })
    return
  }
  if (key === 'openGap') {
    void (async () => {
      const cachedGapTodo = todos.value.find(
        (item) =>
          item.todoType === PortfolioTodoTypeCode.GAP_PENDING
          || item.todoType === PortfolioTodoTypeCode.GAP_RETURNED,
      )
      if (cachedGapTodo) {
        openTodo(cachedGapTodo)
        return
      }
      try {
        const gapTodo = await loadFirstTodoByTypes([
          PortfolioTodoTypeCode.GAP_PENDING,
          PortfolioTodoTypeCode.GAP_RETURNED,
        ])
        if (gapTodo) {
          openTodo(gapTodo)
          return
        }
        message.info('暂无补采待办')
      } catch (error) {
        showUserError(error, '加载补采待办失败')
      }
    })()
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

function goReviewStatus() {
  void router.push({
    path: '/portfolio/teacher/review-status',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goPromotionScene() {
  void router.push({
    path: '/portfolio/scene/promotion',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goDualTeacherApply() {
  void router.push({
    path: '/portfolio/scene/dual-teacher',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

const moreHomeActionsOpen = ref(false)

function goOneTable() {
  void router.push({
    path: '/portfolio/teacher/one-table',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goProfile() {
  void router.push({
    path: '/portfolio/teacher/profile',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goTeachingPhilosophy() {
  void router.push({
    path: '/portfolio/teacher/philosophy',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goCourseArchive() {
  void router.push({
    path: '/portfolio/teacher/course-archive',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goCourseArchiveWithAcademicYear(academicYear?: string) {
  const query: Record<string, string> = targetTeacherId.value
    ? { teacherId: targetTeacherId.value }
    : {}
  if (academicYear) {
    query.academicYear = academicYear
  }
  void router.push({ path: '/portfolio/teacher/course-archive', query })
}

function goHonor() {
  void router.push({
    path: '/portfolio/teacher/honor',
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function goExtensionActivity() {
  void router.push({
    path: '/portfolio/teacher/extension-activity',
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

usePortfolioScopedLoader(
  () => {
    resetHomeContext()
    reloadHomeData()
  },
  () => targetTeacherId.value,
  { reloadOnActivated: true },
)

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
          <template v-if="!(canPickTeachers && !targetTeacherId)">
            <UiButton variant="primary" size="sm" @click="goIntake">材料采集</UiButton>
            <UiButton size="sm" @click="goReviewStatus">审核进度</UiButton>
            <UiButton size="sm" @click="goArchive">我的档案</UiButton>
            <UiButton
              variant="outline"
              size="sm"
              @click="moreHomeActionsOpen = !moreHomeActionsOpen"
            >
              {{ moreHomeActionsOpen ? '收起入口' : '更多入口' }}
            </UiButton>
          </template>
          <UiButton v-if="!loading" size="sm" @click="reloadHomeData">刷新</UiButton>
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

    <div v-else class="teacher-home__layout">
      <div v-if="moreHomeActionsOpen" class="teacher-home__actions">
        <UiButton size="sm" @click="goDualTeacherApply">资格与认定</UiButton>
        <UiButton size="sm" @click="goCourseArchive">课程档案</UiButton>
        <UiButton size="sm" @click="goPromotionScene">职称材料包</UiButton>
        <UiButton size="sm" @click="goTeachingPhilosophy">教学理念</UiButton>
        <UiButton size="sm" @click="goHonor">获奖情况</UiButton>
        <UiButton size="sm" @click="goExtensionActivity">教学拓展</UiButton>
        <UiButton size="sm" @click="goProfile">个人资料</UiButton>
        <UiButton size="sm" @click="goPortrait">教师画像</UiButton>
        <UiButton size="sm" @click="goCorrection">我的纠错</UiButton>
        <UiButton size="sm" @click="goOneTable">教师一张表</UiButton>
        <UiButton v-if="canManageOwnPrivacy" size="sm" @click="goPrivacySettings">
          隐私设置
        </UiButton>
      </div>

      <WorkbenchSurfaceCard class="teacher-home__status">
        <template #head>
          <div class="teacher-home__panel-head">
            <h3 class="teacher-home__panel-title">
              {{
                workbenchSummary?.currentAcademicYear
                  ? `${workbenchSummary.currentAcademicYear} 档案状态`
                  : '档案状态'
              }}
            </h3>
            <UiButton
              variant="ghost"
              size="sm"
              :disabled="!portrait && !portraitAbsent"
              @click="goPortrait"
            >
              查看画像
            </UiButton>
          </div>
        </template>
        <a-spin :spinning="workbenchSummaryLoading || loading">
          <div class="teacher-home__status-grid">
            <section class="teacher-home__status-block">
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
                  {{ workbenchSummary.requiredCategoryTotal ?? 0 }} · 荣誉
                  {{ workbenchSummary.honorTotalCount ?? 0 }} · 拓展
                  {{ workbenchSummary.extensionActivityTotalCount ?? 0 }}
                </p>
                <p
                  v-if="(workbenchSummary.courseArchiveTaughtCourseCount ?? 0) > 0"
                  class="teacher-home__meta teacher-home__meta--link"
                  @click="goCourseArchiveWithAcademicYear(workbenchSummary?.currentAcademicYear)"
                >
                  本学年讲授 {{ workbenchSummary.courseArchiveTaughtCourseCount }} 门 · 五框架齐备
                  {{ workbenchSummary.courseArchiveFullyCompleteCount ?? 0 }} 门（{{
                    workbenchSummary.courseArchiveFrameworkSlotDone ?? 0
                  }}/{{ workbenchSummary.courseArchiveFrameworkSlotTotal ?? 0 }}）
                </p>
                <p
                  v-if="
                    workbenchSummary.completenessPercent === 0
                      && (workbenchSummary.requiredCategoryDone ?? 0) === 0
                  "
                  class="teacher-home__onboarding"
                >
                  数据不足，请先完成建档
                </p>
              </template>
              <UiEmpty v-else-if="!workbenchSummaryLoading" description="尚未生成档案完整度" />
            </section>
            <section class="teacher-home__status-block">
              <template v-if="portrait">
                <p class="teacher-home__portrait-score">
                  综合画像 {{ portrait.compositeScore }}
                  <span class="teacher-home__portrait-unit">分</span>
                </p>
                <p class="teacher-home__meta">
                  正式档案 {{ portrait.officialRecordCount }} 条
                  <template v-if="portrait.computedTime">
                    · 更新于 {{ portrait.computedTime }}
                  </template>
                </p>
                <p v-if="portraitDataInsufficient" class="teacher-home__onboarding">
                  画像数据不足，请先完成建档
                </p>
              </template>
              <UiEmpty v-else-if="portraitAbsent && !loading" description="尚未生成画像快照" />
            </section>
          </div>
        </a-spin>
      </WorkbenchSurfaceCard>

      <WorkbenchSurfaceCard class="teacher-home__todos">
        <template #head>
          <div class="teacher-home__panel-head">
            <h3 class="teacher-home__panel-title">待办聚合</h3>
            <span v-if="workbenchSummary" class="teacher-home__todo-count">
              未完成 {{ workbenchSummary.pendingTodoCount }} 项
            </span>
          </div>
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
              <p v-if="todoCourseScopeLabel(item)" class="teacher-home__meta">
                课程 {{ todoCourseScopeLabel(item) }}
              </p>
              <p v-if="item.dueTime" class="teacher-home__meta">截止 {{ item.dueTime }}</p>
              <UiButton
                v-if="
                  item.todoType === PortfolioTodoTypeCode.CORRECTION_REJECTED && canManageOwnPrivacy
                "
                size="sm"
                variant="soft"
                :loading="acknowledgingTodoKey === `${item.todoType}:${item.refId}`"
                :disabled="Boolean(acknowledgingTodoKey)"
                @click.stop="acknowledgeRejectedCorrection(item)"
              >
                确认知悉
              </UiButton>
            </li>
          </ul>
          <UiEmpty
            v-else
            description="当前无未完成待办。若刚提交材料请刷新；缺口与退回会出现在此列表，不会被隐藏。"
          />
        </a-spin>
      </WorkbenchSurfaceCard>
    </div>
  </StageWorkbenchShell>
  <PortfolioProgressCompareDrawer v-model:open="compareDrawerOpen" :teacher-id="targetTeacherId" />
</template>

<style scoped lang="scss">
.teacher-home__layout {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
  min-width: 0;
}

.teacher-home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  padding: var(--dp-space-2) 0;
}

.teacher-home__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.teacher-home__panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.teacher-home__status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-4);
}

.teacher-home__completeness-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
}

.teacher-home__percent {
  font-size: 28px;
  font-weight: var(--dp-font-weight-semibold);
  line-height: 1.2;
  color: var(--dp-text-primary);
}

.teacher-home__portrait-score {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.teacher-home__portrait-unit {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-muted);
}

.teacher-home__meta {
  margin: var(--dp-space-2) 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.teacher-home__meta--link {
  color: var(--dp-color-primary);
  cursor: pointer;
}
.teacher-home__meta--link:hover {
  text-decoration: underline;
}

.teacher-home__onboarding {
  margin: var(--dp-space-2) 0 0;
  font-size: 13px;
  color: var(--ant-color-warning);
}

.teacher-home__todo-count {
  font-size: 13px;
  color: var(--dp-text-muted);
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
  .teacher-home__status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
