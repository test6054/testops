<template>
  <AiAnalysisCardShell
    :embedded="embedded"
    title="班级薄弱知识点"
    :context="classContextLabel || undefined"
    card-class="stats-card"
  >
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 班级薄弱题型分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <UiSelect
          size="sm"
          :model-value="props.classId"
          placeholder="选择班级"
          class="stats-card__select stats-card__select--class-wide"
          allow-search
          option-filter-prop="label"
          allow-clear
          :options="props.classOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          @change="handleClassSelectChange"
        />
        <UiButton
          variant="outline"
          size="sm"
          :loading="loading"
          :disabled="!props.classId"
          @click="reload"
        >
          刷新
        </UiButton>
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :loading="generating === true"
          :disabled="!props.classId"
          @click="handleGenerate"
        >
          重新生成
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <UiSelect
          size="sm"
          :model-value="props.classId"
          placeholder="选择班级"
          style="width: 220px"
          allow-search
          option-filter-prop="label"
          allow-clear
          :options="props.classOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          @change="handleClassSelectChange"
        />
        <UiButton
          v-if="canManageReviewerWrites === true"
          variant="outline"
          size="sm"
          :loading="generating === true"
          :disabled="!props.classId"
          @click="handleGenerate"
        >
          重新生成
        </UiButton>
      </div>
    </template>

    <AiAnalysisCardBody
      :loading="loading"
      :generating="generating"
      :has-content="true"
      :empty-description="emptyDescription"
      progress-title="AI 班级薄弱题型分析生成中"
      progress-waiting-text="正在等待后端返回该班级的真实薄弱题型分析。"
    >
      <div class="ai-analysis-section__body ai-analysis-section__body--flush">
        <MarkBarSection
          title="薄弱题型得分率"
          :hint="weaknessChartHint"
          :item-count="weaknessBarItems.length"
          :option="weaknessChartOption"
          height="240px"
          orientation="horizontal"
          :empty-description="
            props.classId
              ? '生成班级薄弱题型分析后展示各题型班级得分率'
              : '选择班级并生成分析后展示薄弱题型得分率'
          "
        />

        <template v-if="record != null">
          <p v-if="classContextLabel" class="ai-analysis-summary">{{ classContextLabel }}</p>
          <p v-if="record.overallSummary" class="ai-analysis-summary">
            {{ record.overallSummary }}
          </p>

          <AiWeaknessRow
            v-for="(item, index) in record.weaknessItems ?? []"
            :key="`${item.questionType ?? 'weak'}-${index}`"
            :title="item.questionType ? questionTypeLabel(item.questionType) : '薄弱题型'"
            :weakness-level="deriveWeaknessLevel(item.errorRate, item.avgScoreRate)"
            :metric-text="
              item.avgScoreRate != null ? `得分率 ${formatRate(item.avgScoreRate)}` : undefined
            "
          />

          <AiAnalysisMetaCollapse
            :record="record"
            failure-fallback="AI 班级薄弱题型分析未完成，可重新生成"
            :extra-items="record.scopeId ? [{ label: '班级编号', value: record.scopeId }] : []"
          />
        </template>
      </div>
    </AiAnalysisCardBody>
  </AiAnalysisCardShell>
</template>

<script lang="ts" setup>
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  ClassWeaknessItemResponse,
  TeachingAnalysisRecordResponse,
} from '@/apis/mark/teaching-analysis'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import { computed, inject, ref, watch } from 'vue'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  generateClassWeaknessAnalysis,
  getLatestClassWeaknessAnalysis,
} from '@/apis/mark/teaching-analysis'
import MarkBarSection from '@/components/chart/MarkBarSection.vue'
import AiAnalysisCardBody from '@/components/mark/analysis/AiAnalysisCardBody.vue'
import AiAnalysisCardShell from '@/components/mark/analysis/AiAnalysisCardShell.vue'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiWeaknessRow from '@/components/mark/analysis/AiWeaknessRow.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { useAiAnalysisGenerationFeedback } from '@/composables/useAiAnalysisGenerationFeedback'
import { AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY } from '@/composables/useAiAnalysisScope'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { deriveWeaknessLevel } from '@/utils/ai-analysis-display'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { buildBarChartInsight, mergeChartHint } from '@/utils/mark-chart-insights'
import { buildCategoryBarChartOption } from '@/utils/mark-echarts-options'
import { classWeaknessToBarItems } from '@/utils/mark-statistics-chart'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ClassWeaknessCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    classOptions: MarkClassOption[]
    rosterLoading: boolean
    embedded?: boolean
  }>(),
  { embedded: false },
)

const emit = defineEmits<{ (e: 'class-change', classId?: string): void }>()

const record = ref<TeachingAnalysisRecordResponse | null>(null)
const loading = ref(false)
const { generating, runGeneration } = useAiAnalysisGenerationFeedback()

/** MVR-285：默认拒绝假可写；依赖 AI 分析中心 overview 或页面 provide 的能力位 */
const injectedCanManageReviewerWrites = inject(
  AI_ANALYSIS_CAN_MANAGE_REVIEWER_WRITES_KEY,
  null,
)
const canManageReviewerWrites = computed(
  () => injectedCanManageReviewerWrites?.value === true,
)


const emptyDescription = computed(() =>
  props.classId ? '暂无薄弱题型分析，可点击重新生成' : '请选择班级后查看薄弱题型',
)

const classContextLabel = computed(() => {
  if (!props.classId) return ''
  const option = props.classOptions.find((item) => item.value === props.classId)
  return option?.className ? `班级：${option.className}` : ''
})

const weaknessBarItems = computed(() => classWeaknessToBarItems(record.value?.weaknessItems ?? []))

const weaknessChartHint = computed(() =>
  mergeChartHint('悬停查看各薄弱题型班级得分率', buildBarChartInsight(weaknessBarItems.value)),
)

const { chartOption: weaknessChartOption } = useChartOption(() =>
  buildCategoryBarChartOption(weaknessBarItems.value, {
    orientation: 'horizontal',
    maxValue: 100,
    xAxisName: '得分率 %',
    unit: '%',
    emptyText: '暂无薄弱题型得分率',
  }),
)

async function reload(): Promise<void> {
  const classId = props.classId
  if (!props.examId || !classId) return
  loading.value = true
  try {
    record.value = await getLatestClassWeaknessAnalysis({ examId: props.examId, classId })
  } catch (e) {
    record.value = null
    showUserError(e, '班级薄弱题型分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  if (canManageReviewerWrites.value !== true) {
    showUserError(null, '仅本场阅卷组织成员、主考或管理员可生成分析')
    return
  }
  const classId = props.classId
  if (!classId) {
    showFormValidationMessage('请先选择班级')
    return
  }
  await runGeneration(() => generateClassWeaknessAnalysis({ examId: props.examId, classId }), {
    successMessage: '已生成最新分析',
    onSuccess: (generated) => {
      record.value = generated
    },
    onFailure: () => {
      record.value = null
    },
  })
}

function handleClassSelectChange(value?: SelectValue): void {
  emit('class-change', typeof value === 'string' ? value : undefined)
  record.value = null
}

function questionTypeLabel(value: ClassWeaknessItemResponse['questionType']): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题目类型')
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    record.value = null
    if (props.classId) void reload()
  },
)
</script>

<style lang="scss" scoped>
.ai-analysis-section__body--flush {
  padding-top: 0;
}
</style>
