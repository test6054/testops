<script lang="ts" setup>
/**
 * 考试准备聚合工作台
 *
 * 后端契约：
 * - POST /api/mark/exams/page  分页查询当前用户可见考试
 * - POST /api/mark/exams/detail  获取考试详情（包含 templateId / questionCount / answerCount / candidateCount / classIds）
 *
 * 业务定位：
 * 把"考试列表 → 试卷模板 → 答题卡模板 → 考生名册"四个准备阶段聚合为单一驾驶舱。
 * 用户选定考试后，工作台展示该考试在每个准备阶段的完成状态，以及跳转到对应详情页的入口。
 *
 * 阻断状态（按设计文档「6.4 考试准备」）：
 * - 试卷模板缺失：阻断制卷（templateId 为空 / totalPages = 0）
 * - 答题卡模板缺失：阻断扫描识别（questionCount = 0 时模板未完整建立）
 * - 标准答案缺失：阻断阅卷（answerCount = 0）
 * - 考生名册缺失：阻断身份绑定（candidateCount = 0 且 classIds 为空）
 *
 * 不引入 AI 装饰能力；所有状态来自后端真实数据，不构造默认通过状态。
 */
import type { Component } from 'vue'
import type { ExamDetailVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE, getExamDetail } from '@/apis/mark/exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useMarkStageStore } from '@/stores/modules/markStage'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

const ICON_MAP: Record<string, Component> = {
  paperTemplate: ProfileOutlined,
  answerSheet: FormOutlined,
  standardAnswer: FileSearchOutlined,
  candidateRoster: TeamOutlined,
}

function resolveIcon(key: string): Component {
  return ICON_MAP[key] ?? ProfileOutlined
}

const TONE_MAP: Record<WorkbenchStageStatus, BadgeTone> = {
  pending: 'gray',
  active: 'blue',
  completed: 'green',
  warning: 'orange',
  error: 'red',
  blocked: 'red',
}

function resolveTone(status: WorkbenchStageStatus): BadgeTone {
  return TONE_MAP[status]
}

const markStageStore = useMarkStageStore()

interface PrepStepCard {
  key: 'paperTemplate' | 'answerSheet' | 'standardAnswer' | 'candidateRoster'
  title: string
  description: string
  status: WorkbenchStageStatus
  statusText: string
  routeName: string
  primaryAction: string
  blockedReason?: string
}

const router = useRouter()

// B-8 统一考试选择器：列表加载、URL 同步、跨页面记忆
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExam: currentExam,
  onExamChange,
  loadExams,
  init: initExamSelector,
} = useMarkExamSelector()

const detail = ref<ExamDetailVO | null>(null)
const detailLoading = ref(false)
// D-9 错误态：考试详情加载失败时 UiErrorRetryPanel 重试 + 上报
const detailLoadError = ref<unknown>(null)

async function loadDetail(examId: string | undefined) {
  if (!examId) {
    detail.value = null
    detailLoadError.value = null
    return
  }
  detailLoadError.value = null
  detailLoading.value = true
  try {
    detail.value = await getExamDetail(examId)
  } catch (error) {
    detail.value = null
    detailLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '考试详情加载失败'
    message.error(errMsg)
  } finally {
    detailLoading.value = false
  }
}

function handleExamChange(value: unknown): void {
  onExamChange(value as string | number | undefined, [])
  if (selectedExamId.value) {
    markStageStore.observeExam(selectedExamId.value)
  }
  void loadDetail(selectedExamId.value)
}

/**
 * 同步准备阶段状态到阅卷主链 Store。
 * 映射规则：准备任一项未完成 → EXAM_PREP=active/blocked；全部完成 → EXAM_PREP=completed。
 * PAPER_TEMPLATE / SCAN 上游子阶段同步表示是否可推进。
 */
function syncStageProgressToStore(): void {
  if (!selectedExamId.value) return
  const examId = selectedExamId.value
  const steps = prepSteps.value
  if (steps.length === 0) return
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const blockedCount = steps.filter((s) => s.status === 'blocked').length
  const allCompleted = completedCount === steps.length
  const examPrepStatus: WorkbenchStageStatus = allCompleted
    ? 'completed'
    : blockedCount > 0
      ? 'blocked'
      : 'active'
  const examPrepHint
    = blockedReasons.value[0]
      ?? (allCompleted
      ? `准备全部就绪（${completedCount}/${steps.length}）`
      : `准备进度 ${completedCount}/${steps.length}`)
  // 答题卡模板 → PAPER_TEMPLATE 阶段
  const paperStep = steps.find((s) => s.key === 'paperTemplate')
  // 考生名册 → SCAN 阶段的身份绑定前置依赖
  const candStep = steps.find((s) => s.key === 'candidateRoster')
  markStageStore.bulkUpdate(examId, {
    EXAM_PREP: { status: examPrepStatus, hint: examPrepHint },
    PAPER_TEMPLATE: paperStep
      ? { status: paperStep.status, hint: paperStep.statusText }
      : undefined,
    SCAN:
      candStep && candStep.status !== 'completed'
        ? { status: 'blocked', hint: candStep.blockedReason || '考生名册未就绪' }
        : { status: 'pending', hint: '等待阅卷组织上游' },
  })
  markStageStore.setCurrentStage(examId, allCompleted ? 'PAPER_TEMPLATE' : 'EXAM_PREP')
}

/** 4 个准备阶段的状态计算 */
const prepSteps = computed<PrepStepCard[]>(() => {
  const d = detail.value
  if (!d) {
    return []
  }
  const hasTemplate = !!d.templateId
  const hasQuestions = (d.questionCount ?? 0) > 0
  const hasAnswers = (d.answerCount ?? 0) > 0
  const hasCandidates = (d.candidateCount ?? 0) > 0 || (d.classIds?.length ?? 0) > 0

  return [
    {
      key: 'paperTemplate',
      title: '答题卡模板',
      description: hasTemplate
        ? `已绑定模板 ${d.templateName || d.templateId}（${d.totalPages ?? 0} 页）`
        : '尚未配置答题卡模板，制卷与扫描识别均不可推进',
      status: hasTemplate ? 'completed' : 'blocked',
      statusText: hasTemplate ? '已配置' : '未配置',
      routeName: 'TeacherAnswerSheetTemplate',
      primaryAction: hasTemplate ? '查看 / 调整' : '配置答题卡模板',
      blockedReason: hasTemplate ? undefined : '答题卡模板缺失：阻断扫描识别',
    },
    {
      key: 'answerSheet',
      title: '题目模板',
      description: hasQuestions
        ? `已配置 ${d.questionCount} 道题，可进行评分配置`
        : '尚未录入题目模板，无法启动批阅',
      status: hasQuestions ? 'completed' : hasTemplate ? 'active' : 'pending',
      statusText: hasQuestions ? `${d.questionCount} 道` : '未配置',
      routeName: 'TeacherPaperTemplate',
      primaryAction: hasQuestions ? '查看 / 调整' : '录入题目',
      blockedReason: hasQuestions ? undefined : hasTemplate ? undefined : '需先完成答题卡模板',
    },
    {
      key: 'standardAnswer',
      title: '标准答案',
      description: hasAnswers
        ? `已录入 ${d.answerCount} 题标准答案`
        : '尚未录入标准答案，客观题无法自动评分',
      status: hasAnswers ? 'completed' : hasQuestions ? 'active' : 'pending',
      statusText: hasAnswers ? `${d.answerCount} 题` : '未配置',
      routeName: 'TeacherPaperTemplate',
      primaryAction: hasAnswers ? '查看 / 调整' : '录入标准答案',
      blockedReason: hasAnswers ? undefined : hasQuestions ? undefined : '需先录入题目模板',
    },
    {
      key: 'candidateRoster',
      title: '考生名册',
      description: hasCandidates
        ? `已绑定 ${d.candidateCount ?? 0} 名考生 / ${d.classIds.length} 个班级范围`
        : '尚未绑定考生名册，扫描后无法身份绑定',
      status: hasCandidates ? 'completed' : 'blocked',
      statusText: hasCandidates ? `${d.candidateCount ?? 0} 人` : '未配置',
      routeName: 'TeacherCandidateRoster',
      primaryAction: hasCandidates ? '查看 / 调整' : '导入考生名册',
      blockedReason: hasCandidates ? undefined : '考生名册缺失：阻断身份绑定',
    },
  ]
})

const stageRail = computed<WorkbenchStage[]>(() =>
  prepSteps.value.map((step) => ({
    key: step.key,
    title: step.title,
    status: step.status,
    statusText: step.statusText,
  })),
)

const statMetrics = computed(() => {
  const d = detail.value
  if (!d) return []
  const completed = prepSteps.value.filter((s) => s.status === 'completed').length
  const blocked = prepSteps.value.filter((s) => s.status === 'blocked').length
  return [
    {
      label: '准备进度',
      value: `${completed} / ${prepSteps.value.length}`,
      tone: (completed === prepSteps.value.length ? 'green' : 'blue') as 'green' | 'blue',
    },
    {
      label: '阻断项',
      value: blocked,
      unit: '项',
      tone: (blocked > 0 ? 'red' : 'gray') as 'red' | 'gray',
    },
    { label: '题目数', value: d.questionCount ?? 0, unit: '道', tone: 'blue' as const },
    { label: '标准答案', value: d.answerCount ?? 0, unit: '题', tone: 'gray' as const },
    { label: '考生数', value: d.candidateCount ?? 0, unit: '人', tone: 'blue' as const },
    { label: '班级范围', value: d.classIds?.length ?? 0, unit: '个', tone: 'gray' as const },
  ]
})

const blockedReasons = computed(() =>
  prepSteps.value.filter((s) => s.blockedReason).map((s) => s.blockedReason as string),
)

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

function goPrepStep(step: PrepStepCard) {
  void router.push({ name: step.routeName, query: { examId: selectedExamId.value } })
}

// B-8: composable 自动选第一个考试，本页只需在 selectedExamId 变化后加载详情
watch(selectedExamId, (next) => {
  if (next) {
    markStageStore.observeExam(next)
    void loadDetail(next)
  } else {
    detail.value = null
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    markStageStore.observeExam(selectedExamId.value)
    await loadDetail(selectedExamId.value)
    syncStageProgressToStore()
  }
})

// detail 或考试切换后同步阶段状态
watch([() => selectedExamId.value, () => detail.value], () => {
  if (selectedExamId.value && detail.value) {
    syncStageProgressToStore()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        title="考试准备工作台"
        subtitle="按阶段聚合考试模板、题目、标准答案与考生名册的准备状态"
      >
        <template #status>
          <a-select
            :value="selectedExamId"
            placeholder="选择考试"
            class="exam-prep__select"
            show-search
            option-filter-prop="label"
            allow-clear
            :options="examOptions"
            :loading="examLoading"
            @update:value="handleExamChange"
          />
          <UiTag v-if="currentExam" :tone="EXAM_STATUS_TONE[currentExam.status]" size="sm">
            {{ EXAM_STATUS_LABEL[currentExam.status] }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="examLoading" @click="loadExams">
            <template #icon>
              <ReloadOutlined />
            </template>
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="goExamList"> 考试列表 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="!selectedExamId">
      <UiEmpty description="请选择一场考试以查看准备进度" class="exam-prep__empty" />
    </template>

    <!-- D-9 错误态：考试详情加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-else-if="detailLoadError"
      :error="detailLoadError"
      title="考试详情加载失败"
      :helper="`考试 ID：${selectedExamId}`"
      @retry="() => loadDetail(selectedExamId)"
    />

    <template v-else>
      <a-spin :spinning="detailLoading">
        <StageRail :stages="stageRail" compact class="exam-prep__stages" />
        <UiStatPanel
          :items="statMetrics"
          :columns="3"
          variant="grid"
          compact
          class="exam-prep__signals"
        />

        <div v-if="blockedReasons.length > 0" class="exam-prep__blocked">
          <a-alert
            v-for="reason in blockedReasons"
            :key="reason"
            type="error"
            show-icon
            :message="reason"
            class="exam-prep__alert"
          />
        </div>

        <section class="exam-prep__cards">
          <UiCard
            v-for="step in prepSteps"
            :key="step.key"
            class="exam-prep__card"
            :class="`exam-prep__card--${step.status}`"
          >
            <template #title>
              <component :is="resolveIcon(step.key)" />
              <span>{{ step.title }}</span>
              <UiBadge :tone="resolveTone(step.status)">
                {{ step.statusText }}
              </UiBadge>
            </template>
            <p class="exam-prep__desc">
              {{ step.description }}
            </p>
            <a-space>
              <UiButton
                :variant="step.status === 'completed' ? 'outline' : 'primary'"
                size="sm"
                @click="goPrepStep(step)"
              >
                {{ step.primaryAction }}
              </UiButton>
              <UiTag v-if="step.blockedReason" tone="red" size="sm">
                {{ step.blockedReason }}
              </UiTag>
            </a-space>
          </UiCard>
        </section>
      </a-spin>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.exam-prep {
  &__select {
    width: 320px;
  }

  &__empty {
    margin-top: 32px;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__blocked {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  &__alert {
    margin: 0;
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  &__card {
    transition: border-color 0.2s ease;

    &--blocked {
      border-color: var(--ant-color-error-border, #fda4af);
    }

    &--completed {
      border-color: var(--dp-green-200, #bbf7d0);
    }
  }

  &__desc {
    margin: 8px 0 12px;
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
    line-height: 1.6;
  }
}
</style>
