<template>
  <GiPageLayout>
    <div class="appeal-page">
      <PageHeader title="复核处理">
        <template #tags>
          <UiTag v-if="selectedExamId" tone="blue" size="md">已选考试</UiTag>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiButton variant="outline" size="sm" :disabled="!selectedExamId" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看复核处理内容"
        class="empty-block"
      />

      <div v-else class="appeal-page__cards">
        <ReviewWindowPolicyCard :exam-id="selectedExamId" :reload-token="windowReloadToken" />
        <ReviewRequestsCard
          :exam-id="selectedExamId"
          :reload-token="requestReloadToken"
          @handled="onRequestHandled"
        />
        <CorrectionsCard
          :exam-id="selectedExamId"
          :reload-token="correctionReloadToken"
          @created="onCorrectionCreated"
        />
        <BatchCorrectionPlansCard :exam-id="selectedExamId" :reload-token="batchReloadToken" />
      </div>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { onMounted, ref, watch } from 'vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import BatchCorrectionPlansCard from './appeal-handle/BatchCorrectionPlansCard.vue'
import CorrectionsCard from './appeal-handle/CorrectionsCard.vue'
import ReviewRequestsCard from './appeal-handle/ReviewRequestsCard.vue'
import ReviewWindowPolicyCard from './appeal-handle/ReviewWindowPolicyCard.vue'

defineOptions({ name: 'TeacherAppealHandle' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

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

watch(selectedExamId, (v) => {
  if (v) reloadAll()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) reloadAll()
})
</script>

<style lang="scss" scoped>
.appeal-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.appeal-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  padding: 60px 0;
}
</style>
