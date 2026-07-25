<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCycleVO,
  OnsiteChecklistItemUpdateRequest,
  OnsiteChecklistItemVO,
  OnsiteVisitPlanSaveRequest,
  OnsiteVisitPlanVO,
} from '@/apis/quality/accreditation'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import {
  accreditationApi,
  AccreditationCycleStatusCode,
  OnsiteChecklistCategoryCode,
  OnsiteChecklistCategoryDescription,
  OnsiteChecklistItemStatusCode,
  OnsiteChecklistItemStatusDescription,
} from '@/apis/quality/accreditation'
import { ArchiveSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiRadio from '@/components/ui-guide/ui/UiRadio.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  activeCycle?: AccreditationCycleVO
  activeCycleId?: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const planColumns: ColumnsType = [
  { title: '编码', dataIndex: 'visitCode', key: 'visitCode', width: 110, fixed: 'left' },
  { title: '标题', dataIndex: 'visitTitle', key: 'visitTitle' },
  { title: '考查期', key: 'visitRange', width: 200 },
  { title: '报告截止', dataIndex: 'reportDueDate', key: 'reportDueDate', width: 110 },
  { title: '清单', key: 'checklist', width: 120 },
  { title: '操作', key: 'actions', width: 200 },
]

const checklistColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 80, fixed: 'left' },
  { title: '类别', dataIndex: 'itemCategory', key: 'itemCategory', width: 140 },
  { title: '检查项', dataIndex: 'itemTitle', key: 'itemTitle' },
  { title: '状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 90 },
  { title: '操作', key: 'actions', width: 100 },
]

const CATEGORY_TABS: { key: '' | OnsiteChecklistCategoryCode, label: string }[] = [
  { key: '', label: '全部' },
  { key: OnsiteChecklistCategoryCode.FACILITY, label: '设施' },
  { key: OnsiteChecklistCategoryCode.PAPER_SAMPLE, label: '样本' },
  { key: OnsiteChecklistCategoryCode.CLASS_OBSERVATION, label: '听课' },
  { key: OnsiteChecklistCategoryCode.INTERVIEW, label: '访谈' },
  { key: OnsiteChecklistCategoryCode.DOCUMENT, label: '材料' },
  { key: OnsiteChecklistCategoryCode.OTHER, label: '其他' },
]

const loading = ref(false)
const submitting = ref(false)
const plans = ref<OnsiteVisitPlanVO[]>([])
const planTotal = ref(0)
const planPageNum = ref(1)
const planPageSize = ref(20)
const selectedPlan = ref<OnsiteVisitPlanVO>()
const checklistRows = ref<OnsiteChecklistItemVO[]>([])
const checklistTotal = ref(0)
const checklistPageNum = ref(1)
const checklistPageSize = ref(20)
const checklistLoading = ref(false)
const drawerOpen = ref(false)
const drawerTitle = ref('现场考查计划')
const checklistDrawerOpen = ref(false)
const editingItem = ref<OnsiteChecklistItemVO>()
const checklistCategoryFilter = ref<'' | OnsiteChecklistCategoryCode>('')

const canMutateOnsitePlan = computed(
  () =>
    props.activeCycle?.cycleStatus === AccreditationCycleStatusCode.ACTIVE
    && props.activeCycle?.currentPhase === 'ONSITE_VISIT',
)

const canCreatePlan = computed(() => canMutateOnsitePlan.value && !!props.activeCycleId)

const checklistProgress = computed(() => {
  const total = selectedPlan.value?.totalChecklistCount ?? 0
  const done = selectedPlan.value?.completedChecklistCount ?? 0
  if (total === 0) return 0
  return Math.round((done / total) * 100)
})

const form = reactive<OnsiteVisitPlanSaveRequest>({
  programId: '',
  trainingPlanId: '',
  accreditationCycleId: '',
  visitCode: '',
  visitTitle: '',
  visitStart: '',
  visitEnd: '',
})

const checklistForm = reactive<OnsiteChecklistItemUpdateRequest>({
  id: '',
  itemStatus: OnsiteChecklistItemStatusCode.PENDING,
  evidenceArchiveId: undefined,
  remark: '',
})

async function loadPlans() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    const page = await accreditationApi.onsitePlanPage({
      trainingPlanId: props.trainingPlanId,
      programId: props.programId,
      accreditationCycleId: props.activeCycleId,
      pageNum: planPageNum.value,
      pageSize: planPageSize.value,
    })
    plans.value = page.list
    planTotal.value = page.total
  } catch (e) {
    showUserError(e, '现场考查计划列表加载失败')
  } finally {
    loading.value = false
  }
}

function handlePlanPageChange(pageEvent: { current: number, pageSize: number }) {
  planPageNum.value = pageEvent.current
  planPageSize.value = pageEvent.pageSize
  void loadPlans()
}

async function selectPlan(id: string) {
  try {
    selectedPlan.value = await accreditationApi.onsitePlanDetail(id)
    checklistCategoryFilter.value = ''
    checklistPageNum.value = 1
    await loadChecklistItems()
  } catch (e) {
    showUserError(e, '现场考查计划详情加载失败')
  }
}

async function loadChecklistItems() {
  if (!selectedPlan.value?.id) {
    checklistRows.value = []
    checklistTotal.value = 0
    return
  }
  checklistLoading.value = true
  try {
    const page = await accreditationApi.onsiteChecklistPage({
      onsiteVisitPlanId: selectedPlan.value.id,
      itemCategory: checklistCategoryFilter.value || undefined,
      pageNum: checklistPageNum.value,
      pageSize: checklistPageSize.value,
    })
    checklistRows.value = page.list
    checklistTotal.value = page.total
  } catch (e) {
    checklistRows.value = []
    checklistTotal.value = 0
    showUserError(e, '现场考查检查清单加载失败')
  } finally {
    checklistLoading.value = false
  }
}

function handleChecklistPageChange(pageEvent: { current: number, pageSize: number }) {
  checklistPageNum.value = pageEvent.current
  checklistPageSize.value = pageEvent.pageSize
  void loadChecklistItems()
}

function resetPlanForm(accreditationCycleId: string) {
  form.id = undefined
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.accreditationCycleId = accreditationCycleId
  form.visitCode = `VISIT-${Date.now()}`
  form.visitTitle = '现场考查计划'
  form.visitStart = ''
  form.visitEnd = ''
  form.leadExpertName = ''
  form.expertGroupRemark = ''
  form.remark = ''
}

function openCreate() {
  const accreditationCycleId = props.activeCycleId
  if (!accreditationCycleId) {
    void message.error('请先创建认证周期')
    return
  }
  if (!canMutateOnsitePlan.value) {
    void message.error('仅现场考查阶段可新建考查计划')
    return
  }
  drawerTitle.value = '新建现场考查计划'
  resetPlanForm(accreditationCycleId)
  drawerOpen.value = true
}

function openEdit(record: OnsiteVisitPlanVO) {
  if (!canMutateOnsitePlan.value) {
    void message.error('仅现场考查阶段可编辑考查计划')
    return
  }
  drawerTitle.value = '编辑现场考查计划'
  form.id = record.id
  form.programId = record.programId
  form.trainingPlanId = record.trainingPlanId
  form.accreditationCycleId = record.accreditationCycleId
  form.visitCode = record.visitCode
  form.visitTitle = record.visitTitle
  form.visitStart = record.visitStart
  form.visitEnd = record.visitEnd
  form.leadExpertName = record.leadExpertName || ''
  form.expertGroupRemark = record.expertGroupRemark || ''
  form.remark = record.remark || ''
  drawerOpen.value = true
}

async function submitPlan() {
  if (submitting.value) {
    return
  }
  if (!canMutateOnsitePlan.value) {
    void message.error('仅现场考查阶段可维护考查计划')
    return
  }
  if (!form.visitCode.trim() || !form.visitTitle.trim() || !form.visitStart || !form.visitEnd) {
    void message.error('请完整填写考查计划信息')
    return
  }
  const request: OnsiteVisitPlanSaveRequest = {
    id: form.id,
    programId: form.programId,
    trainingPlanId: form.trainingPlanId,
    accreditationCycleId: form.accreditationCycleId,
    visitCode: form.visitCode.trim(),
    visitTitle: form.visitTitle.trim(),
    visitStart: form.visitStart,
    visitEnd: form.visitEnd,
    leadExpertName: form.leadExpertName?.trim() || undefined,
    expertGroupRemark: form.expertGroupRemark?.trim() || undefined,
    auditSupervisionId: form.auditSupervisionId,
    remark: form.remark?.trim() || undefined,
  }
  submitting.value = true
  try {
    if (form.id) {
      await accreditationApi.updateOnsitePlan(request)
      void message.success('考查计划已更新')
      if (selectedPlan.value?.id === form.id) await selectPlan(form.id)
    } else {
      const id = await accreditationApi.createOnsitePlan(request)
      void message.success('已创建考查计划并预置十项工程教育认证检查清单')
      await selectPlan(id)
    }
    drawerOpen.value = false
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '现场考查计划保存失败')
  } finally {
    submitting.value = false
  }
}

async function removePlan(id: string) {
  if (submitting.value) {
    return
  }
  if (!canMutateOnsitePlan.value) {
    void message.error('仅现场考查阶段可删除考查计划')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该现场考查计划？' })
  if (!ok) return
  submitting.value = true
  try {
    await accreditationApi.deleteOnsitePlan(id)
    if (selectedPlan.value?.id === id) selectedPlan.value = undefined
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '现场考查计划删除失败')
  } finally {
    submitting.value = false
  }
}

function handleOnsitePlanRowAction(key: string, record: OnsiteVisitPlanVO) {
  if (key === 'checklist') void selectPlan(record.id)
  else if (key === 'edit') openEdit(record)
  else if (key === 'delete') void removePlan(record.id)
}

function openChecklistItem(item: OnsiteChecklistItemVO) {
  editingItem.value = item
  checklistForm.id = item.id
  checklistForm.itemStatus = item.itemStatus
  checklistForm.evidenceArchiveId = item.evidenceArchiveId
  checklistForm.remark = item.remark || ''
  checklistDrawerOpen.value = true
}

async function submitChecklistItem() {
  if (submitting.value) {
    return
  }
  if (!canMutateOnsitePlan.value) {
    void message.error('仅现场考查阶段可更新检查项')
    return
  }
  if (
    checklistForm.itemStatus === OnsiteChecklistItemStatusCode.COMPLETED
    && !checklistForm.evidenceArchiveId
  ) {
    void message.error('已完成检查项必须关联证据归档')
    return
  }
  if (
    checklistForm.itemStatus === OnsiteChecklistItemStatusCode.NOT_APPLICABLE
    && !checklistForm.remark?.trim()
  ) {
    void message.error('不适用检查项必须填写说明')
    return
  }
  submitting.value = true
  try {
    const request: OnsiteChecklistItemUpdateRequest = {
      id: checklistForm.id,
      itemStatus: checklistForm.itemStatus,
      evidenceArchiveId: checklistForm.evidenceArchiveId || undefined,
      remark: checklistForm.remark?.trim() || undefined,
    }
    await accreditationApi.updateChecklistItem(request)
    void message.success('检查项已更新')
    checklistDrawerOpen.value = false
    if (selectedPlan.value) await selectPlan(selectedPlan.value.id)
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '现场考查检查项更新失败')
  } finally {
    submitting.value = false
  }
}

watch(checklistCategoryFilter, () => {
  checklistPageNum.value = 1
  void loadChecklistItems()
})

watch([() => props.trainingPlanId, () => props.activeCycleId], loadPlans, { immediate: true })

defineExpose({ openCreate, loadPlans })
</script>

<template>
  <div class="onsite-panel">
    <p v-if="!canCreatePlan" class="hint">
      {{
        activeCycleId
          ? '当前认证阶段不可维护现场考查计划；进入现场考查阶段后可新建考查计划。'
          : '请先创建认证周期；进入现场考查阶段后可新建考查计划。'
      }}
    </p>
    <div class="toolbar">
      <UiButton size="sm" variant="primary" :disabled="!canCreatePlan" @click="openCreate">
        新建考查计划
      </UiButton>
    </div>
    <UiDataTable
      pagination-mode="server"
      v-model:current="planPageNum"
      v-model:page-size="planPageSize"
      :columns="planColumns"
      :data-source="plans"
      :loading="loading"
      row-key="id"
      :total="planTotal"
      @page-change="handlePlanPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'visitRange'">
          {{ record.visitStart }} ~ {{ record.visitEnd }}
        </template>
        <template v-else-if="column.key === 'checklist'">
          <UiProgressBar
            :percent="
              record.totalChecklistCount
                ? Math.round(
                  ((record.completedChecklistCount ?? 0) / record.totalChecklistCount) * 100,
                )
                : 0
            "
            size="sm"
            :show-label="false"
          />
          <span class="checklist-count">
            {{ record.completedChecklistCount ?? 0 }}/{{ record.totalChecklistCount ?? 0 }}
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="[
              { key: 'checklist', label: '清单' },
              { key: 'edit', label: '编辑', disabled: !canMutateOnsitePlan },
              { key: 'delete', label: '删除', tone: 'danger', disabled: !canMutateOnsitePlan },
            ]"
            split
            @action="(key) => handleOnsitePlanRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <UiEmpty size="sm" description="暂无现场考查计划" />
      </template>
    </UiDataTable>
    <div v-if="selectedPlan" class="checklist-block">
      <div class="checklist-head">
        <h4>{{ selectedPlan.visitTitle }} — CEEAA 检查清单</h4>
        <span class="checklist-meta">报告截止 {{ selectedPlan.reportDueDate }}</span>
      </div>
      <UiProgressBar
        :percent="checklistProgress"
        size="sm"
        class="checklist-progress"
        :show-label="false"
      />
      <UiRadioGroup v-model="checklistCategoryFilter" size="sm" class="cat-filter">
        <UiRadio v-for="tab in CATEGORY_TABS" :key="tab.key || 'all'" :value="tab.key">
          {{ tab.label }}
        </UiRadio>
      </UiRadioGroup>
      <UiDataTable
        pagination-mode="server"
        v-model:current="checklistPageNum"
        v-model:page-size="checklistPageSize"
        :columns="checklistColumns"
        :data-source="checklistRows"
        :loading="checklistLoading"
        row-key="id"
        size="small"
        :total="checklistTotal"
        @page-change="handleChecklistPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemCategory'">
            {{
              strictEnumLabel(
                OnsiteChecklistCategoryDescription,
                record.itemCategory,
                '现场考查清单类别',
              )
            }}
          </template>
          <template v-else-if="column.key === 'itemStatus'">
            {{
              strictEnumLabel(
                OnsiteChecklistItemStatusDescription,
                record.itemStatus,
                '现场考查清单状态',
              )
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[{ key: 'update', label: '更新', disabled: !canMutateOnsitePlan }]"
              split
              @action="() => openChecklistItem(record)"
            />
          </template>
        </template>
      </UiDataTable>
    </div>
    <UiDrawer
      v-model:open="drawerOpen"
      :title="drawerTitle"
      width="480"
      :hide-footer="false"
      ok-text="保存"
      :confirm-loading="submitting"
      @ok="submitPlan"
    >
      <UiForm layout="vertical">
        <UiFormItem label="计划编码" required>
          <UiInput size="sm" v-model="form.visitCode" :disabled="!!form.id" />
        </UiFormItem>
        <UiFormItem label="计划标题" required>
          <UiInput size="sm" v-model="form.visitTitle" />
        </UiFormItem>
        <UiFormItem label="考查开始" required>
          <UiDatePicker
            size="sm"
            v-model="form.visitStart"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="考查结束" required>
          <UiDatePicker
            size="sm"
            v-model="form.visitEnd"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="组长姓名">
          <UiInput size="sm" v-model="form.leadExpertName" />
        </UiFormItem>
        <UiFormItem label="专家组说明">
          <UiTextarea size="sm" v-model="form.expertGroupRemark" :rows="3" />
        </UiFormItem>
        <p class="hint">报告截止日将自动设为考查结束日 + 15 天。</p>
      </UiForm>
    </UiDrawer>
    <UiDrawer
      v-model:open="checklistDrawerOpen"
      title="更新检查项"
      width="480"
      :hide-footer="false"
      ok-text="保存"
      :confirm-loading="submitting"
      @ok="submitChecklistItem"
    >
      <template v-if="editingItem">
        <p class="item-title">{{ editingItem.itemTitle }}</p>
        <p class="item-desc">{{ editingItem.itemDescription }}</p>
        <UiForm layout="vertical">
          <UiFormItem label="状态" required>
            <UiSelect
              v-model="checklistForm.itemStatus"
              size="sm"
              :options="[
                { value: OnsiteChecklistItemStatusCode.PENDING, label: '待准备' },
                { value: OnsiteChecklistItemStatusCode.IN_PROGRESS, label: '准备中' },
                { value: OnsiteChecklistItemStatusCode.COMPLETED, label: '已完成' },
                { value: OnsiteChecklistItemStatusCode.NOT_APPLICABLE, label: '不适用' },
              ]"
            />
          </UiFormItem>
          <UiFormItem
            label="证据归档"
            :required="checklistForm.itemStatus === OnsiteChecklistItemStatusCode.COMPLETED"
          >
            <ArchiveSelector v-model:value="checklistForm.evidenceArchiveId" />
          </UiFormItem>
          <UiFormItem
            label="备注"
            :required="checklistForm.itemStatus === OnsiteChecklistItemStatusCode.NOT_APPLICABLE"
          >
            <UiTextarea size="sm" v-model="checklistForm.remark" :rows="3" />
          </UiFormItem>
        </UiForm>
      </template>
    </UiDrawer>
  </div>
</template>

<style scoped>
.onsite-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.hint {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  margin: 0;
}
.checklist-block {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}
.checklist-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component);
}
.checklist-head h4 {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.checklist-meta {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
.checklist-progress {
  max-width: 360px;
}
.cat-filter {
  margin-bottom: var(--dp-space-component-xs);
}
.checklist-count {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  margin-left: var(--dp-space-component-tight);
}
.item-title {
  font-weight: 600;
  margin: 0 0 var(--dp-space-component-xs);
}
.item-desc {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
  margin: 0 0 var(--dp-space-component);
}
.w-full {
  width: 100%;
}
</style>
