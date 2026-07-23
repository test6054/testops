<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { BadgeTone, UiAlertStripTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import {
  EXAM_KIND_TONE,
  ExamGradingStrategyDescription,
  ExamKindDescription,
  ExamMaterialLayoutModeDescription,
  ExamPrintSourceModeDescription,
  ExamScorePolicyDescription,
} from '@/apis/mark/exam'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ExamPrepInfoPanels' })

const props = defineProps<{
  detail: ExamDetailResponse
  examFullScore?: number | null
  /** 准备阻断 / 待完善 */
  alertTone?: UiAlertStripTone
  alertTitle?: string
  alertDescription?: string
}>()

interface InfoRow {
  label: string
  value: string
  tagTone?: BadgeTone
  span?: number
}

const showAlert = computed(() => Boolean(props.alertTitle && props.alertDescription))

const examInfoRows = computed((): InfoRow[] => {
  const d = props.detail
  const term = [d.academicYear, formatSemester(d.semester)].filter(Boolean).join(' ')
  const examTime
    = d.examStartTime && d.examEndTime
      ? `${formatDateTimeWithSeconds(d.examStartTime)} ~ ${formatDateTimeWithSeconds(d.examEndTime)}`
      : '—'
  const examKindLabel = d.examKind
    ? strictEnumLabel(ExamKindDescription, d.examKind, '考试性质')
    : (d.examKindMessage ?? '—')
  return [
    { label: '考试编号', value: d.examNo },
    { label: '所属院系', value: d.departmentName ?? '—' },
    { label: '学年学期', value: term || '—' },
    {
      label: '考试类型',
      value: examKindLabel,
      tagTone: d.examKind ? strictEnumTone(EXAM_KIND_TONE, d.examKind, '考试性质') : undefined,
    },
    { label: '考试时间', value: examTime, span: 2 },
    {
      label: '评阅方式',
      value: strictEnumLabel(ExamGradingStrategyDescription, d.gradingStrategy, '评阅方式'),
    },
    { label: '创建人', value: d.createUserNickName ?? d.createUser },
    { label: '备注', value: d.remark?.trim() || '—', span: 2 },
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
  const fullScoreText
    = props.examFullScore != null && Number.isFinite(props.examFullScore)
      ? String(props.examFullScore)
      : '—'
  return [
    { label: '制卷形态', value: layoutLabel },
    { label: '印刷来源', value: printLabel },
    { label: '制卷入口', value: d.layoutEntryKindMessage ?? '—' },
    { label: '纸张规格', value: d.layoutPaperSpecMessage ?? '—' },
    { label: '扫描印张', value: d.scanPaperStyleText ?? '—' },
    { label: '试卷模板', value: d.templateName ?? '—' },
    { label: '试卷页数', value: d.totalPages != null ? String(d.totalPages) : '—' },
    { label: '题目数', value: String(d.questionCount) },
    { label: '标准答案', value: `${d.answerCount} / ${d.questionCount}` },
    { label: '试卷满分', value: fullScoreText },
    { label: '日常满分', value: d.dailyScoreFull != null ? String(d.dailyScoreFull) : '—' },
    { label: '成绩策略', value: scorePolicyLabel },
    { label: '名册纳入', value: d.rosterScopeModeMessage ?? '—', span: 2 },
  ]
})

const descColumn = { xs: 1, sm: 1, md: 2 }
</script>

<template>
  <WorkbenchSurfaceCard class="exam-prep-info-panels" flush>
    <div
      v-if="showAlert"
      class="exam-prep-info-panels__status"
      :class="{
        'exam-prep-info-panels__status--warning': alertTone === 'warning',
        'exam-prep-info-panels__status--error': alertTone === 'error',
      }"
    >
      <UiAlertStrip
        :tone="alertTone ?? 'warning'"
        :title="alertTitle"
        :description="alertDescription"
        :closable="false"
        dense
        inline
        class="exam-prep-info-panels__alert"
      >
        <template v-if="$slots['alert-actions']" #actions>
          <slot name="alert-actions" />
        </template>
      </UiAlertStrip>
    </div>
    <div class="exam-prep-info-panels__grid">
      <section class="exam-prep-info-panels__section">
        <h3 class="exam-prep-info-panels__title">考试信息</h3>
        <UiDescriptions
          class="exam-prep-info-panels__desc"
          size="sm"
          :column="descColumn"
          :colon="false"
        >
          <UiDescriptionsItem
            v-for="row in examInfoRows"
            :key="row.label"
            :label="row.label"
            :span="row.span"
          >
            <UiTag v-if="row.tagTone" :tone="row.tagTone" size="sm">{{ row.value }}</UiTag>
            <span v-else>{{ row.value }}</span>
          </UiDescriptionsItem>
        </UiDescriptions>
      </section>
      <section class="exam-prep-info-panels__section">
        <h3 class="exam-prep-info-panels__title">成绩与制卷配置</h3>
        <UiDescriptions
          class="exam-prep-info-panels__desc"
          size="sm"
          :column="descColumn"
          :colon="false"
        >
          <UiDescriptionsItem
            v-for="row in configRows"
            :key="row.label"
            :label="row.label"
            :span="row.span"
          >
            {{ row.value }}
          </UiDescriptionsItem>
        </UiDescriptions>
      </section>
    </div>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.exam-prep-info-panels {
  &__status {
    border-bottom: 1px solid var(--dp-border);
    background: var(--dp-surface-elevated);
  }

  &__status--warning {
    background: var(--dp-warning-bg);
  }

  &__status--error {
    background: var(--dp-error-bg);
  }

  &__alert {
    margin: 0;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  &__section {
    min-width: 0;
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px) var(--dp-space-1, 4px);

    &:first-child {
      border-right: 1px solid var(--dp-border);
    }
  }

  &__title {
    margin: 0 0 6px;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.01em;
    color: var(--dp-text-primary);
  }

  &__desc :deep(.ant-descriptions-item-label),
  &__desc :deep(.ant-descriptions-item-content) {
    padding-bottom: 6px !important;
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
  }

  &__desc :deep(.ant-descriptions-item-label) {
    width: 72px;
    color: var(--dp-text-muted);
    font-weight: 400;
  }

  &__desc :deep(.ant-descriptions-item-content) {
    font-weight: 500;
    color: var(--dp-text-primary);
    word-break: break-word;
  }
}

@media (max-width: 900px) {
  .exam-prep-info-panels {
    &__grid {
      grid-template-columns: minmax(0, 1fr);
    }

    &__section:first-child {
      border-right: none;
      border-bottom: 1px solid var(--dp-border);
      padding-bottom: var(--dp-space-2, 8px);
    }
  }
}
</style>
