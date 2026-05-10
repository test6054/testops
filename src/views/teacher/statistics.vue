<template>
  <GiPageLayout>
    <div class="stats-page">
      <PageHeader title="成绩统计">
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
        <ErrorCauseClusterCard :exam-id="selectedExamId" :reload-token="errorCauseToken" />
        <StudentLearningProfileCard :exam-id="selectedExamId" :reload-token="profileToken" />
      </div>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import ClassWeaknessCard from './statistics/ClassWeaknessCard.vue'
import ErrorCauseClusterCard from './statistics/ErrorCauseClusterCard.vue'
import QuestionAnalysisCard from './statistics/QuestionAnalysisCard.vue'
import RejudgePlanCard from './statistics/RejudgePlanCard.vue'
import StudentLearningProfileCard from './statistics/StudentLearningProfileCard.vue'
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
const errorCauseToken = ref(0)
const profileToken = ref(0)

function reloadAll(): void {
  qaToken.value += 1
  rejudgeToken.value += 1
  improvementToken.value += 1
  weaknessToken.value += 1
  errorCauseToken.value += 1
  profileToken.value += 1
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

.stats-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-block {
  padding: 60px 0;
}
</style>
