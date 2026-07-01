<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementAuditVO } from '@/apis/quality/achievement-audit'
import { achievementAuditApi } from '@/apis/quality/achievement-audit'
import type { AchievementDetailVO } from '@/apis/quality/achievement-detail'
import { achievementDetailApi } from '@/apis/quality/achievement-detail'
import type { AchievementManualReviewVO } from '@/apis/quality/achievement-manual-review'
import { achievementManualReviewApi } from '@/apis/quality/achievement-manual-review'
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import { achievementResultApi } from '@/apis/quality/achievement-result'
/**
 * 质量评价 - 达成度详情
 *
 * 状态机：DRAFT / CALCULATED -> SUBMITTED -> CONFIRMED / RETURNED -> ARCHIVED
 *
 * 后端契约：
 * - achievementResultApi.detail / updateAuditStatus
 * - achievementDetailApi.listByResult
 * - achievementAuditApi.listByResult
 * - achievementManualReviewApi.listByResult / create
 */
import type {
  AchievementAuditStatus,
  AchievementDetailType,
  AchievementStatus,
  AchievementTargetType,
  ManualReviewDecision,
} from '@/apis/quality/types'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_DETAIL_TYPE_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  MANUAL_REVIEW_DECISION_LABEL,
} from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { achievementApi } from '@/apis/quality/achievement'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { formatSemester } from '@/types/enums/semester-enum'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

const detailColumns: ColumnsType = [
  { title: '明细类型', dataIndex: 'detailType', key: 'detailType', width: 140 },
  { title: '对象', dataIndex: 'referenceName', key: 'referenceName' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 90 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 90 },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 90 },
  { title: '达成值', dataIndex: 'achievementValue', key: 'achievementValue', width: 100 },
  { title: '样本', dataIndex: 'sampleValid', key: 'sampleValid', width: 110 },
]

const route = useRoute()
const router = useRouter()

/** 全局 scope 切换时返回列表，避免详情与当前培养方案/课程错位 */
useQualityScopedLoader(
  () => {
    void router.push({ name: 'QualityAchievement' })
  },
  { watchScope: true, immediate: false, reloadOnActivated: false },
)

const resultId = computed(() => String(route.params.resultId || ''))

const result = ref<AchievementResultVO | null>(null)
const details = ref<AchievementDetailVO[]>([])
const audits = ref<AchievementAuditVO[]>([])
const reviews = ref<AchievementManualReviewVO[]>([])
const loading = ref(false)
const reviewForm = reactive<{ decision: ManualReviewDecision; reviewRemark: string }>({
  decision: 'CONFIRMED',
  reviewRemark: '',
})

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function isResultStale(value: AchievementResultVO | null): boolean {
  return value?.staleFlag === true
}

function resultValidityLabel(value: AchievementResultVO | null): string {
  return isResultStale(value) ? '已过期' : '有效'
}

function resultValidityColor(value: AchievementResultVO | null): BadgeTone {
  return isResultStale(value) ? 'red' : 'green'
}

function detailTypeLabel(value: AchievementDetailType): string {
  return strictEnumLabel(ACHIEVEMENT_DETAIL_TYPE_LABEL, value, '达成明细类型')
}

function manualReviewDecisionLabel(value: ManualReviewDecision): string {
  return strictEnumLabel(MANUAL_REVIEW_DECISION_LABEL, value, '人工复核决定')
}

function auditEventLabel(event: AchievementAuditStatus): string {
  if (event === 'CALCULATED') return '达成度计算'
  return auditStatusLabel(event)
}

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['CALCULATED'],
  CALCULATED: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED', 'RETURNED'],
  RETURNED: [],
  ARCHIVED: [],
}

const nextStatuses = computed<AchievementAuditStatus[]>(() => {
  const status = result.value?.auditStatus
  if (!status) return []
  return strictEnumValue(auditTransitMap, status, '达成审核状态')
})

const targetTypeToComputeKind: Partial<Record<AchievementTargetType, string>> = {
  COURSE_GOAL: 'COURSE_GOAL',
  REQUIREMENT_INDICATOR: 'REQUIREMENT',
  GRADUATION_REQUIREMENT: 'REQUIREMENT',
  TRAINING_OBJECTIVE: 'TRAINING_OBJECTIVE',
  PROGRAM_SUMMARY: 'PROGRAM',
  CIVIC_GOAL_AGGREGATE: 'CIVIC_GOAL_AGGREGATE',
  COMPLEX_ENGINEERING_AGGREGATE: 'COMPLEX_ENGINEERING',
}

function canRecomputeResult(value: AchievementResultVO | null): boolean {
  if (!value) return false
  return (
    value.auditStatus === 'RETURNED' ||
    isResultStale(value) ||
    value.auditStatus === 'DRAFT' ||
    value.auditStatus === 'CALCULATED'
  )
}

function canSubmitManualReview(value: AchievementResultVO | null): boolean {
  if (!value?.auditStatus) return false
  return value.auditStatus === 'SUBMITTED' || value.auditStatus === 'CONFIRMED'
}

const recomputeLoading = ref(false)

async function handleRecompute() {
  const record = result.value
  if (!record) return
  const computeKind = targetTypeToComputeKind[record.targetType]
  if (!computeKind) {
    message.warning('当前目标类型不支持在此页重算')
    return
  }
  if (!record.trainingPlanId || !record.programId) {
    message.warning('结果缺少培养方案或专业信息，无法重算')
    return
  }
  recomputeLoading.value = true
  try {
    const base = {
      programId: record.programId,
      trainingPlanId: record.trainingPlanId,
      schoolYear: record.schoolYear || undefined,
      semester: record.semester || undefined,
    }
    if (computeKind === 'COURSE_GOAL') {
      if (!record.qualityCourseId) {
        message.warning('课程目标重算缺少关联课程')
        return
      }
      await achievementApi.computeCourseGoal({
        qualityCourseId: record.qualityCourseId,
        courseGoalId: record.targetId,
        schoolYear: base.schoolYear,
        semester: base.semester,
      })
    } else if (computeKind === 'REQUIREMENT') {
      await achievementApi.computeRequirement(base)
    } else if (computeKind === 'TRAINING_OBJECTIVE') {
      await achievementApi.computeTrainingObjective({
        ...base,
        trainingObjectiveId: record.targetId,
      })
    } else if (computeKind === 'PROGRAM') {
      await achievementApi.computeProgram(base)
    } else if (computeKind === 'CIVIC_GOAL_AGGREGATE') {
      await achievementApi.computeCivicGoalAggregate(base)
    } else if (computeKind === 'COMPLEX_ENGINEERING') {
      await achievementApi.computeComplexEngineeringAggregate(base)
    }
    message.success('重新计算完成')
    await loadAll()
  } finally {
    recomputeLoading.value = false
  }
}

async function loadAll() {
  if (!resultId.value) return
  loading.value = true
  try {
    const [r, d, a, rv] = await Promise.all([
      achievementResultApi.detail(resultId.value),
      achievementDetailApi.listByResult(resultId.value),
      achievementAuditApi.listByResult(resultId.value),
      achievementManualReviewApi.listByResult(resultId.value),
    ])
    result.value = r
    details.value = d
    audits.value = a
    reviews.value = rv
  } finally {
    loading.value = false
  }
}

async function handleTransit(to: AchievementAuditStatus) {
  if (!result.value) return
  const fromStatus = result.value.auditStatus
  if (!fromStatus) return
  const remark = await promptInputAsync({
    title: `${auditStatusLabel(fromStatus)} → ${auditStatusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === 'RETURNED',
    okType: to === 'RETURNED' ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === 'RETURNED' && !remark) return
  await achievementResultApi.updateAuditStatus({
    id: result.value.id,
    auditStatus: to,
    auditRemark: remark || undefined,
  })
  message.success('流转成功')
  await loadAll()
}

async function submitReview() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    message.warning('当前审核状态不允许记录人工复核')
    return
  }
  if (!reviewForm.decision.trim()) {
    message.error('请选择复核决定')
    return
  }
  await achievementManualReviewApi.create({
    achievementResultId: result.value.id,
    decision: reviewForm.decision,
    reviewRemark: reviewForm.reviewRemark.trim() || undefined,
  })
  message.success('已记录人工复核')
  reviewForm.reviewRemark = ''
  await loadAll()
}

/* ========== 信号指标带 ========== */

const signals = computed<SignalMetric[]>(() => {
  const r = result.value
  if (!r) return []
  const finalValue = r.finalValue
  const threshold = r.thresholdValue
  const isBelow = threshold != null && finalValue != null && Number(finalValue) < Number(threshold)
  return [
    {
      key: 'final',
      label: '达成值',
      value: finalValue == null ? '-' : finalValue.toFixed(3),
      tone: isBelow ? 'red' : finalValue == null ? 'gray' : 'green',
    },
    {
      key: 'threshold',
      label: '阈值',
      value: threshold == null ? '-' : threshold.toFixed(3),
      tone: 'blue',
    },
    {
      key: 'sample',
      label: '有效 / 总量',
      value: `${r.sampleValid} / ${r.sampleTotal}`,
      tone: 'gray',
    },
    {
      key: 'validity',
      label: '结果有效性',
      value: resultValidityLabel(r),
      tone: isResultStale(r) ? 'red' : 'green',
    },
    {
      key: 'detail-rows',
      label: '明细行数',
      value: details.value.length,
      tone: 'blue',
    },
    {
      key: 'audits',
      label: '审核流水',
      value: audits.value.length,
      tone: audits.value.length > 0 ? 'blue' : 'gray',
    },
    {
      key: 'reviews',
      label: '复核记录',
      value: reviews.value.length,
      tone: reviews.value.length > 0 ? 'green' : 'gray',
    },
  ]
})

const reviewVisible = ref(false)

function openReviewDrawer() {
  if (!result.value) return
  if (!canSubmitManualReview(result.value)) {
    message.warning('当前审核状态不允许记录人工复核')
    return
  }
  reviewVisible.value = true
}

async function submitReviewAndClose() {
  await submitReview()
  reviewVisible.value = false
}

watch(
  resultId,
  () => {
    void loadAll()
  },
  { immediate: true },
)

onActivated(() => {
  if (resultId.value) {
    void loadAll()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar :title="result?.targetLabel || '达成度结果详情'">
        <template #status>
          <UiButton variant="outline" size="sm" @click="router.back()">返回</UiButton>
          <UiTag v-if="result" :tone="auditStatusColor(result.auditStatus)" size="sm">
            {{ auditStatusLabel(result.auditStatus) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="result && canRecomputeResult(result)"
            variant="primary"
            size="sm"
            :loading="recomputeLoading"
            @click="handleRecompute"
          >
            重新计算
          </UiButton>
          <UiButton
            v-if="result && canSubmitManualReview(result)"
            variant="outline"
            size="sm"
            @click="openReviewDrawer"
          >
            人工复核
          </UiButton>
          <UiButton
            v-for="to in nextStatuses"
            :key="to"
            :variant="to === 'RETURNED' ? 'ghost' : 'primary'"
            :status="to === 'RETURNED' ? 'danger' : 'normal'"
            size="sm"
            @click="handleTransit(to)"
          >
            -> {{ auditStatusLabel(to) }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty v-if="!result && !loading" description="暂无数据" class="achievement-detail__empty" />

    <template v-else-if="result">
      <SignalBand :metrics="signals" compact class="achievement-detail__signals" />

      <UiCard class="achievement-detail__meta-card">
        <template #title>结果元数据</template>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="目标类型">
            {{ targetTypeLabel(result.targetType) }}
          </a-descriptions-item>
          <a-descriptions-item label="目标对象">
            {{ result.targetLabel }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.programId" label="所属专业">
            {{ result.programName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.trainingPlanId" label="培养方案">
            {{ result.trainingPlanCode }} {{ result.trainingPlanName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="result.qualityCourseId" label="关联课程">
            {{ result.qualityCourseCode }} {{ result.qualityCourseName }}
          </a-descriptions-item>
          <a-descriptions-item label="学年 / 学期">
            {{ result.schoolYear
            }}<span v-if="result.semester"> / {{ formatSemester(result.semester) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="达成结论">
            <UiTag :tone="achievementStatusColor(result.achievementStatus)" size="sm">
              {{ achievementStatusLabel(result.achievementStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="计算时间">
            {{ result.calculatedTime }}
          </a-descriptions-item>
          <a-descriptions-item label="审核状态">
            <UiTag :tone="auditStatusColor(result.auditStatus)" size="sm">
              {{ auditStatusLabel(result.auditStatus) }}
            </UiTag>
          </a-descriptions-item>
        </a-descriptions>
      </UiCard>

      <UiCard class="achievement-detail__panel">
        <template #title>结果有效性</template>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="有效性状态">
            <UiTag :tone="resultValidityColor(result)" size="sm">
              {{ resultValidityLabel(result) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ result.staleTime || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="过期原因">
            {{ result.staleReason || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="来源类型">
            {{ result.staleSourceType || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="来源 ID">
            {{ result.staleSourceId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="说明">
            {{
              isResultStale(result)
                ? '当前结果已过期，需按最新成绩或配置重新计算'
                : '当前结果与最新成绩、配置保持一致'
            }}
          </a-descriptions-item>
        </a-descriptions>
      </UiCard>

      <div class="achievement-detail__layout">
        <UiCard class="achievement-detail__detail-card">
          <template #title>计算明细</template>
          <UiEmpty v-if="!details.length && !loading" description="暂无数据" size="sm" />
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            v-else
            :columns="detailColumns"
            :data-source="details"
            row-key="id"
            size="small"
            :loading="loading"
            :show-pagination="false"
            flat
            :total="details.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'detailType'">
                {{ detailTypeLabel(record.detailType) }}
              </template>
              <template v-else-if="column.key === 'referenceName'">
                <span v-if="record.referenceCode" class="achievement-detail__ref-code">
                  {{ record.referenceCode }}
                </span>
                {{ record.referenceName }}
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ typeof record.weight === 'number' ? record.weight : '未配置权重' }}
              </template>
              <template v-else-if="column.key === 'fullScore'">
                {{ typeof record.fullScore === 'number' ? record.fullScore : '未配置满分' }}
              </template>
              <template v-else-if="column.key === 'averageScore'">
                {{ typeof record.averageScore === 'number' ? record.averageScore : '未生成平均分' }}
              </template>
              <template v-else-if="column.key === 'achievementValue'">
                {{
                  typeof record.achievementValue === 'number'
                    ? record.achievementValue
                    : '未生成达成值'
                }}
              </template>
              <template v-else-if="column.key === 'sampleValid'">
                <div>{{ record.sampleValid }} / {{ record.sampleTotal }}</div>
                <p v-if="record.excludedSampleReason" class="achievement-detail__evidence-gap">
                  {{ record.excludedSampleReason }}
                </p>
              </template>
            </template>
          </UiDataTable>
        </UiCard>

        <UiCard class="achievement-detail__audit-card">
          <template #title>审核责任链流水</template>
          <UiEmpty v-if="!audits.length && !loading" description="暂无数据" size="sm" />
          <a-timeline v-else class="achievement-detail__timeline">
            <a-timeline-item
              v-for="audit in audits"
              :key="audit.id"
              :color="auditStatusColor(audit.auditStatusTo) === 'red' ? 'red' : 'blue'"
            >
              <p class="achievement-detail__audit-line">
                <UiTag tone="gray" size="sm">{{ auditEventLabel(audit.auditEvent) }}</UiTag>
                <strong v-if="audit.auditStatusFrom">
                  {{ auditStatusLabel(audit.auditStatusFrom) }}
                </strong>
                <span v-if="audit.auditStatusFrom && audit.auditStatusTo"> -> </span>
                <strong v-if="audit.auditStatusTo">
                  {{ auditStatusLabel(audit.auditStatusTo) }}
                </strong>
              </p>
              <p class="achievement-detail__audit-meta">
                {{ audit.auditorNickName }} · {{ audit.auditedTime }}
              </p>
              <p v-if="audit.auditOpinion" class="achievement-detail__audit-opinion">
                意见：{{ audit.auditOpinion }}
              </p>
              <p v-if="audit.returnReason" class="achievement-detail__audit-return">
                退回原因：{{ audit.returnReason }}
              </p>
            </a-timeline-item>
          </a-timeline>
        </UiCard>
      </div>

      <UiCard class="achievement-detail__review-card">
        <template #title>人工复核记录</template>
        <UiEmpty v-if="!reviews.length" description="暂无数据" size="sm" />
        <a-list v-else :data-source="reviews" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta
                :title="`${manualReviewDecisionLabel(item.decision)} · ${item.reviewerNickName}`"
                :description="item.reviewRemark"
              />
              <template #actions>
                <span class="achievement-detail__review-time">{{ item.reviewedTime }}</span>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </UiCard>
    </template>

    <UiDrawer
      v-model:open="reviewVisible"
      title="人工复核"
      :width="560"
      :hide-footer="false"
      ok-text="提交复核"
      @ok="submitReviewAndClose"
    >
      <a-form layout="vertical" :model="reviewForm">
        <a-form-item label="复核决定" required>
          <a-radio-group v-model:value="reviewForm.decision">
            <a-radio value="CONFIRMED"> 确认 </a-radio>
            <a-radio value="RETURNED"> 退回 </a-radio>
            <a-radio value="ARCHIVED"> 归档 </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="复核备注">
          <a-textarea v-model:value="reviewForm.reviewRemark" :rows="4" placeholder="复核备注" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.achievement-detail {
  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-meta {
    color: var(--dp-text-muted);
    font-size: 12px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  &__ref-code {
    color: var(--dp-text-muted);
    font-size: 12px;
    margin-right: 4px;
  }

  &__evidence-gap {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--dp-warning);
    line-height: 1.4;
  }

  &__timeline {
    margin-top: 4px;
  }

  &__audit-line {
    margin: 0 0 4px;
    color: var(--dp-text-primary);
  }

  &__audit-meta {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__audit-opinion {
    margin: 4px 0 0;
    color: var(--dp-text-secondary);
  }

  &__audit-return {
    margin: 4px 0 0;
    color: var(--ant-color-error);
  }

  &__review-time {
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}

@media (max-width: 1023px) {
  .achievement-detail__layout {
    grid-template-columns: 1fr;
  }
}
</style>
