<script setup lang="ts">
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCockpitVO,
  AccreditationConclusionRegisterRequest,
  AccreditationCyclePhase,
  AccreditationCycleSaveRequest,
  AccreditationCycleVO,
  SelfAssessmentReviewDecisionRequest,
} from '@/apis/quality'
import { DownOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import {
  ACCREDITATION_CONCLUSION_LABEL,
  ACCREDITATION_CYCLE_PHASE_LABEL,
  ACCREDITATION_CYCLE_STATUS_LABEL,
  accreditationApi,
} from '@/apis/quality'
import { UiButton, UiDataTable, UiDrawer, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import {
  canConclusion,
  canDeleteCycle,
  canEditCycle,
  canRecordApplication,
  canReview,
  canSubmitSelfAssessment,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  cockpit?: AccreditationCockpitVO
}>()

const emit = defineEmits<{ "refresh": [], 'go-ai-report': [] }>()

type AccreditationCycleMenuAction = 'application' | 'self' | 'review' | 'conclusion' | 'delete'

interface AccreditationCycleMenuItem {
  key: AccreditationCycleMenuAction
  label: string
  danger?: boolean
}

const columns: ColumnsType<AccreditationCycleVO> = [
  { title: '周期编码', dataIndex: 'cycleCode', key: 'cycleCode', width: 120 },
  { title: '周期名称', dataIndex: 'cycleName', key: 'cycleName' },
  { title: '阶段', dataIndex: 'currentPhase', key: 'currentPhase', width: 108 },
  { title: '状态', dataIndex: 'cycleStatus', key: 'cycleStatus', width: 88 },
  { title: '结论', dataIndex: 'conclusionType', key: 'conclusionType', width: 108 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const loading = ref(false)
const cycles = ref<AccreditationCycleVO[]>([])
const drawerOpen = ref(false)
const detailOpen = ref(false)
const reviewOpen = ref(false)
const conclusionOpen = ref(false)
const detailRecord = ref<AccreditationCycleVO>()
const activeRow = ref<AccreditationCycleVO>()

const form = reactive<AccreditationCycleSaveRequest>({
  programId: '',
  trainingPlanId: '',
  cycleCode: '',
  cycleName: '',
})

const reviewForm = reactive<
  Pick<SelfAssessmentReviewDecisionRequest, 'reviewDecision' | 'reviewRemark' | 'supplementDeadline'>
>({
  reviewDecision: 'ACCEPTED',
  reviewRemark: '',
  supplementDeadline: '',
})

const conclusionForm = reactive<
  Pick<
    AccreditationConclusionRegisterRequest,
    'conclusionType' | 'validFrom' | 'validUntil' | 'conditionalDueDate' | 'conclusionRemark'
  >
>({
  conclusionType: 'FULL_6Y',
  validFrom: '',
  validUntil: '',
  conditionalDueDate: '',
  conclusionRemark: '',
})

const activeCycle = computed(() => props.cockpit?.activeCycle)

const conclusionReadinessItems = computed(() => props.cockpit?.conclusionReadinessItems || [])

const blockedConclusionItems = computed(() =>
  conclusionReadinessItems.value.filter(item => !item.ready),
)

const deadlineHints = computed(() => {
  const c = props.cockpit
  if (!c) return []
  const hints: string[] = []
  if (c.conditionalDueDaysRemaining != null) {
    hints.push(`有条件改进剩余 ${c.conditionalDueDaysRemaining} 天`)
  }
  if (c.onsiteReportDueDaysRemaining != null) {
    hints.push(`考查报告剩余 ${c.onsiteReportDueDaysRemaining} 天`)
  }
  return hints
})

async function loadCycles() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    const page = await accreditationApi.cyclePage({
      trainingPlanId: props.trainingPlanId,
      pageNum: 1,
      pageSize: 50,
    })
    cycles.value = readPageList(page, '认证周期列表加载失败，请刷新后重试')
  } catch (e) {
    showUserError(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = undefined
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.cycleCode = `ACC-${new Date().getFullYear()}`
  form.cycleName = `${new Date().getFullYear()} 工程教育认证`
  form.remark = ''
  form.onsiteVisitStart = undefined
  form.onsiteVisitEnd = undefined
  drawerOpen.value = true
}

function openEdit(row: AccreditationCycleVO) {
  form.id = row.id
  form.programId = row.programId
  form.trainingPlanId = row.trainingPlanId
  form.cycleCode = row.cycleCode
  form.cycleName = row.cycleName
  form.remark = row.remark
  form.onsiteVisitStart = row.onsiteVisitStart
  form.onsiteVisitEnd = row.onsiteVisitEnd
  form.onsiteReportDueDate = row.onsiteReportDueDate
  drawerOpen.value = true
}

async function openDetail(row: AccreditationCycleVO) {
  try {
    detailRecord.value = await accreditationApi.cycleDetail(row.id)
    detailOpen.value = true
  } catch (e) {
    showUserError(e)
  }
}

async function submitCycle() {
  if (!form.cycleCode.trim() || !form.cycleName.trim()) {
    message.error('请填写周期编码与名称')
    return
  }
  try {
    if (form.id) {
      await accreditationApi.cycleUpdate(form)
    } else {
      await accreditationApi.cycleCreate(form)
    }
    message.success('已保存')
    drawerOpen.value = false
    await loadCycles()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

async function runAction(fn: () => Promise<void>, confirmTitle?: string) {
  if (confirmTitle) {
    const ok = await confirmAsync({ title: confirmTitle })
    if (!ok) return
  }
  try {
    await fn()
    message.success('操作成功')
    await loadCycles()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

async function removeCycle(row: AccreditationCycleVO) {
  const ok = await confirmAsync({ title: '确认删除该认证周期？删除后不可恢复。' })
  if (!ok) return
  await runAction(() => accreditationApi.cycleDelete(row.id))
}

function openReview(row: AccreditationCycleVO) {
  activeRow.value = row
  reviewForm.reviewDecision = 'ACCEPTED'
  reviewForm.reviewRemark = ''
  reviewForm.supplementDeadline = ''
  reviewOpen.value = true
}

async function submitReview() {
  if (!activeRow.value) return
  if (reviewForm.reviewDecision === 'SUPPLEMENT_REQUIRED' && !reviewForm.supplementDeadline) {
    message.error('需补正时必须填写补正截止日期')
    return
  }
  await runAction(() =>
    accreditationApi.decideReview({
      accreditationCycleId: activeRow.value!.id,
      reviewDecision: reviewForm.reviewDecision,
      reviewRemark: reviewForm.reviewRemark || undefined,
      supplementDeadline: reviewForm.supplementDeadline || undefined,
    }),
  )
  reviewOpen.value = false
}

function openConclusion(row: AccreditationCycleVO) {
  if (blockedConclusionItems.value.length) {
    message.error('认证结论登记前置条件未全部就绪，请先处理阻断项')
    return
  }
  activeRow.value = row
  conclusionForm.conclusionType = 'FULL_6Y'
  conclusionForm.validFrom = ''
  conclusionForm.validUntil = ''
  conclusionForm.conditionalDueDate = ''
  conclusionForm.conclusionRemark = ''
  conclusionOpen.value = true
}

async function submitConclusion() {
  if (!activeRow.value) return
  const requiresValidity = conclusionForm.conclusionType !== 'NOT_PASS'
  if (requiresValidity && !conclusionForm.validFrom) {
    message.error('请填写有效期起')
    return
  }
  if (conclusionForm.conclusionType === 'CONDITIONAL_6Y' && !conclusionForm.conditionalDueDate) {
    message.error('有条件通过须填写第 3 年改进材料截止日')
    return
  }
  await runAction(
    () =>
      accreditationApi.registerConclusion({
        accreditationCycleId: activeRow.value!.id,
        conclusionType: conclusionForm.conclusionType,
        validFrom: requiresValidity ? conclusionForm.validFrom : undefined,
        validUntil: requiresValidity ? conclusionForm.validUntil || undefined : undefined,
        conditionalDueDate:
          conclusionForm.conclusionType === 'CONDITIONAL_6Y'
            ? conclusionForm.conditionalDueDate || undefined
            : undefined,
        conclusionRemark: conclusionForm.conclusionRemark || undefined,
      }),
    '确认登记认证结论？登记后周期进入保持改进阶段。',
  )
  conclusionOpen.value = false
}

function phaseLabel(phase: AccreditationCyclePhase) {
  return strictEnumLabel(ACCREDITATION_CYCLE_PHASE_LABEL, phase, '认证周期阶段')
}

function buildMenuItems(row: AccreditationCycleVO): AccreditationCycleMenuItem[] {
  const items: AccreditationCycleMenuItem[] = []
  if (canRecordApplication(row) && !row.applicationRecordedAt) {
    items.push({ key: 'application', label: '登记申请书提交' })
  }
  if (canSubmitSelfAssessment(row)) {
    items.push({ key: 'self', label: '提交自评报告' })
  }
  if (canReview(row)) {
    items.push({ key: 'review', label: '自评审阅决议' })
  }
  if (canConclusion(row)) {
    items.push({ key: 'conclusion', label: '登记认证结论' })
  }
  if (canDeleteCycle(row)) {
    items.push({ key: 'delete', label: '删除周期', danger: true })
  }
  return items
}

function bindCycleMenuClick(row: AccreditationCycleVO): (event: MenuInfo) => void {
  return (event: MenuInfo) => {
    void handleCycleMenuClick(row, event)
  }
}

async function handleCycleMenuClick(row: AccreditationCycleVO, event: MenuInfo) {
  if (typeof event.key !== 'string') {
    showUserError(null, '流程操作无效，请重新选择')
    return
  }
  const matchedItem = buildMenuItems(row).find((item) => item.key === event.key)
  if (!matchedItem) {
    showUserError(null, '当前周期不可执行该流程操作')
    return
  }
  if (matchedItem.key === 'application') {
    await runAction(() => accreditationApi.recordApplication(row.id), '确认登记申请书已提交？')
    return
  }
  if (matchedItem.key === 'self') {
    await runAction(
      () => accreditationApi.submitSelfAssessment(row.id),
      '确认提交自评报告？提交后进入自评审阅阶段。',
    )
    return
  }
  if (matchedItem.key === 'review') {
    openReview(row)
    return
  }
  if (matchedItem.key === 'conclusion') {
    openConclusion(row)
    return
  }
  if (matchedItem.key === 'delete') {
    await removeCycle(row)
  }
}

watch(() => props.trainingPlanId, loadCycles, { immediate: true })

defineExpose({ openCreate, loadCycles })
</script>

<template>
  <div class="cycle-panel">
    <div v-if="activeCycle" class="cycle-banner">
      <div>
        <strong>{{ activeCycle.cycleName }}</strong>
        <UiTag class="ml-8">{{ phaseLabel(activeCycle.currentPhase) }}</UiTag>
        <UiTag
          class="ml-8"
          :tone="props.cockpit?.conclusionRegistrationReady ? 'green' : 'orange'"
          size="sm"
        >
          {{ props.cockpit?.conclusionRegistrationReady ? '结论登记已就绪' : '结论登记未就绪' }}
        </UiTag>
        <span v-for="hint in deadlineHints" :key="hint" class="meta">{{ hint }}</span>
      </div>
      <div class="banner-actions">
        <UiButton size="sm" variant="outline" @click="emit('go-ai-report')">
          AI 生成自评报告
        </UiButton>
        <UiButton size="sm" @click="openDetail(activeCycle)">周期详情</UiButton>
      </div>
    </div>
    <div v-if="conclusionReadinessItems.length" class="readiness-panel">
      <div class="readiness-header">
        <strong>结论登记前置条件</strong>
        <span class="muted">
          {{ blockedConclusionItems.length ? `阻断 ${blockedConclusionItems.length} 项` : '全部就绪' }}
        </span>
      </div>
      <div class="readiness-grid">
        <div
          v-for="item in conclusionReadinessItems"
          :key="item.itemKey"
          class="readiness-item"
          :class="{ 'is-blocked': !item.ready }"
        >
          <UiTag :tone="item.ready ? 'green' : 'orange'" size="sm">
            {{ item.ready ? '已就绪' : '未就绪' }}
          </UiTag>
          <div>
            <strong>{{ item.itemName }}</strong>
            <p>{{ item.message }}</p>
          </div>
        </div>
      </div>
    </div>
    <UiDataTable
      :columns="columns"
      :data-source="cycles"
      :loading="loading"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'currentPhase'">
          {{ phaseLabel(record.currentPhase) }}
        </template>
        <template v-else-if="column.key === 'cycleStatus'">
          {{
            strictEnumLabel(ACCREDITATION_CYCLE_STATUS_LABEL, record.cycleStatus, '认证周期状态')
          }}
        </template>
        <template v-else-if="column.key === 'conclusionType'">
          <span v-if="record.conclusionType">
            {{
              strictEnumLabel(ACCREDITATION_CONCLUSION_LABEL, record.conclusionType, '认证结论类型')
            }}
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton size="sm" variant="ghost" @click="openDetail(record)">详情</UiButton>
          <UiButton v-if="canEditCycle(record)" size="sm" variant="ghost" @click="openEdit(record)">
            编辑
          </UiButton>
          <a-dropdown v-if="buildMenuItems(record).length" trigger="click">
            <UiButton size="sm" variant="outline">
              流程操作
              <DownOutlined />
            </UiButton>
            <template #overlay>
              <a-menu @click="bindCycleMenuClick(record)">
                <a-menu-item
                  v-for="item in buildMenuItems(record)"
                  :key="item.key"
                  :danger="item.danger"
                >
                  {{ item.label }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
      </template>
      <template #empty>
        <UiEmpty description="暂无认证周期" />
      </template>
    </UiDataTable>
    <UiDrawer
      v-model:open="drawerOpen"
      :title="form.id ? '编辑认证周期' : '新建认证周期'"
      width="480"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitCycle"
    >
      <a-form layout="vertical">
        <a-form-item label="周期编码" required>
          <a-input v-model:value="form.cycleCode" :disabled="!!form.id" />
        </a-form-item>
        <a-form-item label="周期名称" required>
          <a-input v-model:value="form.cycleName" />
        </a-form-item>
        <a-form-item label="现场考查开始">
          <a-date-picker
            v-model:value="form.onsiteVisitStart"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="现场考查结束">
          <a-date-picker
            v-model:value="form.onsiteVisitEnd"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>
    <UiDrawer v-model:open="detailOpen" title="认证周期详情" width="520" hide-footer>
      <dl v-if="detailRecord" class="detail-dl">
        <dt>阶段</dt>
        <dd>{{ phaseLabel(detailRecord.currentPhase) }}</dd>
        <dt>状态</dt>
        <dd>
          {{
            strictEnumLabel(
              ACCREDITATION_CYCLE_STATUS_LABEL,
              detailRecord.cycleStatus,
              '认证周期状态',
            )
          }}
        </dd>
        <dt>申请登记</dt>
        <dd>{{ detailRecord.applicationRecordedAt || '—' }}</dd>
        <dt>自评提交</dt>
        <dd>{{ detailRecord.selfAssessmentSubmittedAt || '—' }}</dd>
        <dt>审阅决议</dt>
        <dd>{{ detailRecord.selfAssessmentReviewDecision || '—' }}</dd>
        <dt>审阅意见</dt>
        <dd>{{ detailRecord.selfAssessmentReviewRemark || '—' }}</dd>
        <dt>结论</dt>
        <dd>
          {{
            detailRecord.conclusionType
              ? strictEnumLabel(
                ACCREDITATION_CONCLUSION_LABEL,
                detailRecord.conclusionType,
                '认证结论类型',
              )
              : '—'
          }}
        </dd>
        <dt>有效期</dt>
        <dd>{{ detailRecord.validFrom || '—' }} ~ {{ detailRecord.validUntil || '—' }}</dd>
        <dt>改进截止</dt>
        <dd>{{ detailRecord.conditionalDueDate || '—' }}</dd>
      </dl>
    </UiDrawer>
    <UiDrawer
      v-model:open="reviewOpen"
      title="自评审阅决议"
      width="480"
      :hide-footer="false"
      ok-text="提交决议"
      @ok="submitReview"
    >
      <a-form layout="vertical">
        <a-form-item label="决议" required>
          <a-select v-model:value="reviewForm.reviewDecision">
            <a-select-option value="ACCEPTED">受理（进入现场考查）</a-select-option>
            <a-select-option value="SUPPLEMENT_REQUIRED">需补正</a-select-option>
            <a-select-option value="REJECTED">不通过（关闭周期）</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="reviewForm.reviewDecision === 'SUPPLEMENT_REQUIRED'"
          label="补正截止"
          required
        >
          <a-date-picker
            v-model:value="reviewForm.supplementDeadline"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="审阅意见">
          <a-textarea v-model:value="reviewForm.reviewRemark" :rows="4" />
        </a-form-item>
      </a-form>
    </UiDrawer>
    <UiDrawer
      v-model:open="conclusionOpen"
      title="认证结论登记"
      width="480"
      :hide-footer="false"
      ok-text="登记结论"
      @ok="submitConclusion"
    >
      <a-form layout="vertical">
        <a-form-item label="结论类型" required>
          <a-select v-model:value="conclusionForm.conclusionType">
            <a-select-option value="FULL_6Y">通过（6 年）</a-select-option>
            <a-select-option value="CONDITIONAL_6Y">有条件通过（第 3 年改进到期）</a-select-option>
            <a-select-option value="NOT_PASS">不通过</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="conclusionForm.conclusionType !== 'NOT_PASS'"
          label="有效期起"
          required
        >
          <a-date-picker
            v-model:value="conclusionForm.validFrom"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item v-if="conclusionForm.conclusionType !== 'NOT_PASS'" label="有效期止">
          <a-date-picker
            v-model:value="conclusionForm.validUntil"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item
          v-if="conclusionForm.conclusionType === 'CONDITIONAL_6Y'"
          label="改进材料截止"
          required
        >
          <a-date-picker
            v-model:value="conclusionForm.conditionalDueDate"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="conclusionForm.conclusionRemark" :rows="3" />
        </a-form-item>
      </a-form>
    </UiDrawer>
  </div>
</template>

<style scoped>
.cycle-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cycle-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: 4px;
}
.readiness-panel {
  padding: 14px 16px;
  background: var(--ant-color-warning-bg);
  border: 1px solid var(--ant-color-warning-border);
  border-radius: 4px;
}
.readiness-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.readiness-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 8px;
}
.readiness-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(52, 95, 74, 0.16);
  border-radius: 4px;
}
.readiness-item.is-blocked {
  border-color: var(--ant-color-warning-border);
  background: var(--dp-orange-50);
}
.readiness-item p {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  line-height: 1.5;
}
.banner-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.ml-8 {
  margin-left: 8px;
}
.meta {
  margin-left: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
}
.muted {
  color: rgba(0, 0, 0, 0.35);
}
.w-full {
  width: 100%;
}
.detail-dl {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 8px 12px;
  font-size: 14px;
}
.detail-dl dt {
  color: rgba(0, 0, 0, 0.45);
}
</style>
