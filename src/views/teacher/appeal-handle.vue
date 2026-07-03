<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title title="成绩复核与更正">
        <template #status>
          <UiTag v-if="pendingCount > 0" tone="orange" size="sm">
            待处理复核 {{ pendingCount }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiAlertStrip
      v-if="republishGuideVisible"
      tone="warning"
      title="存在已更正成绩待重新发布"
      description="更正后学生侧不可见已更新分数，请前往「成绩发布」完成重新发布。"
      :closable="false"
      dense
      class="appeal-page__republish-strip"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="goScorePublish">前往成绩发布</UiButton>
      </template>
    </UiAlertStrip>

    <a-tabs v-model:active-key="activeTab" class="appeal-page__tabs">
      <a-tab-pane key="policy" tab="复核窗口策略">
        <ReviewWindowPolicyCard
          :exam-id="currentExamId"
          :reload-token="windowReloadToken"
          @changed="onAppealFlowChanged"
        />
      </a-tab-pane>

      <a-tab-pane key="requests" tab="复核申请">
        <ReviewRequestsCard
          :exam-id="currentExamId"
          :reload-token="requestReloadToken"
          @handled="onRequestHandled"
          @pending-change="pendingCount = $event"
        />
      </a-tab-pane>

      <a-tab-pane key="corrections" tab="成绩更正">
        <CorrectionsCard
          :exam-id="currentExamId"
          :reload-token="correctionReloadToken"
          @created="onCorrectionCreated"
          @republish-required="republishGuideVisible = true"
        />
      </a-tab-pane>

      <a-tab-pane key="batch" tab="批量更正计划">
        <BatchCorrectionPlansCard
          :exam-id="currentExamId"
          :reload-token="batchReloadToken"
          @changed="onAppealFlowChanged"
        />
      </a-tab-pane>
    </a-tabs>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

type AppealTabKey = 'policy' | 'requests' | 'corrections' | 'batch'

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const router = useRouter()
const currentExamId = computed(() => selectedExamId.value || '')

const activeTab = ref<AppealTabKey>('policy')
const pendingCount = ref(0)
const republishGuideVisible = ref(false)

const windowReloadToken = ref(0)
const requestReloadToken = ref(0)
const correctionReloadToken = ref(0)
const batchReloadToken = ref(0)

function reloadAll(): void {
  windowReloadToken.value += 1
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  batchReloadToken.value += 1
}

async function onRequestHandled(): Promise<void> {
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  await refreshSnapshot()
}

async function onCorrectionCreated(): Promise<void> {
  correctionReloadToken.value += 1
  requestReloadToken.value += 1
  await refreshSnapshot()
}

async function onAppealFlowChanged(): Promise<void> {
  windowReloadToken.value += 1
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
  batchReloadToken.value += 1
  await refreshSnapshot()
}

function goScorePublish(): void {
  const examId = currentExamId.value
  if (!examId) return
  void router.push({ name: 'TeacherExamWorkspaceScoreRelease', params: { examId } })
}

watch(
  selectedExamId,
  (value) => {
    if (value) {
      republishGuideVisible.value = false
      reloadAll()
    } else {
      pendingCount.value = 0
      republishGuideVisible.value = false
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.appeal-page__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 16px;
  }
}

.appeal-page__republish-strip {
  margin-bottom: 16px;
}

:deep(.appeal-section) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

:deep(.appeal-section__header) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
</style>
