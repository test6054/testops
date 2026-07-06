<template>
  <component :is="embedded ? AiAnalysisSection : WorkbenchSurfaceCard" v-bind="shellProps">
    <template v-if="!embedded" #head>
      <h3 class="stats-card__title">AI 教学改进方案</h3>
    </template>
    <template v-if="!embedded" #toolbar>
      <div class="ai-analysis-card-toolbar">
        <UiButton variant="outline" size="sm" :loading="generating" @click="handleGenerate">
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :disabled="!canShareRecord" @click="copyShareText">
          复制分享
        </UiButton>
        <UiButton variant="outline" size="sm" :disabled="!canShareRecord" @click="exportRecordText">
          导出文本
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          <template #icon><ReloadOutlined /></template>刷新
        </UiButton>
      </div>
    </template>

    <template v-if="embedded" #actions>
      <div class="ai-analysis-card-toolbar">
        <UiButton variant="outline" size="sm" :loading="generating" @click="handleGenerate">
          重新生成
        </UiButton>
        <UiButton variant="outline" size="sm" :loading="loading" @click="reload">
          刷新
        </UiButton>
      </div>
    </template>

    <UiSkeletonState v-if="loading && !generating" variant="card" compact />
    <AiGenerationProgressPanel
      v-else-if="generating"
      title="AI 教学改进方案生成中"
      :waiting-text="
        props.classId
          ? '正在等待后端返回当前班级的真实教学改进方案。'
          : '正在等待后端返回本场考试的真实教学改进方案。'
      "
    />

    <UiEmpty v-else-if="!record" description="暂无数据" />
    <div v-else-if="record" class="ai-analysis-section__body ai-analysis-section__body--flush">
      <p v-if="record.overallSummary" class="ai-analysis-summary">
        {{ record.overallSummary }}
      </p>

      <AiRecommendationBlock
        v-for="(item, index) in improvementItems"
        :key="`${item.questionType ?? 'item'}-${index}`"
        :area-label="item.questionType ? questionTypeLabel(item.questionType) : '教学改进'"
        :issue="item.problemDescription"
        :suggestion="item.suggestion ?? '—'"
        :severity-label="item.severity ? severityLabel(item.severity) : undefined"
        :severity-tone="item.severity ? severityTone(item.severity) : undefined"
      />

      <AiAnalysisMetaCollapse
        :record="record"
        failure-fallback="AI 教学改进方案未完成，请稍后重新生成"
      />
    </div>
  </component>
</template>

<script lang="ts" setup>
import type {
  TeachingAnalysisRecordResponse,
  TeachingImprovementItemResponse,
  TeachingImprovementSeverityCode,
} from '@/apis/mark/teaching-analysis'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  generateTeachingImprovement,
  getLatestTeachingImprovement,
  TEACHING_IMPROVEMENT_SEVERITY_TONE,
  TeachingImprovementSeverityDescription,
} from '@/apis/mark/teaching-analysis'
import AiAnalysisMetaCollapse from '@/components/mark/analysis/AiAnalysisMetaCollapse.vue'
import AiAnalysisSection from '@/components/mark/analysis/AiAnalysisSection.vue'
import AiRecommendationBlock from '@/components/mark/analysis/AiRecommendationBlock.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import AiGenerationProgressPanel from './AiGenerationProgressPanel.vue'

defineOptions({ name: 'TeachingImprovementCard' })

const props = withDefaults(
  defineProps<{
    examId: string
    reloadToken: number
    classId?: string
    examLabel?: string
    embedded?: boolean
  }>(),
  { embedded: false },
)

const record = ref<TeachingAnalysisRecordResponse | null>(null)
const loading = ref(false)
const generating = ref(false)

const shellProps = computed(() =>
  props.embedded
    ? { title: 'AI 教学改进建议', context: props.examLabel }
    : { class: 'stats-card' },
)

const improvementItems = computed<TeachingImprovementItemResponse[]>(() => record.value?.improvementItems ?? [])
const canShareRecord = computed(() => record.value?.analysisStatus === 'SUCCESS')

function questionTypeLabel(value: TeachingImprovementItemResponse['questionType']): string {
  return strictEnumLabel(QuestionTypeDescription, value, '题目类型')
}

function severityLabel(value: TeachingImprovementSeverityCode): string {
  return strictEnumLabel(TeachingImprovementSeverityDescription, value, '严重程度')
}

function severityTone(value: TeachingImprovementSeverityCode) {
  return strictEnumTone(TEACHING_IMPROVEMENT_SEVERITY_TONE, value, '严重程度')
}

function acceptTeachingImprovementRecord(
  value: TeachingAnalysisRecordResponse | null,
): TeachingAnalysisRecordResponse | null {
  if (!value) return null
  return value
}

async function reload(): Promise<void> {
  if (!props.examId) return
  loading.value = true
  try {
    const latest = await getLatestTeachingImprovement({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    record.value = acceptTeachingImprovementRecord(latest)
  } catch (e) {
    record.value = null
    showUserError(e, '教学改进方案加载失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate(): Promise<void> {
  generating.value = true
  try {
    const generated = await generateTeachingImprovement({
      examId: props.examId,
      classId: props.classId || undefined,
    })
    record.value = acceptTeachingImprovementRecord(generated)
    message.success('已生成最新改进方案')
  } catch (e) {
    record.value = null
    showUserError(e, '教学改进方案生成失败')
  } finally {
    generating.value = false
  }
}

function buildShareText(): string | null {
  const current = record.value
  if (!current || current.analysisStatus !== 'SUCCESS') {
    return null
  }
  const lines = [
    'AI 教学改进方案',
    `考试：${props.examLabel ?? current!.examId}`,
    `生成时间：${formatDateTime(current!.createTime!)}`,
    '',
    current!.overallSummary,
  ]
  improvementItems.value.forEach((item, index) => {
    lines.push(
      '',
      `第 ${index + 1} 项：${item.questionType ? questionTypeLabel(item.questionType) : '教学改进'}`,
      `问题：${item.problemDescription || '无'}`,
      `改进措施：${item.suggestion || '无'}`,
    )
  })
  return lines.join('\n')
}

async function copyShareText(): Promise<void> {
  const text = buildShareText()
  if (!text) {
    showUserError(null, '暂无可分享的 AI 教学改进方案')
    return
  }
  await navigator.clipboard.writeText(text)
  message.success('已复制教学改进方案')
}

function exportRecordText(): void {
  const text = buildShareText()
  if (!text) {
    showUserError(null, '暂无可分享的 AI 教学改进方案')
    return
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `teaching-improvement-${props.examId}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

watch(
  () => [props.examId, props.reloadToken, props.classId],
  () => {
    if (props.examId) void reload()
  },
  { immediate: true },
)

defineExpose({ exportRecordText })
</script>

<style lang="scss" scoped>
.ai-analysis-section__body--flush {
  padding-top: 0;
}
</style>
