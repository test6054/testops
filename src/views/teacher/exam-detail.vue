<template>
  <div class="exam-workspace-overview">
    <a-spin :spinning="loading">
      <UiEmpty
        v-if="!loading && !detail"
        description="暂无数据"
        class="exam-workspace-overview__empty"
      />

      <template v-if="detail">
        <SignalBand :metrics="signalMetrics" compact class="exam-workspace-overview__signals" />

        <UiCard v-if="suggestedStage" class="exam-workspace-overview__cta">
          <div class="exam-workspace-overview__cta-body">
            <div>
              <p class="exam-workspace-overview__cta-label">建议下一步</p>
              <h3 class="exam-workspace-overview__cta-title">{{ suggestedStage.title }}</h3>
              <p v-if="suggestedStage.statusText" class="exam-workspace-overview__cta-hint">
                {{ suggestedStage.statusText }}
              </p>
            </div>
            <UiButton variant="primary" @click="goSuggestedStage">
              前往{{ suggestedStage.title }}
            </UiButton>
          </div>
        </UiCard>

        <UiCard class="exam-workspace-overview__journey-card">
          <template #title>
            <FundOutlined />
            <span>六步进度</span>
          </template>
          <ExamJourneyRail
            :stages="journeyStages"
            active-key=""
            @select="onJourneySelect"
          />
        </UiCard>

        <div class="exam-workspace-overview__toolbar">
          <div class="exam-workspace-overview__status">
            <UiTag :tone="examStatusTone(detail.status)" size="sm">
              {{ examStatusLabel(detail.status) }}
            </UiTag>
            <UiTag v-if="detail.examNo" tone="gray" size="sm">编号 {{ detail.examNo }}</UiTag>
            <UiTag tone="blue" size="sm">
              {{ detail.candidateCount }} 人 · {{ detail.questionCount }} 题
            </UiTag>
          </div>
        </div>

        <a-row :gutter="16">
          <a-col :xs="24" :lg="16">
            <UiCard class="info-card">
              <template #title>
                <ProfileOutlined />
                <span>基本信息</span>
              </template>
              <a-descriptions :column="descriptionColumn" :label-style="labelStyle">
                <a-descriptions-item label="考试名称">{{ detail.examName }}</a-descriptions-item>
                <a-descriptions-item label="考务编号">{{ detail.examNo }}</a-descriptions-item>
                <a-descriptions-item label="学年学期">
                  {{ formatAcademicTerm(detail) || '未设置' }}
                </a-descriptions-item>
                <a-descriptions-item label="状态">
                  <UiTag :tone="examStatusTone(detail.status)" size="sm">
                    {{ examStatusLabel(detail.status) }}
                  </UiTag>
                </a-descriptions-item>
                <a-descriptions-item label="批改策略">
                  {{ gradingStrategyLabel(detail.gradingStrategy) }}
                </a-descriptions-item>
                <a-descriptions-item label="成绩构成">
                  {{ scoreCompositionLabel(detail) }}
                </a-descriptions-item>
                <a-descriptions-item label="开始时间">
                  {{ formatDateTime(detail.examStartTime) }}
                </a-descriptions-item>
                <a-descriptions-item label="结束时间">
                  {{ formatDateTime(detail.examEndTime) }}
                </a-descriptions-item>
                <a-descriptions-item label="备注" :span="descriptionColumn">
                  {{ detail.remark || '未填写考试备注' }}
                </a-descriptions-item>
              </a-descriptions>
            </UiCard>

            <UiCard class="info-card">
              <template #title>
                <FileOutlined />
                <span>试卷模板</span>
                <UiBadge :tone="detail.templateId ? 'green' : 'orange'">
                  {{ detail.templateId ? '已配置' : '未配置' }}
                </UiBadge>
              </template>
              <UiEmpty v-if="!detail.templateId" description="暂无数据">
                <UiButton size="sm" @click="goPaperTemplate">前往配置</UiButton>
              </UiEmpty>
              <a-descriptions v-else :column="descriptionColumn" :label-style="labelStyle">
                <a-descriptions-item label="模板名称">{{ detail.templateName }}</a-descriptions-item>
                <a-descriptions-item label="总页数">{{ detail.totalPages }}</a-descriptions-item>
                <a-descriptions-item label="题目数量">{{ detail.questionCount }}</a-descriptions-item>
                <a-descriptions-item label="答案数量">{{ detail.answerCount }}</a-descriptions-item>
              </a-descriptions>
            </UiCard>
          </a-col>

          <a-col :xs="24" :lg="8">
            <UiCard class="info-card">
              <template #title>
                <TeamOutlined />
                <span>考试范围</span>
              </template>
              <UiEmpty v-if="!detail.classRefs.length" description="尚未设置参考班级" />
              <template v-else>
                <UiAlertStrip
                  v-if="!detail.classScopePersisted"
                  tone="warning"
                  title="参考班级尚未保存"
                  description="当前展示班级来自名册或已绑定卷推断，请前往考生名册保存为正式参考班级。"
                  dense
                />
                <div class="class-list">
                  <UiTag
                    v-for="classRef in detail.classRefs"
                    :key="classRef.classId"
                    tone="blue"
                    size="sm"
                  >
                    {{ classRef.className }}
                  </UiTag>
                </div>
              </template>
              <a-divider />
              <UiButton size="sm" variant="outline" block @click="goRoster">管理考生名册</UiButton>
            </UiCard>

            <UiCard class="info-card">
              <template #title>
                <AppstoreOutlined />
                <span>常用入口</span>
              </template>
              <div class="shortcut-list">
                <button type="button" class="shortcut-btn" @click="goPaperTemplate">
                  <FileOutlined />
                  <span>试卷模板</span>
                </button>
                <button type="button" class="shortcut-btn" @click="goAnswerSheetTemplate">
                  <FormOutlined />
                  <span>答题卡模板</span>
                </button>
                <button type="button" class="shortcut-btn" @click="goRoster">
                  <TeamOutlined />
                  <span>考生名册</span>
                </button>
              </div>
            </UiCard>
          </a-col>
        </a-row>
      </template>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { ExamDetailVO, ExamStatusCode, GradingStrategyCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ExamJourneyKey } from '@/constants/exam-journey'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import AppstoreOutlined from '@ant-design/icons-vue/AppstoreOutlined'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import FundOutlined from '@ant-design/icons-vue/FundOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import { useBreakpoints } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getExamDetail,
  GRADING_STRATEGY_LABEL,
} from '@/apis/mark/exam'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ExamJourneyRail from '@/components/workbench/ExamJourneyRail.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useExamJourneySteps } from '@/composables/useExamJourneySteps'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { navigateToJourneyStep, navigateToMarkStage } from '@/utils/mark-stage-navigation'
import mittBus from '@/utils/mitt'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

const router = useRouter()
const { selectedExamId: examIdRef } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const markStageStore = useMarkStageStore()
const { orderedStages, suggestedStageKey, snapshot } = storeToRefs(markStageStore)
const { journeyStages } = useExamJourneySteps(orderedStages)

const examId = computed<string>(() => examIdRef.value ?? '')
const detail = ref<ExamDetailVO | null>(null)
const loading = ref(false)

const breakpoints = useBreakpoints({ sm: 576 })
const descriptionColumn = computed(() => (breakpoints.greaterOrEqual('sm').value ? 2 : 1))
const labelStyle: CSSProperties = { color: 'var(--ant-color-text-tertiary)', width: '88px' }

const suggestedStage = computed<WorkbenchStage | null>(() => {
  const key = suggestedStageKey.value
  if (!key) {
    return null
  }
  return orderedStages.value.find((stage) => stage.key === key) ?? null
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const progress = snapshot.value?.markingProgress
  if (!progress) {
    return []
  }
  const gradeRate = progress.totalQuestionGradeCount > 0
    ? Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
    : 0
  const pendingTasks = progress.pendingReviewTaskCount + progress.inProgressReviewTaskCount
  return [
    {
      key: 'gradable',
      label: '可阅卷卷面',
      value: progress.gradablePaperCount,
      unit: `/${progress.paperCount}`,
      tone: progress.gradablePaperCount < progress.paperCount ? 'orange' : 'green',
    },
    {
      key: 'scan-attention',
      label: '扫描待处理',
      value: progress.scanAttentionCount,
      tone: progress.scanAttentionCount > 0 ? 'orange' : 'green',
    },
    {
      key: 'review-tasks',
      label: '复核任务',
      value: pendingTasks,
      tone: pendingTasks > 0 ? 'blue' : 'gray',
    },
    {
      key: 'grade-rate',
      label: '批阅完成率',
      value: gradeRate,
      unit: '%',
      tone: gradeRate >= 100 ? 'green' : gradeRate > 0 ? 'blue' : 'gray',
    },
  ]
})

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

function gradingStrategyLabel(strategy?: GradingStrategyCode): string {
  return strategy ? strictEnumLabel(GRADING_STRATEGY_LABEL, strategy, '批改策略') : '租户默认'
}

function scoreCompositionLabel(exam: ExamDetailVO): string {
  if (exam.dailyScoreFull != null) {
    return `期末考试 + 平时成绩（平时满分 ${exam.dailyScoreFull} 分）`
  }
  return '仅计入考试成绩'
}

function formatAcademicTerm(exam: ExamDetailVO): string {
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

async function loadDetail(): Promise<void> {
  if (!examId.value) {
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await getExamDetail(examId.value)
  } catch (error) {
    detail.value = null
    showUserError(error, '考试详情加载失败')
  } finally {
    loading.value = false
  }
}

function goPaperTemplate(): void {
  void router.push({ name: 'TeacherExamWorkspacePaperTemplate', params: { examId: examId.value } })
}

function goAnswerSheetTemplate(): void {
  void router.push({ name: 'TeacherExamWorkspaceAnswerSheet', params: { examId: examId.value } })
}

function goRoster(): void {
  void router.push({ name: 'TeacherExamWorkspaceCandidateRoster', params: { examId: examId.value } })
}

function goSuggestedStage(): void {
  const key = suggestedStageKey.value
  if (!key || !examId.value) {
    return
  }
  navigateToMarkStage(router, key, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
  })
}

function onJourneySelect(journeyKey: ExamJourneyKey): void {
  if (!examId.value) {
    return
  }
  navigateToJourneyStep(router, journeyKey, examId.value, {
    scanAttentionCount: snapshot.value?.markingProgress?.scanAttentionCount,
  })
}

watch(examId, () => {
  void loadDetail()
})

onMounted(() => {
  mittBus.on('exam-workbench:refresh', loadDetail)
  void loadDetail()
})

onBeforeUnmount(() => {
  mittBus.off('exam-workbench:refresh', loadDetail)
})

onActivated(() => {
  if (examId.value) {
    void loadDetail()
    void refreshSnapshot()
  }
})
</script>

<style lang="scss" scoped>
.exam-workspace-overview {
  &__signals {
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-border-secondary);
    border-radius: var(--dp-radius-md, 6px);
  }

  &__cta {
    margin-bottom: 16px;
  }

  &__cta-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__cta-label {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__cta-title {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  &__cta-hint {
    margin: 0;
    font-size: 13px;
    color: var(--ant-color-text-secondary);
  }

  &__journey-card {
    margin-bottom: 16px;
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__status,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__empty {
    padding: 48px 0;
  }
}

.info-card {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.class-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 6px);
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: var(--ant-color-text);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: var(--ant-color-primary-border);
    background: var(--dp-blue-50);
  }
}
</style>
