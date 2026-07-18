<template>
  <div class="exam-detail-layout">
    <header
      class="exam-detail-layout__header"
      :class="{
        'exam-detail-layout__header--collapsed': sidebarCollapsed && !isImmersiveWorkspace,
        'exam-detail-layout__header--immersive': isImmersiveWorkspace,
      }"
    >
      <div class="exam-detail-layout__logo" @click="goExamList">
        <img alt="logo" class="exam-detail-layout__logo-img" src="/logo.svg" />
        <span class="exam-detail-layout__logo-title">{{ appTitle }}</span>
      </div>
      <div v-if="examId" class="exam-detail-layout__header-toolbar">
        <UiButton
          v-if="!isImmersiveWorkspace"
          class="exam-detail-layout__menu-toggle"
          variant="outline"
          size="sm"
          @click="mobileNavOpen = true"
        >
          <template #icon><MenuOutlined /></template>
          <span class="exam-detail-layout__menu-toggle-text">{{ mobileNavLabel }}</span>
        </UiButton>
        <div class="exam-detail-layout__header-switcher">
          <ExamSwitcher
            :selected-exam-id="examId"
            :options="examSwitcherOptions"
            :loading="examSelectorLoading"
            @change="onExamSwitch"
            @search="onExamSearch"
          />
        </div>
      </div>
      <div class="exam-detail-layout__header-gap" />
      <HeaderRightBar variant="workbench" class="exam-detail-layout__header-right" />
    </header>

    <div class="exam-detail-layout__body">
      <div
        v-if="examId && mobileNavOpen && !isImmersiveWorkspace"
        class="exam-detail-layout__backdrop"
        @click="mobileNavOpen = false"
      />
      <ExamSubSidebar
        v-if="examId && !isImmersiveWorkspace"
        :exam-status-label="examStatusLabel"
        :exam-status-tone="examStatusTone"
        :exam-display-name="snapshot?.examName"
        :exam-display-no="snapshot?.examNo"
        :exam-context-line="sidebarContextLine"
        :active-menu-key="activeMenuKey"
        :active-journey-key="activeJourneyKey"
        :journey-stages="journeyStages"
        :suggested-stage-key="suggestedStageKey"
        :journey-loading="loading && !snapshot"
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileNavOpen"
        :menu-icon-map="menuIconMap"
        @menu-click="onMenuClick"
        @journey-select="(key) => onJourneySelect(key as ExamJourneyKey)"
        @overview-select="onOverviewSelect"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />

      <main class="exam-detail-layout__main">
        <div
          class="exam-detail-layout__content"
          :class="{ 'exam-detail-layout__content--wide': isLayoutWide }"
        >
          <ExamSelectGateStrip
            v-if="!examId"
            class="exam-detail-layout__empty"
            body="缺少考试上下文，请从考试列表进入本场考试工作台"
          />

          <UiSkeletonState
            v-else-if="loading && !snapshot"
            variant="card"
            :card-count="2"
            compact
            class="exam-detail-layout__empty"
          />

          <template v-else>
            <UiAlertStrip
              v-if="workspaceBlockingVisible"
              :tone="workspaceBlockingTone"
              :title="workspaceBlockingTitle"
              :description="workspaceBlockingDescription"
              dense
              inline
              class="exam-detail-layout__workspace-blocking"
            >
              <template #actions>
                <UiButton size="sm" variant="primary" @click="goPrepBlockingAction">
                  去处理
                </UiButton>
              </template>
            </UiAlertStrip>
            <ConfidentialStatusBar
              v-if="isExamConfidential && !isImmersiveWorkspace"
              class="exam-detail-layout__confidential-strip"
            />
            <ExamWorkflowTaskDock
              v-if="showTaskDock"
              :task="activeTask"
              class="exam-detail-layout__task-dock"
              @dismiss="dismissActiveTask"
              @action="runActiveTaskAction"
            />
            <ExamWorkspaceChrome
              v-if="showWorkspaceChrome"
              :page-title="workspacePageTitle"
              :show-journey-rail="false"
              :show-signal-band="false"
            />
            <UiEmpty
              size="sm"
              v-if="isImmersiveWorkspace && !isDesktopMarkingViewport"
              :description="`批阅与复核需在较宽屏幕操作，请使用桌面端（宽度 ≥ ${DESKTOP_MARKING_MIN}px）`"
              class="exam-detail-layout__empty"
            >
              <UiButton size="sm" variant="primary" @click="exitImmersiveWorkspace">返回任务列表</UiButton>
            </UiEmpty>
            <router-view v-else v-slot="{ Component: ViewComponent, route: childRoute }">
              <ExamWorkspaceChildFrame
                v-if="ViewComponent"
                :child-route="childRoute"
                :child-component="ViewComponent"
                :immersive="isImmersiveWorkspace"
                :should-cache="shouldCacheWorkspaceRoute(childRoute)"
                :route-key="getWorkspaceRouteKey(childRoute)"
              />
            </router-view>
          </template>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { Component } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { ExamStatusCode } from '@/apis/mark/exam'
import type { ExamSwitcherOption } from '@/components/workbench/ExamSwitcher.vue'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import type { MarkStageKey } from '@/stores/modules/markStage'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import ApiOutlined from '@ant-design/icons-vue/ApiOutlined'
import AuditOutlined from '@ant-design/icons-vue/AuditOutlined'
import BarChartOutlined from '@ant-design/icons-vue/BarChartOutlined'
import BulbOutlined from '@ant-design/icons-vue/BulbOutlined'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import CloudUploadOutlined from '@ant-design/icons-vue/CloudUploadOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import DesktopOutlined from '@ant-design/icons-vue/DesktopOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import ExportOutlined from '@ant-design/icons-vue/ExportOutlined'
import FileProtectOutlined from '@ant-design/icons-vue/FileProtectOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import FundOutlined from '@ant-design/icons-vue/FundOutlined'
import HighlightOutlined from '@ant-design/icons-vue/HighlightOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import PrinterOutlined from '@ant-design/icons-vue/PrinterOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import RobotOutlined from '@ant-design/icons-vue/RobotOutlined'
import SafetyOutlined from '@ant-design/icons-vue/SafetyOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import { useBreakpoints } from '@vueuse/core'
import { computed, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXAM_STATUS_TONE, ExamStatusDescription } from '@/apis/mark/exam'
import ConfidentialStatusBar from '@/components/mark/ConfidentialStatusBar.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamSubSidebar from '@/components/workbench/ExamSubSidebar.vue'
import ExamSwitcher from '@/components/workbench/ExamSwitcher.vue'
import ExamWorkflowTaskDock from '@/components/workbench/ExamWorkflowTaskDock.vue'
import ExamWorkspaceChildFrame from '@/components/workbench/ExamWorkspaceChildFrame.vue'
import ExamWorkspaceChrome from '@/components/workbench/ExamWorkspaceChrome.vue'
import { useExamJourneySteps } from '@/composables/useExamJourneySteps'
import { useExamWorkflowTaskDock } from '@/composables/useExamWorkflowTaskDock'
import { useExamWorkspaceChrome } from '@/composables/useExamWorkspaceChrome'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import {
  EXAM_WORKSPACE_CHROME_KEY,
  provideMarkWorkbenchContext,
} from '@/composables/useMarkWorkbenchContext'
import { useMarkWorkbenchSnapshot } from '@/composables/useMarkWorkbenchSnapshot'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import { DESKTOP_MARKING_MIN } from '@/constants/breakpoints'
import { EXAM_JOURNEY_STEPS } from '@/constants/exam-journey'
import {
  findExamWorkspaceMenuItem,
  resolveExamWorkspaceMenuKey,
} from '@/constants/exam-workspace-menu'
import HeaderRightBar from '@/layout/components/HeaderRightBar/index.vue'
import { useAppStore } from '@/stores/modules/app'
import { MarkTeacherDashboardJourneyKeyCode } from '@/types/enums/mark-teacher-dashboard-journey-key-enum'
import { formatMarkExamOptionLabel } from '@/utils/mark-exam-option'
import { navigateToJourneyStep } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamWorkspaceLayout' })

const menuIconMap: Record<ExamWorkspaceMenuKey, Component> = {
  "overview": DashboardOutlined,
  "prep": ContainerOutlined,
  'layout-designer': ProfileOutlined,
  'candidate-roster': TeamOutlined,
  'print-package': PrinterOutlined,
  'scan-batches': CloudUploadOutlined,
  'scan-manual-entry': FileSearchOutlined,
  'scan-monitor': DesktopOutlined,
  'scan-ledger': AuditOutlined,
  'scan-devices': SettingOutlined,
  'scan-ocr': ScanOutlined,
  'marking-org': EditOutlined,
  'marking-org-trial': HighlightOutlined,
  'marking-org-formal': CheckCircleOutlined,
  'trial-pool': HighlightOutlined,
  'trial-progress': LineChartOutlined,
  'marking-experience-assist': AimOutlined,
  'marking-pool': HighlightOutlined,
  'marking-progress': LineChartOutlined,
  'marking-review-progress': LineChartOutlined,
  'marking-arbitration': AuditOutlined,
  'marking-quality': CheckCircleOutlined,
  'marking-quality-monitor': SafetyOutlined,
  'marking-audit-trail': FileProtectOutlined,
  'marking-review': EditOutlined,
  'marking-review-batch': CheckCircleOutlined,
  'archive-grading-experience': BulbOutlined,
  'score-summary': CheckCircleOutlined,
  'score-release': FundOutlined,
  'score-absence': TeamOutlined,
  'score-appeal': AuditOutlined,
  'archive-package': FolderOutlined,
  'archive-ai-analysis': RobotOutlined,
  'archive-question-analysis': FileSearchOutlined,
  'archive-statistics': BarChartOutlined,
  'archive-exports': ExportOutlined,
  'archive-teaching-affairs': ApiOutlined,
}

const route = useRoute()
const router = useRouter()
const breakpoints = useBreakpoints({
  desktopMarking: DESKTOP_MARKING_MIN,
})
const isDesktopMarkingViewport = breakpoints.greaterOrEqual('desktopMarking')
const appStore = useAppStore()
const appTitle = computed(() => appStore.getTitle())
const sidebarCollapsed = ref(false)
const mobileNavOpen = ref(false)

const examId = computed(() => String(route.params.examId ?? ''))
/**
 * 批阅 / 复核沉浸页：隐藏旅程轨与侧栏，主内容全宽。
 * 当前每个 layoutWide 路由都是沉浸页，故沉浸判定与宽内容样式共用同一来源；
 * 若未来出现「宽内容但保留导航」的页面，再拆分为两个独立标志。
 */
const isImmersiveWorkspace = computed(() => route.meta.layoutWide === true)
const isLayoutWide = isImmersiveWorkspace

const showWorkspaceChrome = computed(
  () =>
    Boolean(examId.value) && !isImmersiveWorkspace.value && route.meta.hasWorkbenchShell !== true,
)

const workspacePageTitle = computed(() => {
  const title = route.meta.title
  return typeof title === 'string' ? title : ''
})

const {
  exams,
  examOptions,
  loading: selectorLoading,
  searching: selectorSearching,
  resolvingPinned: selectorResolvingPinned,
  onExamSearch,
  syncPinnedExam,
  init: initExamSelector,
} = useMarkExamSelector({ syncUrl: false })

const examSelectorLoading = computed(
  () => selectorLoading.value || selectorSearching.value || selectorResolvingPinned.value,
)

const {
  snapshot,
  loading,
  refreshing,
  orderedStages,
  suggestedStageKey,
  prepBlockingReasons,
  refreshSnapshot,
} = useMarkWorkbenchSnapshot(() => examId.value)

const { isExamConfidential } = useWorkspaceConfidentialContext()

const { journeyStages, activeJourneyKey } = useExamJourneySteps(orderedStages)

/** 准备旅程子页自带 ContextBar / 步骤卡，layout 不再重复硬阻断条 */
const isPrepSelfManagedPage = computed(
  () => activeJourneyKey.value === 'prep' && route.meta.hasWorkbenchShell === true,
)

const workspaceChrome = useExamWorkspaceChrome({
  examId,
  snapshot,
  journeyStages,
  activeJourneyKey,
  suggestedStageKey,
  refreshSnapshot,
})
const { sidebarContextLine } = workspaceChrome
provide(EXAM_WORKSPACE_CHROME_KEY, workspaceChrome)

provideMarkWorkbenchContext({
  examId,
  selectedExamId: examId,
  snapshot,
  loading,
  refreshing,
  refreshSnapshot,
  examDetail: workspaceChrome.examDetail,
  examDetailLoading: workspaceChrome.detailLoading,
  markingProgress: workspaceChrome.markingProgress,
  refreshChrome: workspaceChrome.refreshChrome,
})

const activeMenuKey = computed(() =>
  resolveExamWorkspaceMenuKey(route.name ? String(route.name) : undefined),
)

const activeMarkStageKey = computed<MarkStageKey | null>(() => {
  const key = route.meta.markStageKey
  return typeof key === 'string' ? (key as MarkStageKey) : null
})

const stageSuggestionDescription = computed(() => {
  const key = suggestedStageKey.value
  if (!key) {
    return ''
  }
  const stage = snapshot.value?.stages.find((item) => item.key === key)
  return stage?.hint ?? '主链仍有待推进阶段，可继续向前处理。'
})

const nextActions = computed(() => snapshot.value?.nextActions ?? [])

const { activeTask, showTaskDock, dismissActiveTask, runActiveTaskAction }
  = useExamWorkflowTaskDock({
    examId,
    route,
    isImmersiveWorkspace,
    nextActions,
    prepBlockingReasons,
    suggestedStageKey,
    activeMarkStageKey,
    stageSuggestionDescription,
    suggestedStageActionLabel: computed(() => workspaceChrome.suggestedStageActionLabel.value),
    goSuggestedStageByKey: workspaceChrome.goSuggestedStageByKey,
  })

const mobileNavLabel = computed(() => {
  if (activeJourneyKey.value === 'overview') {
    return '考试概览'
  }
  const step = EXAM_JOURNEY_STEPS.find((item) => item.key === activeJourneyKey.value)
  return step?.title ?? '功能菜单'
})

const examStatusLabel = computed(() => {
  const status = snapshot.value?.examStatus
  if (!status) {
    return ''
  }
  return strictEnumLabel(ExamStatusDescription, status, 'examStatus')
})

const examStatusTone = computed(() => {
  const status = snapshot.value?.examStatus
  if (!status) {
    return undefined
  }
  return strictEnumTone(EXAM_STATUS_TONE, status, 'examStatus')
})

/** 工作台顶栏阻断：单行 inline，禁止大框占屏；非沉浸态统一展示 */
const workspaceBlockingVisible = computed(() => {
  if (isImmersiveWorkspace.value) {
    return false
  }
  if (isPrepSelfManagedPage.value) {
    return false
  }
  return prepBlockingReasons.value.length > 0
})

const workspaceBlockingTone = computed(() => 'error' as const)

const workspaceBlockingTitle = computed(() => {
  if (activeJourneyKey.value === 'prep') {
    return '准备硬阻断'
  }
  return '主链阻断'
})

const workspaceBlockingDescription = computed(() => prepBlockingReasons.value.join('；'))

/** 阻断条主行动：优先回准备工作台处理硬门禁 */
function goPrepBlockingAction(): void {
  if (!examId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspacePrep',
    params: { examId: examId.value },
  })
}

function toExamSwitcherOption(exam: {
  examId: string
  examName: string
  examNo?: string
  status?: ExamStatusCode
  examStatus?: ExamStatusCode
}): ExamSwitcherOption {
  const status = exam.examStatus ?? exam.status
  return {
    value: exam.examId,
    label: formatMarkExamOptionLabel({
      examName: exam.examName,
      examNo: exam.examNo ?? '',
    }),
    statusLabel: status ? strictEnumLabel(ExamStatusDescription, status, 'examStatus') : undefined,
    statusTone: status ? strictEnumTone(EXAM_STATUS_TONE, status, 'examStatus') : undefined,
  }
}

const examSwitcherOptions = computed<ExamSwitcherOption[]>(() => {
  const merged = new Map<string, ExamSwitcherOption>()
  for (const item of exams.value) {
    merged.set(item.examId, toExamSwitcherOption(item))
  }
  if (snapshot.value) {
    merged.set(snapshot.value.examId, toExamSwitcherOption(snapshot.value))
  }
  for (const item of examOptions.value) {
    if (!merged.has(item.value)) {
      merged.set(item.value, { ...item })
    }
  }
  return Array.from(merged.values())
})

function goExamList(): void {
  void router.push({ name: 'TeacherExamList' })
}

/** 识别详情页对象 ID 参数，切换考试时不得复用 */
function hasObjectIdParam(currentRoute: RouteLocationNormalized): boolean {
  const taskId = currentRoute.params.taskId
  return taskId != null && String(taskId).length > 0
}

function onExamSwitch(value: SelectValue): void {
  const nextExamId = value != null ? String(value) : ''
  if (!nextExamId || nextExamId === examId.value) {
    return
  }
  const nextJourney = activeJourneyKey.value === 'overview' ? 'prep' : activeJourneyKey.value
  if (isImmersiveWorkspace.value || hasObjectIdParam(route)) {
    navigateToJourneyStep(router, nextJourney as ExamJourneyKey, nextExamId, {
      scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
    })
    return
  }
  void router.push({
    name: route.name,
    params: { examId: nextExamId },
  })
}

function onMenuClick(menuKey: string): void {
  const item = findExamWorkspaceMenuItem(menuKey)
  if (!item || !examId.value) {
    return
  }
  mobileNavOpen.value = false
  void router.push({
    name: item.routeName,
    params: { examId: examId.value },
  })
}

function onJourneySelect(journeyKey: ExamJourneyKey): void {
  if (!examId.value) {
    return
  }
  mobileNavOpen.value = false
  navigateToJourneyStep(router, journeyKey, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
  })
}

function onOverviewSelect(): void {
  if (!examId.value) {
    return
  }
  mobileNavOpen.value = false
  void router.push({
    name: 'TeacherExamWorkspaceOverview',
    params: { examId: examId.value },
  })
}

function exitImmersiveWorkspace(): void {
  if (!examId.value) {
    goExamList()
    return
  }
  const menuKey = resolveExamWorkspaceMenuKey(route.name ? String(route.name) : undefined)
  const item = findExamWorkspaceMenuItem(menuKey)
  if (item) {
    void router.push({
      name: item.routeName,
      params: { examId: examId.value },
    })
    return
  }
  navigateToJourneyStep(router, MarkTeacherDashboardJourneyKeyCode.MARK, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
  })
}

function shouldCacheWorkspaceRoute(childRoute: RouteLocationNormalized): boolean {
  if (childRoute.meta.noCache === true) {
    return false
  }
  return childRoute.meta.keepAlive !== false
}

function getWorkspaceRouteKey(childRoute: RouteLocationNormalized): string {
  const workspaceExamId = childRoute.params.examId
  if (workspaceExamId != null && String(workspaceExamId).length > 0) {
    return `${String(childRoute.name ?? childRoute.path)}_${String(workspaceExamId)}`
  }
  return childRoute.fullPath
}

const initialized = ref(false)
watch(
  examId,
  async (id) => {
    if (!initialized.value) {
      await initExamSelector()
      initialized.value = true
    }
    if (id) {
      await syncPinnedExam(id)
    }
  },
  { immediate: true },
)

watch(isImmersiveWorkspace, (immersive) => {
  if (immersive) {
    mobileNavOpen.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.exam-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--dp-bg-layout);

  &__header {
    --sidebar-width: 260px;
    display: grid;
    grid-template-columns: var(--sidebar-width) auto minmax(0, 1fr) auto;
    align-items: center;
    height: 56px;
    padding: 0 24px 0 0;
    background: var(--dp-bg-container);
    border-bottom: 1px solid var(--dp-border-subtle);
    flex-shrink: 0;
    overflow: visible;

    &--collapsed {
      --sidebar-width: 64px;

      .exam-detail-layout__logo-title {
        display: none;
      }
    }

    &--immersive {
      --sidebar-width: auto;
      grid-template-columns: auto auto minmax(0, 1fr) auto;

      .exam-detail-layout__logo {
        width: auto;
        padding-left: 16px;
      }
    }
  }

  &__logo {
    grid-column: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    width: var(--sidebar-width);
    flex-shrink: 0;
    padding-left: 24px;
    cursor: pointer;
    min-width: 0;
  }

  &__logo-img {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  &__logo-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__header-toolbar {
    grid-column: 2;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__header-switcher {
    width: 320px;
    max-width: 360px;
    min-width: 0;
    flex-shrink: 0;
  }

  &__menu-toggle {
    display: none;
    flex-shrink: 0;
  }

  &__backdrop {
    display: none;
  }

  &__header-gap {
    grid-column: 3;
    min-width: 0;
  }

  &__header-right {
    grid-column: 4;
    margin-left: 16px;
    flex-shrink: 0;
    min-width: 0;
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    background: var(--dp-bg-layout);
  }

  &__content {
    flex: 1;
    overflow: auto;
    padding: var(--dp-space-3);
    /* 与全局 Main canvas 一致：灰底 + 白 Surface；沉浸宽页仍可局部覆盖 */
    background: var(--dp-bg-layout);

    &--wide {
      padding: 8px;

      :deep(> *) {
        max-width: min(100%, 1680px);
        margin: 0 auto;
      }
    }
  }

  &__prep-blocking,
  &__confidential-strip {
    margin-bottom: 16px;
  }

  &__task-dock {
    margin-bottom: 16px;
  }

  &__menu-toggle-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__empty {
    padding: var(--dp-space-3, 12px) 0;
  }

  @media (max-width: bp.$layout-mobile-max) {
    &__header {
      grid-template-columns: auto minmax(0, 1fr) auto;
      padding: 0 16px;
    }

    &__logo {
      grid-column: 1;
      width: auto;
      padding-left: 0;
    }

    &__logo-title {
      display: none;
    }

    &__header-toolbar {
      grid-column: 2;
      min-width: 0;
    }

    &__header-switcher {
      width: auto;
      max-width: none;
      flex: 1;
    }

    &__header-gap {
      display: none;
    }

    &__header-right {
      grid-column: 3;
      margin-left: 8px;
    }

    &__menu-toggle {
      display: inline-flex;
    }

    &__backdrop {
      display: block;
      position: fixed;
      inset: 56px 0 0;
      z-index: 190;
      background: color-mix(in srgb, var(--dp-text-primary) 35%, transparent);
    }
  }
}
</style>
