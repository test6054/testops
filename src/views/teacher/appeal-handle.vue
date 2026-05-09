<template>
  <GiPageLayout>
    <div class="appeal-page">
      <UiPageCard :show-header="false" class="appeal-page__hero-card">
        <div class="appeal-page__hero">
          <div class="appeal-page__hero-main">
            <div class="appeal-page__title-row">
              <h1 class="appeal-page__title">复核处理</h1>
              <UiTag tone="purple" size="md">窗口策略 · 申请处理 · 成绩更正 · 批量计划</UiTag>
              <UiTag v-if="selectedExamId" tone="blue" size="md">已选考试</UiTag>
            </div>
          </div>
          <div class="appeal-page__hero-actions">
            <a-select
              :value="selectedExamId"
              style="width: 320px"
              placeholder="选择考试"
              :options="examOptions"
              :loading="examLoading"
              show-search
              option-filter-prop="label"
              allow-clear
              @change="onExamChange"
            />
            <UiButton
              variant="outline"
              size="md"
              :disabled="!selectedExamId"
              @click="reloadAll"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新全部
            </UiButton>
          </div>
        </div>
      </UiPageCard>

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
import { UiButton, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'
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

.appeal-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }
}

.appeal-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.appeal-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
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
