<template>
  <div class="appeal-page">
    <div class="appeal-page__toolbar">
      <UiButton variant="outline" size="sm" @click="reloadAll">
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <div class="appeal-page__cards">
      <ReviewWindowPolicyCard :exam-id="currentExamId" :reload-token="windowReloadToken" />
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
      <BatchCorrectionPlansCard :exam-id="currentExamId" :reload-token="batchReloadToken" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { UiButton } from '@/components/ui-guide/ui'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

const { selectedExamId } = useMarkExamContext()
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

function onRequestHandled(): void {
  requestReloadToken.value += 1
  correctionReloadToken.value += 1
}

function onCorrectionCreated(): void {
  correctionReloadToken.value += 1
  requestReloadToken.value += 1
}

watch(selectedExamId, (value) => {
  if (value) {
    reloadAll()
  }
})

onMounted(() => {
  if (selectedExamId.value) {
    reloadAll()
  }
})
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
