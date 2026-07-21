<script setup lang="ts">
import type { MenuInfo } from 'ant-design-vue/es/menu/src/interface'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCockpitVO,
  AccreditationConclusionRegisterRequest,
  AccreditationCyclePhaseCode,
  AccreditationCycleSaveRequest,
  AccreditationCycleVO,
  SelfAssessmentReviewDecisionRequest,
} from '@/apis/quality/accreditation'
import {
  accreditationApi,
  AccreditationConclusionTypeCode,
  AccreditationConclusionTypeDescription,
  AccreditationCyclePhaseDescription,
  AccreditationCycleStatusDescription,
  SelfAssessmentReviewDecisionCode,
} from '@/apis/quality/accreditation'
import type { AccreditationStandardVO } from '@/apis/quality/accreditation-standard'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  canDeleteCycle,
  canEditCycle,
  canEditSelfAssessmentSection,
  canRecordApplication,
  canRegisterConclusion,
  canReview,
  canSubmitSelfAssessment,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  cockpit?: AccreditationCockpitVO
}>()

const emit = defineEmits<{ refresh: []; 'go-ai-report': [] }>()

type AccreditationCycleMenuAction = 'application' | 'self' | 'review' | 'conclusion' | 'delete'

interface AccreditationCycleMenuItem {
  key: AccreditationCycleMenuAction
  label: string
  danger?: boolean
}

const columns: ColumnsType<AccreditationCycleVO> = [
  { title: '周期编码', dataIndex: 'cycleCode', key: 'cycleCode', width: 120, fixed: 'left' },
  { title: '周期名称', dataIndex: 'cycleName', key: 'cycleName' },
  { title: '阶段', dataIndex: 'currentPhase', key: 'currentPhase', width: 108 },
  { title: '状态', dataIndex: 'cycleStatus', key: 'cycleStatus', width: 88 },
  { title: '结论', dataIndex: 'conclusionType', key: 'conclusionType', width: 108 },
  { title: '操作', key: 'actions', width: 220 },
]

const loading = ref(false)
const cycles = ref<AccreditationCycleVO[]>([])
const standards = ref<AccreditationStandardVO[]>([])
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
  Pick<
    SelfAssessmentReviewDecisionRequest,
    'reviewDecision' | 'reviewRemark' | 'supplementDeadline'
  >
>({
  reviewDecision: SelfAssessmentReviewDecisionCode.ACCEPTED,
  reviewRemark: '',
  supplementDeadline: '',
})

const conclusionForm = reactive<
  Pick<
    AccreditationConclusionRegisterRequest,
    'conclusionType' | 'validFrom' | 'validUntil' | 'conditionalDueDate' | 'conclusionRemark'
  >
>({
  conclusionType: AccreditationConclusionTypeCode.FULL_6Y,
  validFrom: '',
  validUntil: '',
  conditionalDueDate: '',
  conclusionRemark: '',
})

const activeCycle = computed(() => props.cockpit?.activeCycle)

const canEditSelfAssessment = computed(() => canEditSelfAssessmentSection(activeCycle.value))

const conclusionReadinessItems = computed(() => props.cockpit?.conclusionReadinessItems || [])

const blockedConclusionItems = computed(() =>
  conclusionReadinessItems.value.filter((item) => !item.ready),
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

async function loadStandards(keyword?: string) {
  try {
    const page = await accreditationStandardApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      enabled: true,
      keyword: keyword?.trim() || undefined,
    })
    standards.value = page.list
  } catch (e) {
    standards.value = []
    showUserError(e, '认证标准列表加载失败')
  }
}

async function loadCycles() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    const page = await accreditationApi.cyclePage({
      trainingPlanId: props.trainingPlanId,
      pageNum: 1,
      pageSize: 50,
    })
    cycles.value = page.list
  } catch (e) {
    showUserError(e, '认证周期列表加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  form.id = undefined
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.accreditationStandardId = standards.value[0]?.id
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
  form.accreditationStandardId = row.accreditationStandardId
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
    showUserError(e, '认证周期详情加载失败')
  }
}

async function submitCycle() {
  if (!form.cycleCode.trim() || !form.cycleName.trim()) {
    void message.error('请填写周期编码与名称')
    return
  }
  if (!form.id && !form.accreditationStandardId) {
    void message.error('请选择绑定的认证标准')
    return
  }
  const request: AccreditationCycleSaveRequest = {
    id: form.id,
    programId: form.programId,
    trainingPlanId: form.trainingPlanId,
    accreditationStandardId: form.accreditationStandardId,
    cycleCode: form.cycleCode.trim(),
    cycleName: form.cycleName.trim(),
    remark: form.remark?.trim() || undefined,
    onsiteVisitStart: form.onsiteVisitStart,
    onsiteVisitEnd: form.onsiteVisitEnd,
    onsiteReportDueDate: form.onsiteReportDueDate,
  }
  try {
    if (form.id) {
      await accreditationApi.cycleUpdate(request)
    } else {
      await accreditationApi.cycleCreate(request)
    }
    void message.success('已保存')
    drawerOpen.value = false
    await loadCycles()
    emit('refresh')
  } catch (e) {
    showUserError(e, '认证周期保存失败')
  }
}

async function runAction(fn: () => Promise<void>, confirmTitle?: string) {
  if (confirmTitle) {
    const ok = await confirmAsync({ title: confirmTitle })
    if (!ok) return
  }
  try {
    await fn()
    void message.success('操作成功')
    await loadCycles()
    emit('refresh')
  } catch (e) {
    showUserError(e, '认证周期操作失败')
  }
}

async function removeCycle(row: AccreditationCycleVO) {
  const ok = await confirmAsync({ title: '确认删除该认证周期？删除后不可恢复。' })
  if (!ok) return
  await runAction(() => accreditationApi.cycleDelete(row.id))
}

function openReview(row: AccreditationCycleVO) {
  activeRow.value = row
  reviewForm.reviewDecision = SelfAssessmentReviewDecisionCode.ACCEPTED
  reviewForm.reviewRemark = ''
  reviewForm.supplementDeadline = ''
  reviewOpen.value = true
}

async function submitReview() {
  if (!activeRow.value) return
  if (
    reviewForm.reviewDecision === SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED &&
    !reviewForm.supplementDeadline
  ) {
    void message.error('需补正时必须填写补正截止日期')
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
  if (!canRegisterConclusion(row, props.cockpit)) {
    void message.error('认证结论登记前置条件未全部就绪，请先处理阻断项')
    return
  }
  if (blockedConclusionItems.value.length) {
    void message.error('认证结论登记前置条件未全部就绪，请先处理阻断项')
    return
  }
  activeRow.value = row
  conclusionForm.conclusionType = AccreditationConclusionTypeCode.FULL_6Y
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
    void message.error('请填写有效期起')
    return
  }
  if (conclusionForm.conclusionType === 'CONDITIONAL_6Y' && !conclusionForm.conditionalDueDate) {
    void message.error('有条件通过须填写第 3 年改进材料截止日')
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

function phaseLabel(phase: AccreditationCyclePhaseCode) {
  return strictEnumLabel(AccreditationCyclePhaseDescription, phase, '认证周期阶段')
}

function buildMenuItems(row: AccreditationCycleVO): AccreditationCycleMenuItem[] {
  const items: AccreditationCycleMenuItem[] = []
  if (canRecordApplication(row) && !row.applicationRecordedTime) {
    items.push({ key: 'application', label: '登记申请书提交' })
  }
  if (canSubmitSelfAssessment(row)) {
    items.push({ key: 'self', label: '提交自评报告' })
  }
  if (canReview(row)) {
    items.push({ key: 'review', label: '自评审阅决议' })
  }
  if (canRegisterConclusion(row, props.cockpit)) {
    items.push({ key: 'conclusion', label: '登记认证结论' })
  }
  if (canDeleteCycle(row)) {
    items.push({ key: 'delete', label: '删除周期', danger: true })
  }
  return items
}

function buildCycleRowActions(record: AccreditationCycleVO): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: '详情' },
    { key: 'edit', label: '编辑', hidden: !canEditCycle(record) },
    ...buildMenuItems(record).map((item) => ({
      key: item.key,
      label: item.label,
      tone: item.danger ? ('danger' as const) : ('default' as const),
    })),
  ]
}

async function handleCycleRowAction(key: string, record: AccreditationCycleVO) {
  if (key === 'detail') {
    openDetail(record)
    return
  }
  if (key === 'edit') {
    openEdit(record)
    return
  }
  await handleCycleMenuClick(record, { key } as MenuInfo)
}

async function handleCycleMenuClick(row: AccreditationCycleVO, event: MenuInfo) {
  if (typeof event.key !== 'string') {
    showFormValidationMessage('流程操作无效，请重新选择')
    return
  }
  const matchedItem = buildMenuItems(row).find((item) => item.key === event.key)
  if (!matchedItem) {
    showFormValidationMessage('当前周期不可执行该流程操作')
    return
  }
  if (matchedItem.key === 'application') {
    await runAction(() => accreditationApi.recordApplication(row.id), '确认登记申请书已提交？')
    return
  }
  if (matchedItem.key === 'self') {
    if (!canSubmitSelfAssessment(row)) {
      void message.error('请先登记申请书提交，并确保自评八节内容就绪后再提交')
      return
    }
    await runAction(
      () => accreditationApi.submitSelfAssessment(row.id),
      '确认提交自评报告？提交后进入自评审阅阶段。',
    )
    return
  }
  if (matchedItem.key === 'review') {
    if (!canReview(row)) {
      void message.error('当前周期不可登记自评审阅决议')
      return
    }
    openReview(row)
    return
  }
  if (matchedItem.key === 'conclusion') {
    if (!canRegisterConclusion(row, props.cockpit)) {
      void message.error('认证结论登记前置条件未全部就绪，请先处理阻断项')
      return
    }
    openConclusion(row)
    return
  }
  if (matchedItem.key === 'delete') {
    await removeCycle(row)
  }
}

watch(
  () => props.trainingPlanId,
  () => {
    void loadCycles()
    void loadStandards()
  },
  { immediate: true },
)

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
        <UiButton
          size="sm"
          variant="outline"
          :disabled="!canEditSelfAssessment"
          @click="emit('go-ai-report')"
        >
          AI 生成自评报告
        </UiButton>
        <UiButton size="sm" @click="openDetail(activeCycle)">周期详情</UiButton>
      </div>
    </div>
    <div v-if="conclusionReadinessItems.length" class="readiness-panel">
      <div class="readiness-header">
        <strong>结论登记前置条件</strong>
        <span class="muted">
          {{
            blockedConclusionItems.length ? `阻断 ${blockedConclusionItems.length} 项` : '全部就绪'
          }}
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
            strictEnumLabel(AccreditationCycleStatusDescription, record.cycleStatus, '认证周期状态')
          }}
        </template>
        <template v-else-if="column.key === 'conclusionType'">
          <span v-if="record.conclusionType">
            {{
              strictEnumLabel(
                AccreditationConclusionTypeDescription,
                record.conclusionType,
                '认证结论类型',
              )
            }}
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildCycleRowActions(record)"
            split
            @action="(key) => handleCycleRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <UiEmpty size="sm" description="暂无认证周期" />
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
      <UiForm layout="vertical">
        <UiFormItem v-if="!form.id" label="绑定认证标准" required>
          <UiSelect
            size="sm"
            v-model="form.accreditationStandardId"
            placeholder="请选择已启用的认证标准"
            :options="
              standards.map((item) => ({
                value: item.id,
                label: `${item.standardCode} · ${item.standardName}`,
              }))
            "
          />
        </UiFormItem>
        <UiFormItem v-else-if="form.accreditationStandardId" label="绑定认证标准">
          <UiInput
            size="sm"
            :value="
              standards.find((item) => item.id === form.accreditationStandardId)?.standardName ||
              form.accreditationStandardId
            "
            disabled
          />
        </UiFormItem>
        <UiFormItem label="周期编码" required>
          <UiInput size="sm" v-model="form.cycleCode" :disabled="!!form.id" />
        </UiFormItem>
        <UiFormItem label="周期名称" required>
          <UiInput size="sm" v-model="form.cycleName" />
        </UiFormItem>
        <UiFormItem label="现场考查开始">
          <UiDatePicker
            size="sm"
            v-model="form.onsiteVisitStart"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="现场考查结束">
          <UiDatePicker
            size="sm"
            v-model="form.onsiteVisitEnd"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="form.remark" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
    <UiDrawer v-model:open="detailOpen" title="认证周期详情" width="520" hide-footer>
      <dl v-if="detailRecord" class="detail-dl">
        <dt>阶段</dt>
        <dd>{{ phaseLabel(detailRecord.currentPhase) }}</dd>
        <dt>状态</dt>
        <dd>
          {{
            strictEnumLabel(
              AccreditationCycleStatusDescription,
              detailRecord.cycleStatus,
              '认证周期状态',
            )
          }}
        </dd>
        <dt>申请登记</dt>
        <dd>{{ detailRecord.applicationRecordedTime || '—' }}</dd>
        <dt>自评提交</dt>
        <dd>{{ detailRecord.selfAssessmentSubmittedTime || '—' }}</dd>
        <dt>审阅决议</dt>
        <dd>{{ detailRecord.selfAssessmentReviewDecision || '—' }}</dd>
        <dt>审阅意见</dt>
        <dd>{{ detailRecord.selfAssessmentReviewRemark || '—' }}</dd>
        <dt>结论</dt>
        <dd>
          {{
            detailRecord.conclusionType
              ? strictEnumLabel(
                  AccreditationConclusionTypeDescription,
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
      <UiForm layout="vertical">
        <UiFormItem label="决议" required>
          <UiSelect
            v-model="reviewForm.reviewDecision"
            size="sm"
            :options="[
              { value: 'ACCEPTED', label: '受理（进入现场考查）' },
              { value: 'SUPPLEMENT_REQUIRED', label: '需补正' },
              { value: 'REJECTED', label: '不通过（关闭周期）' },
            ]"
          />
        </UiFormItem>
        <UiFormItem
          v-if="reviewForm.reviewDecision === 'SUPPLEMENT_REQUIRED'"
          label="补正截止"
          required
        >
          <UiDatePicker
            size="sm"
            v-model="reviewForm.supplementDeadline"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="审阅意见">
          <UiTextarea size="sm" v-model="reviewForm.reviewRemark" :rows="4" />
        </UiFormItem>
      </UiForm>
    </UiDrawer>
    <UiDrawer
      v-model:open="conclusionOpen"
      title="认证结论登记"
      width="480"
      :hide-footer="false"
      ok-text="登记结论"
      @ok="submitConclusion"
    >
      <UiForm layout="vertical">
        <UiFormItem label="结论类型" required>
          <UiSelect
            v-model="conclusionForm.conclusionType"
            size="sm"
            :options="[
              { value: 'FULL_6Y', label: '通过（6 年）' },
              { value: 'CONDITIONAL_6Y', label: '有条件通过（第 3 年改进到期）' },
              { value: 'NOT_PASS', label: '不通过' },
            ]"
          />
        </UiFormItem>
        <UiFormItem v-if="conclusionForm.conclusionType !== 'NOT_PASS'" label="有效期起" required>
          <UiDatePicker
            size="sm"
            v-model="conclusionForm.validFrom"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem v-if="conclusionForm.conclusionType !== 'NOT_PASS'" label="有效期止">
          <UiDatePicker
            size="sm"
            v-model="conclusionForm.validUntil"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem
          v-if="conclusionForm.conclusionType === 'CONDITIONAL_6Y'"
          label="改进材料截止"
          required
        >
          <UiDatePicker
            size="sm"
            v-model="conclusionForm.conditionalDueDate"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="conclusionForm.conclusionRemark" :rows="3" />
        </UiFormItem>
      </UiForm>
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
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: 4px;
}
.readiness-panel {
  padding: 14px 16px;
  background: var(--dp-warning-bg);
  border: 1px solid var(--dp-warning-border);
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
  border: 1px solid color-mix(in srgb, var(--dp-success) 16%, transparent);
  border-radius: 4px;
}
.readiness-item.is-blocked {
  border-color: var(--dp-warning-border);
  background: var(--dp-orange-50);
}
.readiness-item p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--dp-text-tertiary);
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
  color: var(--dp-text-tertiary);
}
.muted {
  color: var(--dp-text-muted);
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
  color: var(--dp-text-tertiary);
}
</style>
