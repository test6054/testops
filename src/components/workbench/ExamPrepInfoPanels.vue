<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import {
  EXAM_KIND_TONE,
  ExamGradingStrategyDescription,
  ExamKindDescription,
  ExamMaterialLayoutModeDescription,
  ExamPrintSourceModeDescription,
  ExamScorePolicyDescription,
} from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamPrepInfoPanels' })

const props = defineProps<{
  detail: ExamDetailResponse
  examFullScore?: number | null
}>()

interface InfoRow {
  label: string
  value: string
  tagTone?: BadgeTone
}

const examInfoRows = computed((): InfoRow[] => {
  const d = props.detail
  const term = [d.academicYear, formatSemester(d.semester)].filter(Boolean).join(' ')
  const examTime =
    d.examStartTime && d.examEndTime
      ? `${formatDateTimeWithSeconds(d.examStartTime)} ~ ${formatDateTimeWithSeconds(d.examEndTime)}`
      : '—'
  const examKindLabel = d.examKind
    ? strictEnumLabel(ExamKindDescription, d.examKind, '考试性质')
    : (d.examKindMessage ?? '—')
  return [
    { label: '考试编号', value: d.examNo },
    { label: '所属院系', value: d.departmentName ?? '—' },
    { label: '学年学期', value: term || '—' },
    { label: '考试时间', value: examTime },
    {
      label: '考试类型',
      value: examKindLabel,
      tagTone: d.examKind ? strictEnumTone(EXAM_KIND_TONE, d.examKind, '考试性质') : undefined,
    },
    {
      label: '评阅方式',
      value: strictEnumLabel(ExamGradingStrategyDescription, d.gradingStrategy, '评阅方式'),
    },
    { label: '备注', value: d.remark?.trim() || '—' },
    { label: '创建人', value: d.createUserNickName ?? d.createUser },
  ]
})

const configRows = computed((): InfoRow[] => {
  const d = props.detail
  const layoutLabel = d.materialLayoutMode
    ? strictEnumLabel(ExamMaterialLayoutModeDescription, d.materialLayoutMode, '制卷形态')
    : '未配置'
  const printLabel = d.printSourceMode
    ? strictEnumLabel(ExamPrintSourceModeDescription, d.printSourceMode, '印刷来源')
    : '—'
  const scorePolicyLabel = d.scorePolicy
    ? strictEnumLabel(ExamScorePolicyDescription, d.scorePolicy, '成绩合成策略')
    : '—'
  const fullScoreText =
    props.examFullScore != null && Number.isFinite(props.examFullScore)
      ? String(props.examFullScore)
      : '—'
  return [
    { label: '制卷形态', value: layoutLabel },
    { label: '印刷来源', value: printLabel },
    { label: '试卷模板', value: d.templateName ?? '—' },
    { label: '试卷页数', value: d.totalPages != null ? String(d.totalPages) : '—' },
    { label: '题目数', value: String(d.questionCount) },
    { label: '标准答案', value: `${d.answerCount} / ${d.questionCount}` },
    { label: '试卷满分', value: fullScoreText },
    { label: '日常满分', value: d.dailyScoreFull != null ? String(d.dailyScoreFull) : '—' },
    { label: '成绩策略', value: scorePolicyLabel },
    { label: '名册纳入', value: d.rosterScopeModeMessage ?? '—' },
  ]
})
</script>

<template>
  <div class="exam-prep-info-panels">
    <WorkbenchSurfaceCard class="exam-prep-info-panels__card">
      <template #head>
        <span class="exam-prep-info-panels__title">考试信息</span>
      </template>
      <dl class="exam-prep-info-panels__list">
        <div v-for="row in examInfoRows" :key="row.label" class="exam-prep-info-panels__row">
          <dt>{{ row.label }}</dt>
          <dd>
            <UiTag v-if="row.tagTone" :tone="row.tagTone" size="sm">{{ row.value }}</UiTag>
            <span v-else>{{ row.value }}</span>
          </dd>
        </div>
      </dl>
    </WorkbenchSurfaceCard>
    <WorkbenchSurfaceCard class="exam-prep-info-panels__card">
      <template #head>
        <span class="exam-prep-info-panels__title">成绩与制卷配置</span>
      </template>
      <dl class="exam-prep-info-panels__list">
        <div v-for="row in configRows" :key="row.label" class="exam-prep-info-panels__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </WorkbenchSurfaceCard>
  </div>
</template>

<style scoped lang="scss">
.exam-prep-info-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  &__title {
    font-size: 14px;
    font-weight: 600;
  }

  &__list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-size: 13px;

    dt {
      margin: 0;
      color: var(--dp-text-muted);
      flex-shrink: 0;
    }

    dd {
      margin: 0;
      font-weight: 500;
      text-align: right;
      color: var(--dp-text-primary);
      word-break: break-word;
    }
  }
}

@media (max-width: 900px) {
  .exam-prep-info-panels {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
