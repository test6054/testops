<template>
  <StageWorkbenchShell class="exam-workspace-layout">
    <template #context>
      <ContextBar>
        <template #status>
          <UiTextAction tone="primary" @click="goExamList">返回考试列表</UiTextAction>
          <MarkExamSelect
            v-if="examOptions.length > 0"
            :selected-exam-id="examId"
            :exam-options="examOptions"
            :loading="selectorLoading"
            select-class="exam-workspace-layout__exam-select"
            :allow-clear="false"
            @change="onExamSwitch"
            @search="onExamSearch"
          />
          <UiTag v-if="snapshot" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
        </template>
        <template #actions>
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
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <StageRail
        v-if="examId && orderedStages.length > 0"
        :stages="orderedStages"
        :active-key="activeStageKey"
        compact
        @select="onStageSelect"
      />
    </template>

    <UiAlertStrip
      v-if="suggestionBanner"
      tone="warning"
      :title="suggestionBanner"
      dense
      class="exam-workspace-layout__banner"
    />

    <UiEmpty
      v-if="!examId"
      description="缺少考试上下文，请从考试列表进入"
      class="exam-workspace-layout__empty"
    >
      <UiButton variant="primary" @click="goExamList">返回考试列表</UiButton>
    </UiEmpty>

    <div v-else class="exam-workspace-layout__body">
      <nav v-if="phaseNavItems.length > 0" class="exam-workspace-layout__nav">
        <a-menu
          mode="inline"
          :selected-keys="[activeMenuKey]"
          @click="onNavClick"
        >
          <a-menu-item v-for="item in phaseNavItems" :key="item.routeName">
            {{ item.title }}
          </a-menu-item>
        </a-menu>
      </nav>
      <main class="exam-workspace-layout__content">
        <a-spin :spinning="loading && !snapshot">
          <router-view />
        </a-spin>
      </main>
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { SelectValue } from 'ant-design-vue/es/select'
import type { MarkStageKey } from '@/stores/modules/markStage'
import type { WorkbenchStage } from '@/types/workbench'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from '@/apis/mark/exam'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ContextBar, StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { provideMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { useMarkWorkbenchSnapshot } from '@/composables/useMarkWorkbenchSnapshot'
import {
  MARK_STAGE_DEFAULT_ROUTE,
  resolveWorkspaceNavGroup,
} from '@/constants/mark-workspace-nav'
import { MARK_STAGE_ORDER } from '@/stores/modules/markStage'
import mittBus from '@/utils/mitt'

defineOptions({ name: 'ExamWorkspaceLayout' })

const route = useRoute()
const router = useRouter()
const examId = computed(() => String(route.params.examId ?? ''))

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
  refreshing,
  orderedStages,
  suggestedStageKey,
  refreshSnapshot,
} = useMarkWorkbenchSnapshot(() => examId.value)

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

const phaseNavItems = computed(() => {
  const group = resolveWorkspaceNavGroup(route.meta.workspacePhase as string | undefined)
  return group?.items ?? []
})

const activeMenuKey = computed(() => String(route.name ?? ''))

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
  if (!suggested || suggested === active) {
    return ''
  }
  const stage = orderedStages.value.find((item) => item.key === suggested)
  if (!stage) {
    return ''
  }
  return `建议优先处理「${stage.title}」：${stage.statusText || '仍有待完善项'}`
})

function goExamList(): void {
  void router.push({ name: 'TeacherExamList' })
}

function onExamSwitch(value: SelectValue): void {
  const nextExamId = value != null ? String(value) : ''
  if (!nextExamId || nextExamId === examId.value) {
    return
  }
  void router.push({
    name: route.name,
    params: { ...route.params, examId: nextExamId },
  })
}

function onStageSelect(stage: WorkbenchStage): void {
  const routeName = MARK_STAGE_DEFAULT_ROUTE[stage.key as MarkStageKey]
  if (!routeName || !examId.value) {
    return
  }
  void router.push({
    name: routeName,
    params: { examId: examId.value },
  })
}

function onNavClick({ key }: { key: Key }): void {
  if (!examId.value) {
    return
  }
  void router.push({
    name: String(key),
    params: { examId: examId.value },
  })
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
</script>

<style lang="scss" scoped>
.exam-workspace-layout {
  &__exam-select {
    width: 280px;
  }

  &__banner {
    margin-bottom: 4px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__body {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  &__nav {
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md);
    background: var(--ant-color-bg-container);
    overflow: hidden;
  }

  &__content {
    min-width: 0;
  }

  @media (max-width: 768px) {
    &__body {
      grid-template-columns: 1fr;
    }

    &__nav {
      display: none;
    }
  }
}
</style>
