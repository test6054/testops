<script setup lang="ts">
/**
 * 达成度详情：结果元数据 + 计算明细 + 审核流水 + 人工复核
 */
import type {
  AchievementAuditStatus,
  AchievementAuditVO,
  AchievementDetailVO,
  AchievementManualReviewVO,
  AchievementResultVO,
  AchievementStatus,
  AchievementTargetType,
  ManualReviewDecision,
} from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
  achievementAuditApi,
  achievementDetailApi,
  achievementManualReviewApi,
} from '@/apis/quality'
import { promptModal } from './_helpers'

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

/**
 * 表格标签 helper：遵循后端真实 DTO 字段类型，避免模板内 as / 反射 / 泛型推断。
 * - targetType 必填字面量联合，直接索引。
 * - achievementStatus / auditStatus 可选字面量联合，需 if 守护 fallback。
 * - auditStatusFrom / auditStatusTo 后端真实类型是 string，通过类型注解将字典宽化为
 *   Record<string, string> 安全读取，未匹配返回原值 / 默认 tag color。
 */
function targetTypeLabel(value: AchievementTargetType): string {
  return ACHIEVEMENT_TARGET_TYPE_LABEL[value] ?? value
}

function achievementStatusLabel(status: AchievementStatus | undefined): string {
  if (!status) return '-'
  return ACHIEVEMENT_STATUS_LABEL[status] ?? status
}

function achievementStatusColor(status: AchievementStatus | undefined): string {
  if (!status) return 'default'
  return ACHIEVEMENT_STATUS_COLOR[status] ?? 'default'
}

function auditStatusLabel(status: AchievementAuditStatus | undefined): string {
  if (!status) return '-'
  return ACHIEVEMENT_AUDIT_STATUS_LABEL[status] ?? status
}

function auditStatusColor(status: AchievementAuditStatus | undefined): string {
  if (!status) return 'default'
  return ACHIEVEMENT_AUDIT_STATUS_COLOR[status] ?? 'default'
}

function auditStatusLabelLoose(value: string | undefined): string {
  if (!value) return '-'
  const dict: Record<string, string> = ACHIEVEMENT_AUDIT_STATUS_LABEL
  return dict[value] ?? value
}

function auditStatusColorLoose(value: string | undefined): string {
  if (!value) return 'default'
  const dict: Record<string, string> = ACHIEVEMENT_AUDIT_STATUS_COLOR
  return dict[value] ?? 'default'
}

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['SUBMITTED'],
  CALCULATED: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED'],
  RETURNED: ['SUBMITTED'],
  ARCHIVED: [],
}

const nextStatuses = computed<AchievementAuditStatus[]>(() => {
  const status = result.value?.auditStatus
  if (!status) return []
  return auditTransitMap[status] || []
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
  }
  finally {
    loading.value = false
  }
}

async function handleTransit(to: AchievementAuditStatus) {
  if (!result.value) return
  const fromStatus = result.value.auditStatus
  if (!fromStatus) return
  const remark = await promptModal({
    title: `${ACHIEVEMENT_AUDIT_STATUS_LABEL[fromStatus]} → ${ACHIEVEMENT_AUDIT_STATUS_LABEL[to]}`,
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

onMounted(loadAll)
</script>

<template>
  <div class="achievement-detail-page">
    <a-card :bordered="false" class="header-card" :loading="loading && !result">
      <a-page-header :title="`达成度详情 #${resultId}`" @back="router.back()">
        <template v-if="result" #extra>
          <a-space>
            <a-button
              v-for="to in nextStatuses"
              :key="to"
              :type="to === 'RETURNED' ? 'default' : 'primary'"
              :danger="to === 'RETURNED'"
              @click="handleTransit(to)"
            >
              → {{ ACHIEVEMENT_AUDIT_STATUS_LABEL[to] }}
            </a-button>
          </a-space>
        </template>
        <a-descriptions v-if="result" :column="3" size="small" bordered>
          <a-descriptions-item label="目标类型">
            {{ targetTypeLabel(result.targetType) }}
          </a-descriptions-item>
          <a-descriptions-item label="目标 ID">
            {{ result.targetId }}
          </a-descriptions-item>
          <a-descriptions-item label="专业 ID">
            {{ result.programId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="培养方案 ID">
            {{ result.trainingPlanId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="课程 ID">
            {{ result.qualityCourseId || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="学年 / 学期">
            {{ result.schoolYear || '-' }} / {{ result.semester || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="达成值">
            <span
              :style="{
                color: result.thresholdValue != null && result.finalValue != null
                  && Number(result.finalValue) < Number(result.thresholdValue)
                  ? '#ff4d4f'
                  : '#52c41a',
              }"
            >
              {{ result.finalValue ?? '-' }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="阈值">
            {{ result.thresholdValue ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="样本（有效 / 总量）">
            {{ result.sampleValid ?? '-' }} / {{ result.sampleTotal ?? '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="达成结论">
            <a-tag v-if="result.achievementStatus" :color="achievementStatusColor(result.achievementStatus)">
              {{ achievementStatusLabel(result.achievementStatus) }}
            </a-tag>
            <span v-else>-</span>
          </a-descriptions-item>
          <a-descriptions-item label="审核状态">
            <a-tag :color="auditStatusColor(result.auditStatus)">
              {{ auditStatusLabel(result.auditStatus) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="计算时间">
            {{ result.calculatedAt || '-' }}
          </a-descriptions-item>
        </a-descriptions>
      </a-page-header>
    </a-card>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="14">
        <a-card title="计算明细" :bordered="false" style="margin-bottom: 16px">
          <a-table :data-source="details" :pagination="false" row-key="id" size="small" :loading="loading">
            <a-table-column title="明细类型" data-index="detailType" />
            <a-table-column title="对象" data-index="referenceName">
              <template #default="{ text, record }">
                <span v-if="record.referenceCode" class="font-mono text-gray-500">{{ record.referenceCode }} · </span>
                {{ text || record.referenceId || '-' }}
              </template>
            </a-table-column>
            <a-table-column title="权重" data-index="weight">
              <template #default="{ text }">
                {{ text ?? '-' }}
              </template>
            </a-table-column>
            <a-table-column title="满分" data-index="fullScore">
              <template #default="{ text }">
                {{ text ?? '-' }}
              </template>
            </a-table-column>
            <a-table-column title="平均分" data-index="averageScore">
              <template #default="{ text }">
                {{ text ?? '-' }}
              </template>
            </a-table-column>
            <a-table-column title="达成值" data-index="achievementValue">
              <template #default="{ text }">
                {{ text ?? '-' }}
              </template>
            </a-table-column>
            <a-table-column title="样本" data-index="sampleValid">
              <template #default="{ record }">
                {{ record.sampleValid ?? '-' }} / {{ record.sampleTotal ?? '-' }}
              </template>
            </a-table-column>
          </a-table>
        </a-card>

        <a-card title="审核责任链流水" :bordered="false">
          <a-timeline>
            <a-timeline-item
              v-for="audit in audits"
              :key="audit.id"
              :color="auditStatusColorLoose(audit.auditStatusTo) === 'red' ? 'red' : 'blue'"
            >
              <p>
                <a-tag>{{ audit.auditEvent }}</a-tag>
                <strong v-if="audit.auditStatusFrom">
                  {{ auditStatusLabelLoose(audit.auditStatusFrom) }}
                </strong>
                <span v-if="audit.auditStatusFrom && audit.auditStatusTo"> → </span>
                <strong v-if="audit.auditStatusTo">
                  {{ auditStatusLabelLoose(audit.auditStatusTo) }}
                </strong>
              </p>
              <p style="color: var(--ant-color-text-secondary); font-size: 13px">
                {{ audit.auditorRole || '审核人' }}（{{ audit.auditorUserId }}）· {{ audit.auditedAt }}
              </p>
              <p v-if="audit.auditOpinion" style="margin: 4px 0 0; color: #555">
                意见：{{ audit.auditOpinion }}
              </p>
              <p v-if="audit.returnReason" style="margin: 4px 0 0; color: #cf1322">
                退回原因：{{ audit.returnReason }}
              </p>
            </a-timeline-item>
          </a-timeline>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="10">
        <a-card title="人工复核" :bordered="false">
          <a-list :data-source="reviews" item-layout="horizontal" :locale="{ emptyText: '尚无复核记录' }">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                  :title="`${item.decision} · ${item.reviewerRole || '审核人'}（${item.reviewerUserId}）`"
                  :description="item.reviewRemark || '-'"
                />
                <template #actions>
                  <span style="font-size: 12px; color: #999">{{ item.reviewedAt }}</span>
                </template>
              </a-list-item>
            </template>
          </a-list>

          <a-divider style="margin: 16px 0" />

          <a-form layout="vertical" :model="reviewForm">
            <a-form-item label="复核决定">
              <a-radio-group v-model:value="reviewForm.decision">
                <a-radio value="CONFIRMED">
                  确认
                </a-radio>
                <a-radio value="RETURNED">
                  退回
                </a-radio>
                <a-radio value="ARCHIVED">
                  归档
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="复核备注">
              <a-textarea v-model:value="reviewForm.reviewRemark" :rows="3" placeholder="复核备注" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" :disabled="!result" @click="submitReview">
                提交复核
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped lang="scss">
.achievement-detail-page {
  padding: 16px;

  .header-card {
    margin-bottom: 16px;
  }
}
</style>
