<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ExamQuestionTemplateVO } from '@/apis/mark/exam'
import { getExamTemplate, isPaperTemplateNotConfiguredError } from '@/apis/mark/exam'
import type {
  AllocationUnitCode,
  AnonymityModeCode,
  AnonymousTokenPolicyCode,
  ExamAllocationPlanRequest,
  ExamAllocationPlanVO,
  MarkingAllocationModeCode,
} from '@/apis/mark/marking-organization'
import {
  ALLOCATION_UNIT_LABEL,
  ALLOCATION_UNIT_OPTIONS,
  ANONYMITY_MODE_OPTIONS,
  ANONYMOUS_TOKEN_POLICY_OPTIONS,
  MARKING_ALLOCATION_MODE_LABEL,
  planAllocation,
} from '@/apis/mark/marking-organization'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import DeploymentUnitOutlined from '@ant-design/icons-vue/DeploymentUnitOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SettingOutlined from '@ant-design/icons-vue/SettingOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'
import { UiAlertStrip, UiBadge, UiButton, UiCard, UiEmpty } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewAssignment' })

interface AllocationForm {
  leaderUserId: string | null
  anonymityMode: AnonymityModeCode
  allocationUnit: AllocationUnitCode
  allocationMode: MarkingAllocationModeCode
  questionTemplateIds: string[]
  reviewerUserIds: string[]
  batchSize: number
  loadLimit: number
  anonymousTokenPolicy: AnonymousTokenPolicyCode
  randomQuestionSampleSize: number | null
  dualReviewEnabled: boolean
  arbitrationScoreThreshold: number | null
  arbitrationRatioThreshold: number | null
  arbitratorUserId: string | null
  remark: string
}

type SwitchCheckedValue = boolean | string | number
type NumberInputValue = string | number

const router = useRouter()
const userStore = useUserStore()
const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  init: initExamSelector,
  onExamChange,
} = useMarkExamSelector({ maxLoad: 200 })

const templateLoading = ref(false)
const submitting = ref(false)
const questionLoadError = ref<string | null>(null)
const questions = ref<ExamQuestionTemplateVO[]>([])
const teacherOptions = ref<TeacherUserInfoDto[]>([])
const teacherLoading = ref(false)
const result = ref<ExamAllocationPlanVO | null>(null)

const form = reactive<AllocationForm>({
  leaderUserId: userStore.userInfo.userId || null,
  anonymityMode: 'NAMED',
  allocationUnit: 'WHOLE_PAPER',
  allocationMode: 'BY_PAPER_RANDOM',
  questionTemplateIds: [],
  reviewerUserIds: [],
  batchSize: 20,
  loadLimit: 80,
  anonymousTokenPolicy: 'NONE',
  randomQuestionSampleSize: null,
  dualReviewEnabled: false,
  arbitrationScoreThreshold: null,
  arbitrationRatioThreshold: null,
  arbitratorUserId: null,
  remark: '',
})

const allocationUnitOptions = ALLOCATION_UNIT_OPTIONS
const anonymityModeOptions = ANONYMITY_MODE_OPTIONS
const anonymousTokenPolicyOptions = ANONYMOUS_TOKEN_POLICY_OPTIONS

const allocationModeOptions = computed(() => {
  const allowed: MarkingAllocationModeCode[] =
    form.allocationUnit === 'WHOLE_PAPER'
      ? ['BY_PAPER_RANDOM']
      : ['BY_QUESTION', 'ROUND_ROBIN', 'RANDOM']
  return allowed.map((value) => ({
    value,
    label: allocationModeLabel(value),
  }))
})

const questionOptions = computed(() =>
  questions.value.map((item) => ({
    value: item.questionTemplateId,
    label: formatQuestionLabel(item),
  })),
)

const selectedQuestions = computed(() =>
  questions.value.filter((item) => form.questionTemplateIds.includes(item.questionTemplateId)),
)

const canSubmit = computed(
  () =>
    Boolean(selectedExamId.value) &&
    Boolean(form.leaderUserId) &&
    form.reviewerUserIds.length > 0 &&
    dualReviewContractValid.value &&
    questionScopeValid.value &&
    form.batchSize > 0 &&
    form.loadLimit > 0 &&
    !templateLoading.value &&
    !questionLoadError.value,
)

const questionScopeValid = computed(() => {
  if (form.allocationUnit === 'WHOLE_PAPER') {
    return true
  }
  if (form.allocationUnit === 'SELECTED_QUESTIONS') {
    return form.questionTemplateIds.length > 0
  }
  return (
    form.questionTemplateIds.length > 0 &&
    form.randomQuestionSampleSize !== null &&
    form.randomQuestionSampleSize > 0 &&
    form.randomQuestionSampleSize <= form.questionTemplateIds.length
  )
})

const dualReviewContractValid = computed(() => {
  if (!form.dualReviewEnabled) {
    return (
      form.arbitrationScoreThreshold === null &&
      form.arbitrationRatioThreshold === null &&
      form.arbitratorUserId === null
    )
  }
  return (
    form.allocationUnit === 'WHOLE_PAPER' &&
    form.allocationMode === 'BY_PAPER_RANDOM' &&
    form.reviewerUserIds.length >= 2 &&
    Boolean(form.arbitratorUserId) &&
    !form.reviewerUserIds.includes(String(form.arbitratorUserId)) &&
    (form.arbitrationScoreThreshold !== null || form.arbitrationRatioThreshold !== null)
  )
})

const allocationPreview = computed(() => {
  if (!selectedExamId.value || !form.leaderUserId) {
    return null
  }
  const leader = teacherOptions.value.find((item) => item.id === form.leaderUserId)
  const reviewerNames = form.reviewerUserIds.map((reviewerUserId) => {
    const reviewer = teacherOptions.value.find((item) => item.id === reviewerUserId)
    return reviewer ? teacherDisplayName(reviewer) : '已选择教师'
  })
  return {
    examName: selectedExamLabel.value,
    leaderName: leader ? teacherDisplayName(leader) : '已选择负责人',
    allocationUnitName: allocationUnitLabel(form.allocationUnit),
    allocationModeName: allocationModeLabel(form.allocationMode),
    reviewerNames,
    arbitratorName: form.arbitratorUserId
      ? teacherDisplayNameById(form.arbitratorUserId)
      : '未选择仲裁教师',
    dualReviewRule: form.dualReviewEnabled ? formatDualReviewRule() : '未开启双评',
    questionScope:
      form.allocationUnit === 'WHOLE_PAPER'
        ? '整卷批阅'
        : selectedQuestions.value.map((item) => formatQuestionLabel(item)).join('、'),
  }
})

watch(selectedExamId, async () => {
  result.value = null
  form.questionTemplateIds = []
  await loadExamQuestions()
})

watch(
  () => form.allocationUnit,
  (unit) => {
    result.value = null
    if (unit === 'WHOLE_PAPER') {
      form.allocationMode = 'BY_PAPER_RANDOM'
      form.questionTemplateIds = []
      form.randomQuestionSampleSize = null
      return
    }
    form.dualReviewEnabled = false
    form.arbitrationScoreThreshold = null
    form.arbitrationRatioThreshold = null
    form.arbitratorUserId = null
    if (form.allocationMode === 'BY_PAPER_RANDOM') {
      form.allocationMode = 'BY_QUESTION'
    }
  },
)

watch(
  () => form.anonymityMode,
  (mode) => {
    if (mode === 'NAMED' && form.anonymousTokenPolicy !== 'NONE') {
      form.anonymousTokenPolicy = 'NONE'
    }
    if (mode === 'ANONYMOUS' && form.anonymousTokenPolicy === 'NONE') {
      form.anonymousTokenPolicy = 'PER_EXAM'
    }
  },
)

async function loadExamQuestions(): Promise<void> {
  questions.value = []
  questionLoadError.value = null
  if (!selectedExamId.value) {
    return
  }
  templateLoading.value = true
  try {
    const template = await getExamTemplate(selectedExamId.value)
    questions.value = template.questions
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    if (isPaperTemplateNotConfiguredError(error)) {
      questionLoadError.value = '当前考试尚未配置有效试卷模板，不能生成真实阅卷任务。'
      return
    }
    questionLoadError.value = '试卷题目加载失败，不能生成真实阅卷任务。'
    showUserError(error, '试卷题目加载失败')
  } finally {
    templateLoading.value = false
  }
}

async function loadTeachers(keyword?: string): Promise<void> {
  teacherLoading.value = true
  try {
    const page = await teacherCatalogApi.userList({
      pageNum: 1,
      pageSize: 80,
      searchText: keyword || undefined,
      roleKey: 'SCH_TECH',
    })
    teacherOptions.value = page.list
  } catch (error) {
    showUserError(error, '教师列表加载失败')
  } finally {
    teacherLoading.value = false
  }
}

let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null
function handleTeacherSearch(value: string): void {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value)
  }, 300)
}

function handleReviewerChange(value: SelectValue): void {
  form.reviewerUserIds = Array.isArray(value) ? value.map(String) : []
  if (form.arbitratorUserId && form.reviewerUserIds.includes(form.arbitratorUserId)) {
    form.arbitratorUserId = null
  }
}

function handleRandomQuestionSampleSizeChange(value: NumberInputValue): void {
  form.randomQuestionSampleSize = Number(value)
}

function handleArbitratorChange(value: SelectValue): void {
  if (Array.isArray(value)) {
    message.error('仲裁教师选择器配置异常，请刷新页面后重试')
    return
  }
  form.arbitratorUserId = value === undefined ? null : String(value)
}

function handleArbitrationScoreThresholdChange(value: NumberInputValue): void {
  form.arbitrationScoreThreshold = Number(value)
}

function handleArbitrationRatioThresholdChange(value: NumberInputValue): void {
  form.arbitrationRatioThreshold = Number(value)
}

function handleDualReviewChange(checked: SwitchCheckedValue): void {
  if (typeof checked !== 'boolean') {
    message.error('整卷双评开关状态异常，请刷新页面后重试')
    return
  }
  form.dualReviewEnabled = checked
  if (!checked) {
    form.arbitrationScoreThreshold = null
    form.arbitrationRatioThreshold = null
    form.arbitratorUserId = null
    return
  }
  form.allocationUnit = 'WHOLE_PAPER'
  form.allocationMode = 'BY_PAPER_RANDOM'
  form.questionTemplateIds = []
  form.randomQuestionSampleSize = null
}

function selectAllQuestions(): void {
  form.questionTemplateIds = questions.value.map((item) => item.questionTemplateId)
}

function clearSelectedQuestions(): void {
  form.questionTemplateIds = []
  form.randomQuestionSampleSize = null
}

async function submitAllocation(): Promise<void> {
  if (!selectedExamId.value || !form.leaderUserId) {
    message.error('请选择考试和阅卷负责人')
    return
  }
  if (!canSubmit.value) {
    message.error('请补齐分配合同字段后再提交')
    return
  }
  submitting.value = true
  try {
    const response = await planAllocation(buildRequest(selectedExamId.value, form.leaderUserId))
    result.value = response
    message.success(`已生成 ${response.taskCount} 个阅卷任务`)
  } catch (error) {
    showUserError(error, '阅卷分配失败')
  } finally {
    submitting.value = false
  }
}

function buildRequest(examId: string, leaderUserId: string): ExamAllocationPlanRequest {
  const request: ExamAllocationPlanRequest = {
    examId,
    leaderUserId,
    anonymityMode: form.anonymityMode,
    allocationUnit: form.allocationUnit,
    allocationMode: form.allocationMode,
    reviewerUserIds: [...form.reviewerUserIds],
    batchSize: form.batchSize,
    loadLimit: form.loadLimit,
    anonymousTokenPolicy: form.anonymousTokenPolicy,
    dualReviewEnabled: form.dualReviewEnabled,
  }
  if (form.allocationUnit !== 'WHOLE_PAPER') {
    request.questionTemplateIds = [...form.questionTemplateIds]
  }
  if (form.allocationUnit === 'RANDOM_QUESTIONS' && form.randomQuestionSampleSize !== null) {
    request.randomQuestionSampleSize = form.randomQuestionSampleSize
  }
  if (form.dualReviewEnabled) {
    if (form.arbitrationScoreThreshold !== null) {
      request.arbitrationScoreThreshold = form.arbitrationScoreThreshold
    }
    if (form.arbitrationRatioThreshold !== null) {
      request.arbitrationRatioThreshold = form.arbitrationRatioThreshold
    }
    if (form.arbitratorUserId) {
      request.arbitratorUserId = form.arbitratorUserId
    }
  }
  if (form.remark.trim()) {
    request.remark = form.remark.trim()
  }
  return request
}

function goOrganizationDetail(): void {
  if (!result.value) {
    return
  }
  void router.push({
    name: 'TeacherMarkingOrganizationDetail',
    params: { organizationId: result.value.organizationId },
  })
}

function goTaskPool(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({ name: 'TeacherMarkingTaskPool', query: { examId: selectedExamId.value } })
}

function allocationUnitLabel(value: AllocationUnitCode): string {
  return strictEnumLabel(ALLOCATION_UNIT_LABEL, value, '批阅分配单元')
}

function allocationModeLabel(value: MarkingAllocationModeCode): string {
  return strictEnumLabel(MARKING_ALLOCATION_MODE_LABEL, value, '批阅分配模式')
}

function formatQuestionLabel(question: ExamQuestionTemplateVO): string {
  return `题 ${question.questionNo} · ${question.fullScore} 分`
}

function teacherDisplayName(teacher: TeacherUserInfoDto): string {
  return [
    teacher.nickName,
    teacher.teacherNumber ? `(${teacher.teacherNumber})` : '',
    teacher.department,
  ]
    .filter(Boolean)
    .join(' ')
}

function teacherDisplayNameById(userId: string): string {
  const teacher = teacherOptions.value.find((item) => item.id === userId)
  return teacher ? teacherDisplayName(teacher) : '已选择教师'
}

function formatDualReviewRule(): string {
  const rules: string[] = []
  if (form.arbitrationScoreThreshold !== null) {
    rules.push(`总分差超过 ${form.arbitrationScoreThreshold} 分`)
  }
  if (form.arbitrationRatioThreshold !== null) {
    rules.push(`总分差比例超过 ${form.arbitrationRatioThreshold}`)
  }
  return rules.length > 0 ? rules.join('，') : '未配置仲裁阈值'
}

onMounted(async () => {
  await Promise.all([initExamSelector(), loadTeachers()])
  if (selectedExamId.value) {
    await loadExamQuestions()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="review-assignment__context">
        <div class="review-assignment__context-main">
          <h2 class="review-assignment__title">分派批阅</h2>
          <span class="review-assignment__subtitle"
            >考试创建人配置阅卷负责人、评阅教师和任务生成策略</span
          >
        </div>
        <div class="review-assignment__context-actions">
          <a-select
            :value="selectedExamId"
            class="review-assignment__exam-select"
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
            size="sm"
            :disabled="!selectedExamId"
            :loading="templateLoading"
            @click="loadExamQuestions"
          >
            <template #icon><ReloadOutlined /></template>
            刷新题目
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试后配置阅卷分配"
      class="review-assignment__empty"
    />

    <template v-else>
      <UiAlertStrip
        v-if="selectedExamLabel"
        tone="info"
        title="分配合同"
        :description="`当前考试：${selectedExamLabel}。提交后后端将创建或复用阅卷组织、生成题组、保存策略并启动正评任务。`"
        class="review-assignment__alert"
      />

      <UiAlertStrip
        v-if="questionLoadError"
        tone="error"
        title="试卷模板不可用"
        :description="questionLoadError"
        class="review-assignment__alert"
      />

      <UiAlertStrip
        v-if="form.dualReviewEnabled"
        tone="info"
        title="整卷双评仲裁"
        description="开启后每份答卷生成两轮整卷任务；两名评阅教师分差超过阈值时生成仲裁教师第三轮任务，否则按逐题平均分写入最终成绩。"
        class="review-assignment__alert"
      />

      <section class="review-assignment__grid">
        <UiCard class="review-assignment__panel">
          <template #title>
            <DeploymentUnitOutlined />
            <span>考试与范围</span>
          </template>

          <a-form layout="vertical" :model="form">
            <a-form-item label="阅卷负责人" required>
              <TeacherSelector
                v-model:value="form.leaderUserId"
                placeholder="选择阅卷负责人"
                :allow-clear="false"
              />
            </a-form-item>

            <a-form-item label="批阅单元" required>
              <a-radio-group v-model:value="form.allocationUnit" button-style="solid">
                <a-radio-button
                  v-for="item in allocationUnitOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item v-if="form.allocationUnit !== 'WHOLE_PAPER'" label="题目范围" required>
              <div class="review-assignment__question-toolbar">
                <UiButton size="sm" variant="outline" @click="selectAllQuestions"
                  >全选题目</UiButton
                >
                <UiButton size="sm" variant="ghost" @click="clearSelectedQuestions">清空</UiButton>
                <UiBadge tone="blue">已选 {{ selectedQuestions.length }} 题</UiBadge>
              </div>
              <a-select
                v-model:value="form.questionTemplateIds"
                mode="multiple"
                placeholder="选择进入分配的题目"
                :options="questionOptions"
                :loading="templateLoading"
                show-search
                option-filter-prop="label"
              />
            </a-form-item>

            <a-form-item
              v-if="form.allocationUnit === 'RANDOM_QUESTIONS'"
              label="随机抽样题数"
              required
            >
              <a-input-number
                :value="form.randomQuestionSampleSize ?? undefined"
                :min="1"
                :max="Math.max(form.questionTemplateIds.length, 1)"
                class="review-assignment__number"
                @change="handleRandomQuestionSampleSizeChange"
              />
            </a-form-item>

            <div class="review-assignment__question-list">
              <div
                v-for="question in questions"
                :key="question.questionTemplateId"
                class="review-assignment__question-item"
              >
                <strong>{{ formatQuestionLabel(question) }}</strong>
                <span v-if="question.questionStem">{{ question.questionStem }}</span>
              </div>
            </div>
          </a-form>
        </UiCard>

        <UiCard class="review-assignment__panel">
          <template #title>
            <TeamOutlined />
            <span>教师与策略</span>
          </template>

          <a-form layout="vertical" :model="form">
            <a-form-item label="评阅教师" required>
              <a-select
                :value="form.reviewerUserIds"
                mode="multiple"
                placeholder="搜索并选择评阅教师"
                :loading="teacherLoading"
                show-search
                :filter-option="false"
                @search="handleTeacherSearch"
                @change="handleReviewerChange"
              >
                <a-select-option
                  v-for="teacher in teacherOptions"
                  :key="teacher.id"
                  :value="teacher.id"
                >
                  {{ teacherDisplayName(teacher) }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="匿名模式" required>
              <a-radio-group v-model:value="form.anonymityMode" button-style="solid">
                <a-radio-button
                  v-for="item in anonymityModeOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>

            <a-form-item label="匿名令牌策略" required>
              <a-select
                v-model:value="form.anonymousTokenPolicy"
                :options="anonymousTokenPolicyOptions"
              />
            </a-form-item>

            <a-form-item label="分配模式" required>
              <a-select v-model:value="form.allocationMode" :options="allocationModeOptions" />
            </a-form-item>

            <div class="review-assignment__number-row">
              <a-form-item label="每批任务数" required>
                <a-input-number
                  v-model:value="form.batchSize"
                  :min="1"
                  class="review-assignment__number"
                />
              </a-form-item>
              <a-form-item label="教师待处理上限" required>
                <a-input-number
                  v-model:value="form.loadLimit"
                  :min="1"
                  class="review-assignment__number"
                />
              </a-form-item>
            </div>

            <a-form-item label="整卷双评">
              <a-switch :checked="form.dualReviewEnabled" @change="handleDualReviewChange" />
              <span class="review-assignment__hint">
                仅支持整卷随机派发；前两轮评阅教师必须不同，仲裁教师不能参与前两轮。
              </span>
            </a-form-item>

            <template v-if="form.dualReviewEnabled">
              <a-form-item label="仲裁教师" required>
                <a-select
                  :value="form.arbitratorUserId ?? undefined"
                  placeholder="选择仲裁教师"
                  :loading="teacherLoading"
                  show-search
                  :filter-option="false"
                  allow-clear
                  @search="handleTeacherSearch"
                  @change="handleArbitratorChange"
                >
                  <a-select-option
                    v-for="teacher in teacherOptions"
                    :key="teacher.id"
                    :value="teacher.id"
                    :disabled="form.reviewerUserIds.includes(teacher.id)"
                  >
                    {{ teacherDisplayName(teacher) }}
                  </a-select-option>
                </a-select>
              </a-form-item>

              <div class="review-assignment__number-row">
                <a-form-item label="仲裁分差阈值">
                  <a-input-number
                    :value="form.arbitrationScoreThreshold ?? undefined"
                    :min="0"
                    :precision="2"
                    class="review-assignment__number"
                    placeholder="总分差"
                    @change="handleArbitrationScoreThresholdChange"
                  />
                </a-form-item>
                <a-form-item label="仲裁比例阈值">
                  <a-input-number
                    :value="form.arbitrationRatioThreshold ?? undefined"
                    :min="0"
                    :precision="4"
                    class="review-assignment__number"
                    placeholder="如 0.1"
                    @change="handleArbitrationRatioThresholdChange"
                  />
                </a-form-item>
              </div>
              <span class="review-assignment__hint">
                两个阈值至少填写一个；命中任一阈值即进入仲裁。
              </span>
            </template>

            <a-form-item label="备注">
              <a-textarea
                v-model:value="form.remark"
                :rows="3"
                placeholder="填写本次分配说明"
                :maxlength="200"
                show-count
              />
            </a-form-item>
          </a-form>
        </UiCard>

        <UiCard class="review-assignment__panel review-assignment__panel--summary">
          <template #title>
            <SettingOutlined />
            <span>分配摘要</span>
          </template>

          <dl v-if="allocationPreview" class="review-assignment__summary">
            <div>
              <dt>当前考试</dt>
              <dd>{{ allocationPreview.examName }}</dd>
            </div>
            <div>
              <dt>阅卷负责人</dt>
              <dd>{{ allocationPreview.leaderName }}</dd>
            </div>
            <div>
              <dt>批阅单元</dt>
              <dd>{{ allocationPreview.allocationUnitName }}</dd>
            </div>
            <div>
              <dt>分配方式</dt>
              <dd>{{ allocationPreview.allocationModeName }}</dd>
            </div>
            <div>
              <dt>评阅教师</dt>
              <dd v-if="allocationPreview.reviewerNames.length > 0">
                {{ allocationPreview.reviewerNames.join('、') }}
              </dd>
              <dd v-else>表单尚未选择评阅教师</dd>
            </div>
            <div>
              <dt>双评规则</dt>
              <dd>{{ allocationPreview.dualReviewRule }}</dd>
            </div>
            <div v-if="form.dualReviewEnabled">
              <dt>仲裁教师</dt>
              <dd>{{ allocationPreview.arbitratorName }}</dd>
            </div>
            <div>
              <dt>题目范围</dt>
              <dd>{{ allocationPreview.questionScope || '表单尚未选择题目范围' }}</dd>
            </div>
          </dl>

          <div class="review-assignment__actions">
            <UiButton
              size="sm"
              :disabled="!canSubmit"
              :loading="submitting"
              @click="submitAllocation"
            >
              提交并启动正评
            </UiButton>
            <UiButton size="sm" variant="outline" :disabled="!selectedExamId" @click="goTaskPool">
              查看任务池
            </UiButton>
          </div>

          <div v-if="result" class="review-assignment__result">
            <CheckCircleOutlined />
            <div>
              <strong>已生成 {{ result.taskCount }} 个任务</strong>
              <p>
                组织 {{ result.organizationId }}，题组 {{ result.groupId }}，正评会话
                {{ result.sessionId }}
              </p>
              <UiButton size="sm" variant="outline" @click="goOrganizationDetail"
                >查看组织详情</UiButton
              >
            </div>
          </div>
        </UiCard>
      </section>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped>
.review-assignment__context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.review-assignment__context-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-assignment__title {
  margin: 0;
  color: var(--dp-text-primary, #0f172a);
  font-size: 20px;
  font-weight: 800;
}

.review-assignment__subtitle,
.review-assignment__hint {
  color: var(--dp-text-secondary, #475569);
  font-size: 13px;
}

.review-assignment__context-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-assignment__exam-select {
  width: 360px;
}

.review-assignment__empty,
.review-assignment__alert {
  margin-bottom: 12px;
}

.review-assignment__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 12px;
  align-items: start;
}

.review-assignment__panel {
  min-width: 0;
}

.review-assignment__question-toolbar,
.review-assignment__actions,
.review-assignment__number-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.review-assignment__number-row :deep(.ant-form-item) {
  flex: 1;
}

.review-assignment__number {
  width: 100%;
}

.review-assignment__question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.review-assignment__question-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 8px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.review-assignment__question-item span {
  overflow: hidden;
  color: var(--dp-text-secondary, #475569);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review-assignment__summary {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}

.review-assignment__summary div {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
}

.review-assignment__summary dt {
  color: var(--dp-text-secondary, #475569);
  font-size: 12px;
}

.review-assignment__summary dd {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--dp-text-primary, #0f172a);
  font-size: 12px;
}

.review-assignment__result {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--ant-color-success-border, #b7eb8f);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--ant-color-success-bg, #f6ffed);
  color: var(--ant-color-success, #22c55e);
}

.review-assignment__result p {
  margin: 4px 0 10px;
  color: var(--dp-text-secondary, #475569);
}

@media (max-width: 1200px) {
  .review-assignment__grid {
    grid-template-columns: 1fr 1fr;
  }

  .review-assignment__panel--summary {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .review-assignment__context,
  .review-assignment__context-actions,
  .review-assignment__number-row {
    align-items: stretch;
    flex-direction: column;
  }

  .review-assignment__exam-select {
    width: 100%;
  }

  .review-assignment__grid {
    grid-template-columns: 1fr;
  }
}
</style>
