<template>
  <GiPageLayout>
    <div class="stats-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="stats-page__hero-card">
        <div class="stats-page__hero">
          <div class="stats-page__hero-main">
            <div class="stats-page__title-row">
              <h1 class="stats-page__title">成绩统计与教学分析</h1>
              <UiTag tone="purple" size="md">题目分析 · 重判计划 · AI 改进 · 班级薄弱</UiTag>
              <UiTag v-if="selectedExamId" tone="blue" size="md">已选考试</UiTag>
            </div>
          </div>
          <div class="stats-page__hero-actions">
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
        description="请选择一场考试以查看统计与教学分析"
        class="empty-block"
      />

      <div v-else class="stats-page__cards">
        <QuestionAnalysisCard
          :exam-id="selectedExamId"
          :reload-token="qaToken"
          @generated="reloadRejudge"
        />
        <RejudgePlanCard :exam-id="selectedExamId" :reload-token="rejudgeToken" />
        <TeachingImprovementCard :exam-id="selectedExamId" :reload-token="improvementToken" />
        <ClassWeaknessCard :exam-id="selectedExamId" :reload-token="weaknessToken" />
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
import ClassWeaknessCard from './statistics/ClassWeaknessCard.vue'
import QuestionAnalysisCard from './statistics/QuestionAnalysisCard.vue'
import RejudgePlanCard from './statistics/RejudgePlanCard.vue'
import TeachingImprovementCard from './statistics/TeachingImprovementCard.vue'

defineOptions({ name: 'TeacherStatistics' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const qaToken = ref(0)
const rejudgeToken = ref(0)
const improvementToken = ref(0)
const weaknessToken = ref(0)

function reloadAll(): void {
  qaToken.value += 1
  rejudgeToken.value += 1
  improvementToken.value += 1
  weaknessToken.value += 1
}

function reloadRejudge(): void {
  rejudgeToken.value += 1
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
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.stats-page__hero {
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

.stats-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stats-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
}


.stats-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  padding: 60px 0;
}
</style>
