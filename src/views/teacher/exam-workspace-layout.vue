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
      <UiButton
        v-if="examId && !isImmersiveWorkspace"
        class="exam-detail-layout__menu-toggle"
        variant="outline"
        size="sm"
        @click="mobileNavOpen = true"
      >
        <template #icon><MenuOutlined /></template>
        功能菜单
      </UiButton>
      <div class="exam-detail-layout__toolbar">
        <MarkExamSelect
          v-if="examOptions.length > 0"
          :selected-exam-id="examId"
          :exam-options="examOptions"
          :loading="selectorLoading"
          select-class="exam-detail-layout__exam-select"
          :allow-clear="false"
          @change="onExamSwitch"
          @search="onExamSearch"
        />
        <UiButton
          variant="outline"
          size="sm"
          :loading="refreshing"
          :disabled="!examId"
          @click="handleRefresh"
        >
          <template #icon><ReloadOutlined /></template>
          刷新
        </UiButton>
      </div>
      <div class="exam-detail-layout__header-gap" />
      <HeaderRightBar class="exam-detail-layout__header-right" />
    </header>

    <div v-if="examId && !isImmersiveWorkspace" class="exam-detail-layout__journey">
      <a-skeleton
        v-if="loading && !snapshot"
        active
        :title="false"
        :paragraph="{ rows: 1, width: '100%' }"
        class="exam-detail-layout__journey-skeleton"
      />
      <ExamJourneyRail
        v-else
        :stages="journeyStages"
        :active-key="activeJourneyKey === 'overview' ? '' : activeJourneyKey"
        @select="onJourneySelect"
      />
    </div>

    <div class="exam-detail-layout__body">
      <div
        v-if="examId && mobileNavOpen && !isImmersiveWorkspace"
        class="exam-detail-layout__backdrop"
        @click="mobileNavOpen = false"
      />
      <ExamSubSidebar
        v-if="examId && !isImmersiveWorkspace"
        :snapshot="snapshot"
        :exam-status-label="examStatusLabel"
        :exam-status-tone="examStatusTone"
        :active-menu-key="activeMenuKey"
        :active-journey-key="activeJourneyKey"
        :ordered-stages="orderedStages"
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileNavOpen"
        :menu-icon-map="menuIconMap"
        @menu-click="onMenuClick"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />

      <main class="exam-detail-layout__main">
        <div
          class="exam-detail-layout__content"
          :class="{ 'exam-detail-layout__content--wide': isLayoutWide }"
        >
          <UiAlertStrip
            v-if="suggestionBanner"
            tone="warning"
            :title="suggestionBanner"
            dense
            class="exam-detail-layout__banner"
          >
            <template #actions>
              <UiButton size="sm" variant="primary" @click="goSuggestedStage">前往建议阶段</UiButton>
            </template>
          </UiAlertStrip>

          <UiAlertStrip
            v-if="prepAdvisoryBanner"
            tone="info"
            :title="prepAdvisoryBanner"
            dense
            class="exam-detail-layout__banner"
          >
            <template #actions>
              <UiButton size="sm" variant="outline" @click="goPrepWorkbench">去完善准备</UiButton>
            </template>
          </UiAlertStrip>

          <UiEmpty
            v-if="!examId"
            description="缺少考试上下文，请从考试列表进入"
            class="exam-detail-layout__empty"
          >
            <UiButton variant="primary" @click="goExamList">返回考试列表</UiButton>
          </UiEmpty>

          <a-spin v-else :spinning="loading && !snapshot">
            <UiEmpty
              v-if="isImmersiveWorkspace && !isDesktopMarkingViewport"
              description="批阅与复核需在较宽屏幕操作，请使用桌面端（宽度 ≥ 1024px）"
              class="exam-detail-layout__empty"
            >
              <UiButton variant="primary" @click="exitImmersiveWorkspace">返回任务列表</UiButton>
            </UiEmpty>
            <router-view v-else v-slot="{ Component: ViewComponent, route: childRoute }">
              <template v-if="ViewComponent">
                <keep-alive v-if="shouldCacheWorkspaceRoute(childRoute)">
                  <component
                    :is="ViewComponent"
                    :key="getWorkspaceRouteKey(childRoute)"
                  />
                </keep-alive>
                <component
                  v-else
                  :is="ViewComponent"
                  :key="getWorkspaceRouteKey(childRoute)"
                />
              </template>
            </router-view>
          </a-spin>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { Component } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { ExamWorkspaceMenuKey } from '@/constants/exam-workspace-menu'
import type { MarkStageKey } from '@/stores/modules/markStage'
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
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FolderOutlined from '@ant-design/icons-vue/FolderOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import FundOutlined from '@ant-design/icons-vue/FundOutlined'
import HighlightOutlined from '@ant-design/icons-vue/HighlightOutlined'
import LineChartOutlined from '@ant-design/icons-vue/LineChartOutlined'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import PrinterOutlined from '@ant-design/icons-vue/PrinterOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import { useBreakpoints } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ExamJourneyRail from '@/components/workbench/ExamJourneyRail.vue'
import ExamSubSidebar from '@/components/workbench/ExamSubSidebar.vue'
import { useExamJourneySteps } from '@/composables/useExamJourneySteps'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { provideMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { useMarkWorkbenchSnapshot } from '@/composables/useMarkWorkbenchSnapshot'
import {
  findExamWorkspaceMenuItem,
  resolveExamWorkspaceMenuKey,
} from '@/constants/exam-workspace-menu'
import { shouldShowStageSuggestionBanner, WORKSPACE_STAGE_STATUS_LABEL } from '@/constants/mark-workspace-nav'
import HeaderRightBar from '@/layout/components/HeaderRightBar/index.vue'
import { useAppStore } from '@/stores/modules/app'
import { MARK_STAGE_ORDER } from '@/stores/modules/markStage'
import { navigateToJourneyStep, navigateToMarkStage } from '@/utils/mark-stage-navigation'
import mittBus from '@/utils/mitt'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExamWorkspaceLayout' })

const menuIconMap: Record<ExamWorkspaceMenuKey, Component> = {
  'overview': DashboardOutlined,
  'prep': ContainerOutlined,
  'paper-template': ProfileOutlined,
  'answer-sheet': FormOutlined,
  'paper-master': FileSearchOutlined,
  'candidate-roster': TeamOutlined,
  'print-package': PrinterOutlined,
  'scan-batches': CloudUploadOutlined,
  'scan-monitor': DesktopOutlined,
  'scan-ledger': AuditOutlined,
  'scan-devices': SettingOutlined,
  'scan-ocr': ScanOutlined,
  'marking-org': EditOutlined,
  'marking-assignment': TeamOutlined,
  'trial-pool': HighlightOutlined,
  'trial-progress': LineChartOutlined,
  'marking-pool': HighlightOutlined,
  'marking-progress': LineChartOutlined,
  'marking-arbitration': AuditOutlined,
  'marking-quality': CheckCircleOutlined,
  'marking-review': EditOutlined,
  'marking-review-batch': CheckCircleOutlined,
  'archive-grading-experience': BulbOutlined,
  'score-summary': CheckCircleOutlined,
  'score-release': FundOutlined,
  'score-absence': TeamOutlined,
  'score-appeal': AuditOutlined,
  'archive-package': FolderOutlined,
  'archive-statistics': BarChartOutlined,
  'archive-exports': ExportOutlined,
}

const route = useRoute()
const router = useRouter()
const breakpoints = useBreakpoints({
  desktopMarking: 1024,
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

const {
  examOptions,
  loading: selectorLoading,
  onExamSearch,
  syncPinnedExam,
  init: initExamSelector,
} = useMarkExamSelector({ syncUrl: false })

const {
  snapshot,
  loading,
  error: snapshotError,
  refreshing,
  orderedStages,
  suggestedStageKey,
  prepAdvisoryReasons,
  refreshSnapshot,
} = useMarkWorkbenchSnapshot(() => examId.value)

const { journeyStages, activeJourneyKey } = useExamJourneySteps(orderedStages)

provideMarkWorkbenchContext({
  examId,
  selectedExamId: examId,
  snapshot,
  loading,
  refreshing,
  refreshSnapshot,
})

const activeStageKey = computed<MarkStageKey>(() => {
  const key = route.meta.markStageKey
  if (!key || !MARK_STAGE_ORDER.includes(key as MarkStageKey)) {
    throw new Error(`路由 ${String(route.name)} 缺少有效 meta.markStageKey`)
  }
  return key as MarkStageKey
})

const activeMenuKey = computed(() => resolveExamWorkspaceMenuKey(route.name ? String(route.name) : undefined))

const examStatusLabel = computed(() => {
  const status = snapshot.value?.examStatus
  if (!status) {
    return ''
  }
  return EXAM_STATUS_LABEL[status]
})

const examStatusTone = computed(() => {
  const status = snapshot.value?.examStatus
  if (!status) {
    return undefined
  }
  return EXAM_STATUS_TONE[status]
})

const suggestionBanner = computed(() => {
  const suggested = suggestedStageKey.value
  const active = activeStageKey.value
  if (!suggested || !shouldShowStageSuggestionBanner(active, suggested)) {
    return ''
  }
  const stage = orderedStages.value.find((item) => item.key === suggested)
  if (!stage) {
    return ''
  }
  const statusLabel = stage.statusText?.trim()
    || strictEnumLabel(WORKSPACE_STAGE_STATUS_LABEL, stage.status, '工作台阶段状态')
  return `建议优先处理「${stage.title}」：${statusLabel}`
})

const prepAdvisoryBanner = computed(() => {
  if (activeStageKey.value !== 'SCAN' || prepAdvisoryReasons.value.length === 0) {
    return ''
  }
  return `准备项仍有待完善：${prepAdvisoryReasons.value.join('；')}`
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

function goSuggestedStage(): void {
  const suggested = suggestedStageKey.value
  if (!suggested || !examId.value) {
    return
  }
  navigateToMarkStage(router, suggested, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
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
  navigateToJourneyStep(router, 'mark', examId.value, {
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

function goPrepWorkbench(): void {
  if (!examId.value) {
    return
  }
  void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId: examId.value } })
}

async function handleRefresh(): Promise<void> {
  await refreshSnapshot()
  if (route.meta.workspacePhase === 'scan') {
    mittBus.emit('scan-workbench:refresh')
  }
}

const initialized = ref(false)
watch(examId, async (id) => {
  if (!initialized.value) {
    await initExamSelector()
    initialized.value = true
  }
  if (id) {
    await syncPinnedExam(id)
  }
}, { immediate: true })

watch(isImmersiveWorkspace, (immersive) => {
  if (immersive) {
    mobileNavOpen.value = false
  }
})
</script>

<style lang="scss" scoped>
.exam-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--ant-color-bg-layout);

  &__header {
    --sidebar-width: 260px;
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 16px;
    background: var(--ant-color-bg-container);
    border-bottom: 1px solid var(--ant-color-border-secondary);
    flex-shrink: 0;
    gap: 16px;

    &--collapsed {
      --sidebar-width: 64px;
    }

    &--immersive {
      --sidebar-width: auto;

      .exam-detail-layout__logo {
        width: auto;
      }
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    width: var(--sidebar-width);
    flex-shrink: 0;
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
    color: var(--ant-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  &__menu-toggle {
    display: none;
  }

  &__backdrop {
    display: none;
  }

  &__exam-select {
    width: 320px;
  }

  &__header-gap {
    flex: 1;
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
    background: var(--ant-color-bg-layout);
  }

  &__content {
    flex: 1;
    overflow: auto;
    padding: 16px;

    &--wide {
      padding: 8px;

      :deep(> *) {
        max-width: min(100%, 1680px);
        margin: 0 auto;
      }
    }
  }

  &__journey {
    flex-shrink: 0;
  }

  &__journey-skeleton {
    padding: 12px 16px;
  }

  &__banner {
    margin-bottom: 12px;
  }

  &__empty {
    padding: 60px 0;
  }

  @media (max-width: 768px) {
    &__logo-title,
    &__exam-select {
      display: none;
    }

    &__menu-toggle {
      display: inline-flex;
    }

    &__backdrop {
      display: block;
      position: fixed;
      inset: 56px 0 0;
      z-index: 190;
      background: rgba(0, 0, 0, 0.35);
    }
  }
}
</style>
