<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 质量评价 - 达成度详情
 *
 * 状态机：DRAFT / CALCULATED -> SUBMITTED -> CONFIRMED / RETURNED -> ARCHIVED
 *
 * 后端契约：
 * - achievementApi.detail / updateAuditStatus
 * - achievementDetailApi.listByResult
 * - achievementAuditApi.listByResult
 * - achievementManualReviewApi.listByResult / create
 */
import type {
  AchievementAuditStatus,
  AchievementAuditVO,
  AchievementDetailType,
  AchievementDetailVO,
  AchievementManualReviewVO,
  AchievementResultVO,
  AchievementStatus,
  AchievementTargetType,
  ManualReviewDecision,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_DETAIL_TYPE_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
  achievementAuditApi,
  achievementDetailApi,
  achievementManualReviewApi,
  MANUAL_REVIEW_DECISION_LABEL,
} from '@/apis/quality'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import { ContextBar, SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { promptModal } from './_helpers'

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

const resultId = computed(() => String(route.params.resultId || ''))

const result = ref<AchievementResultVO | null>(null)
const details = ref<AchievementDetailVO[]>([])
const audits = ref<AchievementAuditVO[]>([])
const reviews = ref<AchievementManualReviewVO[]>([])
const loading = ref(false)
const reviewForm = reactive<{ decision: ManualReviewDecision, reviewRemark: string }>({
  decision: 'CONFIRMED',
  reviewRemark: '',
})

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): string {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): string {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function isResultStale(value: AchievementResultVO | null): boolean {
  return value?.staleFlag === true
}

function resultValidityLabel(value: AchievementResultVO | null): string {
  return isResultStale(value) ? '已过期' : '有效'
}

function resultValidityColor(value: AchievementResultVO | null): string {
  return isResultStale(value) ? 'red' : 'green'
}

function detailTypeLabel(value: AchievementDetailType): string {
  return strictEnumLabel(ACHIEVEMENT_DETAIL_TYPE_LABEL, value, '达成明细类型')
}

function manualReviewDecisionLabel(value: ManualReviewDecision): string {
  return strictEnumLabel(MANUAL_REVIEW_DECISION_LABEL, value, '人工复核决定')
}

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['CALCULATED'],
  CALCULATED: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED', 'RETURNED'],
  RETURNED: ['CALCULATED'],
  ARCHIVED: [],
}

const nextStatuses = computed<AchievementAuditStatus[]>(() => {
  const status = result.value?.auditStatus
  if (!status) return []
  return strictEnumValue(auditTransitMap, status, '达成审核状态')
})

async function loadAll() {
  if (!resultId.value) return
  loading.value = true
  try {
    const [r, d, a, rv] = await Promise.all([
      achievementApi.detail(resultId.value),
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
  const remark = await promptModal({
    title: `${auditStatusLabel(fromStatus)} → ${auditStatusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === 'RETURNED',
    okType: to === 'RETURNED' ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === 'RETURNED' && !remark) return
  await achievementApi.updateAuditStatus({
    id: result.value.id,
    auditStatus: to,
    auditRemark: remark || undefined,
  })
  message.success('流转成功')
  await loadAll()
}

async function submitReview() {
  if (!result.value) return
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
  reviewVisible.value = true
}

async function submitReviewAndClose() {
  await submitReview()
  reviewVisible.value = false
}

onMounted(loadAll)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiButton variant="outline" size="sm" @click="router.back()">返回</UiButton>
          <a-tag v-if="result" :color="auditStatusColor(result.auditStatus)">
            {{ auditStatusLabel(result.auditStatus) }}
          </a-tag>
        </template>
        <template #actions>
          <UiButton
            v-if="result"
            variant="outline"
            size="sm"
            :disabled="!result"
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

    <UiEmpty
      v-if="!result && !loading"
      description="未找到该达成度结果记录，请检查链接是否有效。"
      class="achievement-detail__empty"
    />

    <template v-else-if="result">
      <SignalBand :metrics="signals" compact class="achievement-detail__signals" />

      <a-card :bordered="false" class="detail-table-card achievement-detail__meta-card">
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
            {{ result.schoolYear }} / {{ result.semester }}
          </a-descriptions-item>
          <a-descriptions-item label="达成结论">
            <a-tag :color="achievementStatusColor(result.achievementStatus)">
              {{ achievementStatusLabel(result.achievementStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="计算时间">
            {{ result.calculatedAt }}
          </a-descriptions-item>
          <a-descriptions-item label="审核状态">
            <a-tag :color="auditStatusColor(result.auditStatus)">
              {{ auditStatusLabel(result.auditStatus) }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>

      <a-card :bordered="false" class="detail-table-card achievement-detail__panel">
        <template #title>结果有效性</template>
        <a-descriptions :column="3" size="small" bordered>
          <a-descriptions-item label="有效性状态">
            <a-tag :color="resultValidityColor(result)">
              {{ resultValidityLabel(result) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="过期时间">
            {{ result.staleAt || '-' }}
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
      </a-card>

      <div class="achievement-detail__layout">
        <a-card :bordered="false" class="detail-table-card achievement-detail__detail-card">
          <template #title>计算明细</template>
          <UiEmpty
            v-if="!details.length && !loading"
            description="未生成明细记录。仅草稿或已计算状态后才会产出主要明细。"
            size="sm"
          />
          <UiDataTable class="student-detail-table__data-table"
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
                {{ record.sampleValid }} / {{ record.sampleTotal }}
              </template>
            </template>
          </UiDataTable>
        </a-card>

        <a-card :bordered="false" class="detail-table-card achievement-detail__audit-card">
          <template #title>审核责任链流水</template>
          <UiEmpty
            v-if="!audits.length && !loading"
            description="未产生审核流水。审核动作会记录状态跳转与意见。"
            size="sm"
          />
          <a-timeline v-else class="achievement-detail__timeline">
            <a-timeline-item
              v-for="audit in audits"
              :key="audit.id"
              :color="auditStatusColor(audit.auditStatusTo) === 'red' ? 'red' : 'blue'"
            >
              <p class="achievement-detail__audit-line">
                <a-tag>{{ auditStatusLabel(audit.auditEvent) }}</a-tag>
                <strong v-if="audit.auditStatusFrom">
                  {{ auditStatusLabel(audit.auditStatusFrom) }}
                </strong>
                <span v-if="audit.auditStatusFrom && audit.auditStatusTo"> -> </span>
                <strong v-if="audit.auditStatusTo">
                  {{ auditStatusLabel(audit.auditStatusTo) }}
                </strong>
              </p>
              <p class="achievement-detail__audit-meta">
                {{ audit.auditorNickName || '审核人' }} · {{ audit.auditedAt }}
              </p>
              <p v-if="audit.auditOpinion" class="achievement-detail__audit-opinion">
                意见：{{ audit.auditOpinion }}
              </p>
              <p v-if="audit.returnReason" class="achievement-detail__audit-return">
                退回原因：{{ audit.returnReason }}
              </p>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </div>

      <a-card :bordered="false" class="detail-table-card achievement-detail__review-card">
        <template #title>人工复核记录</template>
        <UiEmpty
          v-if="!reviews.length"
          description="尚无人工复核记录。可点击顶部「人工复核」补充复核意见。"
          size="sm"
        />
        <a-list v-else :data-source="reviews" item-layout="horizontal">
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta
                :title="`${manualReviewDecisionLabel(item.decision)} · ${item.reviewerNickName || '复核人'}`"
                :description="item.reviewRemark"
              />
              <template #actions>
                <span class="achievement-detail__review-time">{{ item.reviewedAt }}</span>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
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
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  &__ref-code {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
    margin-right: 4px;
  }

  &__timeline {
    margin-top: 4px;
  }

  &__audit-line {
    margin: 0 0 4px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__audit-meta {
    margin: 0 0 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__audit-opinion {
    margin: 4px 0 0;
    color: var(--dp-text-secondary, #475569);
  }

  &__audit-return {
    margin: 4px 0 0;
    color: var(--ant-color-error, #dc2626);
  }

  &__review-time {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }
}

@media (max-width: 1023px) {
  .achievement-detail__layout {
    grid-template-columns: 1fr;
  }
}
</style>
