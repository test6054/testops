<template>
  <div class="appeal-page">
    <div class="appeal-page__toolbar">
      <UiButton variant="outline" size="sm" @click="reloadAll">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <div class="appeal-page__cards">
      <ReviewWindowPolicyCard
        :exam-id="currentExamId"
        :reload-token="windowReloadToken"
        @changed="onAppealFlowChanged"
      />
      <ReviewRequestsCard
        :exam-id="currentExamId"
        :reload-token="requestReloadToken"
        @handled="onRequestHandled"
      />
      <CorrectionsCard
        :exam-id="currentExamId"
        :reload-token="correctionReloadToken"
        @created="onCorrectionCreated"
      />
      <BatchCorrectionPlansCard
        :exam-id="currentExamId"
        :reload-token="batchReloadToken"
        @changed="onAppealFlowChanged"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const currentExamId = computed(() => selectedExamId.value || '')

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

watch(selectedExamId, (value) => {
  if (value) {
    reloadAll()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.appeal-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
