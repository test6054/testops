<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCycleVO,
  OnsiteChecklistCategory,
  OnsiteChecklistItemUpdateRequest,
  OnsiteChecklistItemVO,
  OnsiteVisitPlanSaveRequest,
  OnsiteVisitPlanVO,
} from '@/apis/quality/accreditation'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import {
  accreditationApi,
  ONSITE_CHECKLIST_CATEGORY_LABEL,
  ONSITE_CHECKLIST_STATUS_LABEL,
} from '@/apis/quality/accreditation'
import { ArchiveSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
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
  { title: '编码', dataIndex: 'visitCode', key: 'visitCode', width: 110 },
  { title: '标题', dataIndex: 'visitTitle', key: 'visitTitle' },
  { title: '考查期', key: 'visitRange', width: 200 },
  { title: '报告截止', dataIndex: 'reportDueDate', key: 'reportDueDate', width: 110 },
  { title: '清单', key: 'checklist', width: 120 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const checklistColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 80 },
  { title: '类别', dataIndex: 'itemCategory', key: 'itemCategory', width: 140 },
  { title: '检查项', dataIndex: 'itemTitle', key: 'itemTitle' },
  { title: '状态', dataIndex: 'itemStatus', key: 'itemStatus', width: 90 },
  { title: '操作', key: 'actions', width: 100 },
]

const CATEGORY_TABS: { key: '' | OnsiteChecklistCategory, label: string }[] = [
  { key: '', label: '全部' },
  { key: 'FACILITY', label: '设施' },
  { key: 'PAPER_SAMPLE', label: '样本' },
  { key: 'CLASS_OBSERVATION', label: '听课' },
  { key: 'INTERVIEW', label: '访谈' },
  { key: 'DOCUMENT', label: '材料' },
  { key: 'OTHER', label: '其他' },
]

const loading = ref(false)
const plans = ref<OnsiteVisitPlanVO[]>([])
const selectedPlan = ref<OnsiteVisitPlanVO>()
const drawerOpen = ref(false)
const drawerTitle = ref('现场考查计划')
const checklistDrawerOpen = ref(false)
const editingItem = ref<OnsiteChecklistItemVO>()
const checklistCategoryFilter = ref<'' | OnsiteChecklistCategory>('')

const canMutateOnsitePlan = computed(
  () =>
    props.activeCycle?.cycleStatus === 'ACTIVE'
    && props.activeCycle?.currentPhase === 'ONSITE_VISIT',
)

const canCreatePlan = computed(() => canMutateOnsitePlan.value && !!props.activeCycleId)

const checklistProgress = computed(() => {
  const items = selectedPlan.value?.checklistItems || []
  if (items.length === 0) return 0
  const done = items.filter(
    (i) => i.itemStatus === 'COMPLETED' || i.itemStatus === 'NOT_APPLICABLE',
  ).length
  return Math.round((done / items.length) * 100)
})

const filteredChecklistItems = computed(() => {
  const items = selectedPlan.value?.checklistItems || []
  if (!checklistCategoryFilter.value) return items
  return items.filter((i) => i.itemCategory === checklistCategoryFilter.value)
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
  itemStatus: 'PENDING',
  evidenceArchiveId: undefined,
  remark: '',
})

async function loadPlans() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    plans.value = await accreditationApi.onsitePlanList({
      trainingPlanId: props.trainingPlanId,
      programId: props.programId,
      accreditationCycleId: props.activeCycleId,
    })
  } catch (e) {
    showUserError(e)
  } finally {
    loading.value = false
  }
}

async function selectPlan(id: string) {
  try {
    selectedPlan.value = await accreditationApi.onsitePlanDetail(id)
    checklistCategoryFilter.value = ''
  } catch (e) {
    showUserError(e)
  }
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
    message.error('请先创建认证周期')
    return
  }
  if (!canMutateOnsitePlan.value) {
    message.error('仅现场考查阶段可新建考查计划')
    return
  }
  drawerTitle.value = '新建现场考查计划'
  resetPlanForm(accreditationCycleId)
  drawerOpen.value = true
}

function openEdit(record: OnsiteVisitPlanVO) {
  if (!canMutateOnsitePlan.value) {
    message.error('仅现场考查阶段可编辑考查计划')
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
  if (!canMutateOnsitePlan.value) {
    message.error('仅现场考查阶段可维护考查计划')
    return
  }
  if (!form.visitCode.trim() || !form.visitTitle.trim() || !form.visitStart || !form.visitEnd) {
    message.error('请完整填写考查计划信息')
    return
  }
  try {
    if (form.id) {
      await accreditationApi.updateOnsitePlan(form)
      message.success('考查计划已更新')
      if (selectedPlan.value?.id === form.id) await selectPlan(form.id)
    } else {
      const id = await accreditationApi.createOnsitePlan(form)
      message.success('已创建考查计划并预置 10 项 CEEAA 检查清单')
      await selectPlan(id)
    }
    drawerOpen.value = false
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

async function removePlan(id: string) {
  if (!canMutateOnsitePlan.value) {
    message.error('仅现场考查阶段可删除考查计划')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该现场考查计划？' })
  if (!ok) return
  try {
    await accreditationApi.deleteOnsitePlan(id)
    if (selectedPlan.value?.id === id) selectedPlan.value = undefined
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
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
  if (!canMutateOnsitePlan.value) {
    message.error('仅现场考查阶段可更新检查项')
    return
  }
  if (checklistForm.itemStatus === 'COMPLETED' && !checklistForm.evidenceArchiveId) {
    message.error('已完成检查项必须关联证据归档')
    return
  }
  if (checklistForm.itemStatus === 'NOT_APPLICABLE' && !checklistForm.remark?.trim()) {
    message.error('不适用检查项必须填写说明')
    return
  }
  try {
    await accreditationApi.updateChecklistItem({
      id: checklistForm.id,
      itemStatus: checklistForm.itemStatus,
      evidenceArchiveId: checklistForm.evidenceArchiveId || undefined,
      remark: checklistForm.remark || undefined,
    })
    message.success('检查项已更新')
    checklistDrawerOpen.value = false
    if (selectedPlan.value) await selectPlan(selectedPlan.value.id)
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

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
      <UiButton variant="primary" :disabled="!canCreatePlan" @click="openCreate">
        新建考查计划
      </UiButton>
    </div>
    <UiDataTable :columns="planColumns" :data-source="plans" :loading="loading" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'visitRange'">
          {{ record.visitStart }} ~ {{ record.visitEnd }}
        </template>
        <template v-else-if="column.key === 'checklist'">
          <a-progress
            :percent="
              record.totalChecklistCount
                ? Math.round(
                  ((record.completedChecklistCount ?? 0) / record.totalChecklistCount) * 100,
                )
                : 0
            "
            size="small"
          />
          <span class="checklist-count">
            {{ record.completedChecklistCount ?? 0 }}/{{ record.totalChecklistCount ?? 0 }}
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton size="sm" variant="ghost" @click="selectPlan(record.id)">清单</UiButton>
          <UiButton size="sm" variant="outline" :disabled="!canMutateOnsitePlan" @click="openEdit(record)">
            编辑
          </UiButton>
          <UiButton
            size="sm"
            status="danger"
            variant="ghost"
            :disabled="!canMutateOnsitePlan"
            @click="removePlan(record.id)"
          >
            删除
          </UiButton>
        </template>
      </template>
      <template #empty>
        <UiEmpty description="暂无现场考查计划" />
      </template>
    </UiDataTable>
    <div v-if="selectedPlan?.checklistItems?.length" class="checklist-block">
      <div class="checklist-head">
        <h4>{{ selectedPlan.visitTitle }} — CEEAA 检查清单</h4>
        <span class="checklist-meta">报告截止 {{ selectedPlan.reportDueDate }}</span>
      </div>
      <a-progress :percent="checklistProgress" size="small" class="checklist-progress" />
      <a-radio-group
        v-model:value="checklistCategoryFilter"
        button-style="solid"
        size="small"
        class="cat-filter"
      >
        <a-radio-button v-for="tab in CATEGORY_TABS" :key="tab.key || 'all'" :value="tab.key">
          {{ tab.label }}
        </a-radio-button>
      </a-radio-group>
      <UiDataTable
        :columns="checklistColumns"
        :data-source="filteredChecklistItems"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'itemCategory'">
            {{
              strictEnumLabel(
                ONSITE_CHECKLIST_CATEGORY_LABEL,
                record.itemCategory,
                '现场考查清单类别',
              )
            }}
          </template>
          <template v-else-if="column.key === 'itemStatus'">
            {{
              strictEnumLabel(ONSITE_CHECKLIST_STATUS_LABEL, record.itemStatus, '现场考查清单状态')
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="outline"
              :disabled="!canMutateOnsitePlan"
              @click="openChecklistItem(record)"
            >
              更新
            </UiButton>
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
      @ok="submitPlan"
    >
      <a-form layout="vertical">
        <a-form-item label="计划编码" required>
          <a-input v-model:value="form.visitCode" :disabled="!!form.id" />
        </a-form-item>
        <a-form-item label="计划标题" required>
          <a-input v-model:value="form.visitTitle" />
        </a-form-item>
        <a-form-item label="考查开始" required>
          <a-date-picker v-model:value="form.visitStart" value-format="YYYY-MM-DD" class="w-full" />
        </a-form-item>
        <a-form-item label="考查结束" required>
          <a-date-picker v-model:value="form.visitEnd" value-format="YYYY-MM-DD" class="w-full" />
        </a-form-item>
        <a-form-item label="组长姓名">
          <a-input v-model:value="form.leadExpertName" />
        </a-form-item>
        <a-form-item label="专家组说明">
          <a-textarea v-model:value="form.expertGroupRemark" :rows="3" />
        </a-form-item>
        <p class="hint">报告截止日将自动设为考查结束日 + 15 天。</p>
      </a-form>
    </UiDrawer>
    <UiDrawer
      v-model:open="checklistDrawerOpen"
      title="更新检查项"
      width="480"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitChecklistItem"
    >
      <template v-if="editingItem">
        <p class="item-title">{{ editingItem.itemTitle }}</p>
        <p class="item-desc">{{ editingItem.itemDescription }}</p>
        <a-form layout="vertical">
          <a-form-item label="状态" required>
            <a-select v-model:value="checklistForm.itemStatus">
              <a-select-option value="PENDING">待准备</a-select-option>
              <a-select-option value="IN_PROGRESS">准备中</a-select-option>
              <a-select-option value="COMPLETED">已完成</a-select-option>
              <a-select-option value="NOT_APPLICABLE">不适用</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="证据归档" :required="checklistForm.itemStatus === 'COMPLETED'">
            <ArchiveSelector v-model:value="checklistForm.evidenceArchiveId" />
          </a-form-item>
          <a-form-item label="备注" :required="checklistForm.itemStatus === 'NOT_APPLICABLE'">
            <a-textarea v-model:value="checklistForm.remark" :rows="3" />
          </a-form-item>
        </a-form>
      </template>
    </UiDrawer>
  </div>
</template>

<style scoped>
.onsite-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 8px;
}
.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}
.checklist-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.checklist-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.checklist-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.checklist-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.checklist-progress {
  max-width: 360px;
}
.cat-filter {
  margin-bottom: 4px;
}
.checklist-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-left: 8px;
}
.item-title {
  font-weight: 600;
  margin: 0 0 4px;
}
.item-desc {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  margin: 0 0 12px;
}
.w-full {
  width: 100%;
}
</style>
