<template>
  <component :is="embedded ? AiAnalysisSection : WorkbenchSurfaceCard" v-bind="shellProps">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 班级薄弱题型分析</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <a-select
          :value="props.classId"
          placeholder="选择班级"
          class="stats-card__select stats-card__select--class-wide"
          show-search
          option-filter-prop="label"
          allow-clear
          :options="props.classOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          @change="handleClassSelectChange"
        />
        <UiButton variant="outline" size="sm" :loading="loading" :disabled="!props.classId" @click="reload">
          刷新
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="generating" :disabled="!props.classId" @click="handleGenerate">
          重新生成
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <a-select
          :value="props.classId"
          placeholder="选择班级"
          style="width: 220px"
          show-search
          option-filter-prop="label"
          allow-clear
          :options="props.classOptions"
          :loading="props.rosterLoading"
          :disabled="!props.examId"
          @change="handleClassSelectChange"
        />
        <UiButton variant="outline" size="sm" :loading="generating" :disabled="!props.classId" @click="handleGenerate">
          重新生成
        </UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="loading && !generating" variant="card" compact />
    <AiGenerationProgressPanel
      v-else-if="generating"
      title="AI 班级薄弱题型分析生成中"
      waiting-text="正在等待后端返回该班级的真实薄弱题型分析。"
    />

    <UiEmpty v-else-if="!record" description="请选择班级后查看薄弱题型" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <p v-if="classContextLabel" class="ai-analysis-summary">{{ classContextLabel }}</p>
      <p v-if="record.overallSummary" class="ai-analysis-summary">{{ record.overallSummary }}</p>

      <AiWeaknessRow
        v-for="(item, index) in weaknessItems"
        :key="`${item.questionType ?? 'weak'}-${index}`"
        :title="item.questionType ? questionTypeLabel(item.questionType) : '薄弱题型'"
        :weakness-level="deriveWeaknessLevel(item.errorRate, item.avgScoreRate)"
        :metric-text="item.avgScoreRate != null ? `得分率 ${formatRate(item.avgScoreRate)}` : undefined"
      />

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 班级薄弱题型分析未完成，请稍后重新生成"
        :extra-items="metaExtraItems"
      />
    </div>
  </component>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  ClassWeaknessItemVO,
  ExamTeachingAnalysisRecordVO,
} from '@/apis/mark/teaching-analysis'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  generateClassWeaknessAnalysis,
  getLatestClassWeaknessAnalysis,
} from '@/apis/mark/teaching-analysis'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AiWeaknessRow from '@/components/mark/analysis/AiWeaknessRow.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { deriveWeaknessLevel } from '@/utils/ai-analysis-display'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

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

const record = ref<ExamTeachingAnalysisRecordVO | null>(null)
const loading = ref(false)
const generating = ref(false)

const shellProps = computed(() =>
  props.embedded
    ? { title: '班级薄弱知识点', context: classContextLabel.value || props.examLabel }
    : { class: 'stats-card' },
)

const weaknessItems = computed<ClassWeaknessItemVO[]>(() => record.value?.weaknessItems ?? [])

const classContextLabel = computed(() => {
  if (!props.classId) return ''
  const option = props.classOptions.find(item => item.value === props.classId)
  return option?.className ? `班级：${option.className}` : ''
})

const metaExtraItems = computed(() => {
  if (!record.value?.scopeId) return []
  return [{ label: '班级编号', value: record.value.scopeId }]
})

function acceptClassWeaknessRecord(
  value: ExamTeachingAnalysisRecordVO | null,
  expectedClassId: string,
): ExamTeachingAnalysisRecordVO | null {
  void expectedClassId
  if (!value) return null
  return value
}

async function reload(): Promise<void> {
  const classId = props.classId
  if (!props.examId || !classId) return
  loading.value = true
  try {
    const latest = await getLatestClassWeaknessAnalysis({ examId: props.examId, classId })
    record.value = acceptClassWeaknessRecord(latest, classId)
  } catch (e) {
    record.value = null
    showUserError(e, '班级薄弱题型分析加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  const classId = props.classId
  if (!classId) {
    message.warning('请先选择班级')
    return
  }
  generating.value = true
  try {
    const generated = await generateClassWeaknessAnalysis({ examId: props.examId, classId })
    record.value = acceptClassWeaknessRecord(generated, classId)
    message.success('已生成最新分析')
  } catch (e) {
    record.value = null
    showUserError(e, '班级薄弱题型分析生成失败')
  } finally {
    generating.value = false
  }
}

function handleClassSelectChange(value?: SelectValue): void {
  emit('class-change', typeof value === 'string' ? value : undefined)
  record.value = null
}

function questionTypeLabel(value: ClassWeaknessItemVO['questionType']): string {
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
