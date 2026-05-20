<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="stats-page__context">
        <div class="stats-page__context-left">
          <a-select
            :value="selectedExamId"
            class="stats-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag v-if="selectedExamId" tone="blue" size="sm">已选考试</UiTag>
        </div>
        <div class="stats-page__context-right">
          <UiButton variant="outline" size="sm" :disabled="!selectedExamId" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看统计与教学分析"
      class="stats-page__empty"
    />

    <template v-else>
      <!-- B-12 教学分析联动上下文：跨卡片打通班级 / 学生维度，避免子卡片各自孤立 -->
      <UiAlertStrip
        v-if="hasLinkageContext"
        tone="info"
        title="教学分析联动上下文"
        :description="linkageDescription"
        dense
        class="stats-page__linkage"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="clearLinkage">
            清空联动
          </UiButton>
        </template>
      </UiAlertStrip>

      <div class="stats-page__cards">
        <QuestionAnalysisCard
          :exam-id="selectedExamId"
          :reload-token="qaToken"
          @generated="reloadRejudge"
        />
        <RejudgePlanCard :exam-id="selectedExamId" :reload-token="rejudgeToken" />
        <TeachingImprovementCard :exam-id="selectedExamId" :reload-token="improvementToken" />
        <ClassWeaknessCard
          :exam-id="selectedExamId"
          :reload-token="weaknessToken"
          @class-change="handleClassChange"
        />
        <ErrorCauseClusterCard :exam-id="selectedExamId" :reload-token="errorCauseToken" />
        <StudentLearningProfileCard
          :exam-id="selectedExamId"
          :reload-token="profileToken"
          :class-id-hint="activeClassId"
          @student-change="handleStudentChange"
        />
      </div>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import { UiAlertStrip, UiButton, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
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

// B-12 子卡片联动：跨卡片记录活跃的班级 / 学生上下文
const activeClassId = ref<string>('')
const activeStudentUserId = ref<string>('')

const hasLinkageContext = computed(() => !!activeClassId.value || !!activeStudentUserId.value)

const linkageDescription = computed(() => {
  const parts: string[] = []
  if (activeClassId.value) parts.push(`班级 ID = ${activeClassId.value}`)
  if (activeStudentUserId.value) parts.push(`学生用户 ID = ${activeStudentUserId.value}`)
  return `当前联动范围：${parts.join('，')}。其他卡片会在相应位置显示一致的上下文提示。`
})

function handleClassChange(classId: string): void {
  activeClassId.value = classId
}

function handleStudentChange(studentUserId: string): void {
  activeStudentUserId.value = studentUserId
}

function clearLinkage(): void {
  activeClassId.value = ''
  activeStudentUserId.value = ''
}

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
  // 切换考试时清空联动上下文，避免跨考试串号
  clearLinkage()
  if (v) reloadAll()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) reloadAll()
})
</script>

<style lang="scss" scoped>
.stats-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__context-right {
    flex-shrink: 0;
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__linkage {
    margin-bottom: 12px;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
