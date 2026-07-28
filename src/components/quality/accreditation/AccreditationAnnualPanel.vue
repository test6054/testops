<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AnnualEvaluationPlanCourseVO,
  AnnualEvaluationPlanSaveRequest,
  AnnualEvaluationPlanVO,
} from '@/apis/quality/accreditation'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality/accreditation'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { canMutateAnnualEvaluationPlan } from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  AnnualEvaluationPlanStatusCode,
  AnnualEvaluationPlanStatusDescription,
} from '@/types/enums/annual-evaluation-plan-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  maintenanceCycleId?: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const planColumns: ColumnsType = [
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 80, fixed: 'left' },
  { title: '认证周期', dataIndex: 'accreditationCycleName', key: 'accreditationCycleName', width: 190 },
  { title: '计划标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '状态', dataIndex: 'planStatus', key: 'planStatus', width: 90 },
  { title: '须评价', dataIndex: 'requiredCourseCount', key: 'requiredCourseCount', width: 80 },
  { title: '已完成', dataIndex: 'completedCourseCount', key: 'completedCourseCount', width: 80 },
  { title: '覆盖率', key: 'coverage', width: 200 },
  { title: '操作', key: 'actions', width: 240 },
]

const courseColumns: ColumnsType = [
  { title: '课程编码', dataIndex: 'courseCode', key: 'courseCode', width: 120, fixed: 'left' },
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '须评价', key: 'required', width: 80 },
  { title: '已完成', key: 'completed', width: 80 },
  { title: '操作', key: 'actions', width: 100 },
]

const loading = ref(false)
const submitting = ref(false)
const plans = ref<AnnualEvaluationPlanVO[]>([])
const planTotal = ref(0)
const planPageNum = ref(1)
const planPageSize = ref(20)
const selectedPlan = ref<AnnualEvaluationPlanVO>()
const courseRows = ref<AnnualEvaluationPlanCourseVO[]>([])
const courseTotal = ref(0)
const coursePageNum = ref(1)
const coursePageSize = ref(20)
const drawerOpen = ref(false)
const detailLoading = ref(false)
const drawerTitle = ref('年度评价课程计划')

const form = reactive<AnnualEvaluationPlanSaveRequest>({
  programId: '',
  trainingPlanId: '',
  accreditationCycleId: '',
  planYear: '',
  planTitle: '',
  coverageTargetRate: 100,
})

const courseProgress = computed(() => {
  const total = selectedPlan.value?.requiredCourseCount ?? 0
  const done = selectedPlan.value?.completedCourseCount ?? 0
  if (total === 0) return { percent: 0, done: 0, total: 0 }
  return {
    percent: Math.round((done / total) * 100),
    done,
    total,
  }
})

const canCreatePlan = computed(() => canMutateAnnualEvaluationPlan(props.maintenanceCycleId))

function canMutatePlan(record: AnnualEvaluationPlanVO) {
  return canMutateAnnualEvaluationPlan(props.maintenanceCycleId, record.accreditationCycleId)
}

function isDraft(record: AnnualEvaluationPlanVO) {
  return record.planStatus === AnnualEvaluationPlanStatusCode.DRAFT
}

function isPublished(record: AnnualEvaluationPlanVO) {
  return record.planStatus === AnnualEvaluationPlanStatusCode.PUBLISHED
}

const annualPlanHint = computed(() =>
  canCreatePlan.value ? '' : '当前无有效期内的认证状态保持周期，不能维护年度评价计划',
)

function coveragePercent(record: AnnualEvaluationPlanVO) {
  const actual = record.actualCoverageRate ?? 0
  const target = record.coverageTargetRate ?? 100
  if (target <= 0) return 0
  return Math.min(100, Math.round((actual / target) * 100))
}

async function loadPlans() {
  if (!props.trainingPlanId) return
  loading.value = true
  try {
    const page = await accreditationApi.annualPlanPage({
      trainingPlanId: props.trainingPlanId,
      pageNum: planPageNum.value,
      pageSize: planPageSize.value,
    })
    plans.value = page.list
    planTotal.value = page.total
    if (selectedPlan.value) {
      const hit = plans.value.find((p) => p.id === selectedPlan.value?.id)
      if (hit) await selectPlan(hit.id)
      else selectedPlan.value = undefined
    }
  } catch (e) {
    showUserError(e, '年度评价计划列表加载失败')
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
  detailLoading.value = true
  try {
    selectedPlan.value = await accreditationApi.annualPlanDetail(id)
    coursePageNum.value = 1
    await loadPlanCourses()
  } catch (e) {
    showUserError(e, '年度评价计划详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function loadPlanCourses() {
  if (!selectedPlan.value?.id) {
    courseRows.value = []
    courseTotal.value = 0
    return
  }
  detailLoading.value = true
  try {
    const page = await accreditationApi.annualPlanCoursePage({
      annualPlanId: selectedPlan.value.id,
      pageNum: coursePageNum.value,
      pageSize: coursePageSize.value,
    })
    courseRows.value = page.list
    courseTotal.value = page.total
  } catch (e) {
    courseRows.value = []
    courseTotal.value = 0
    showUserError(e, '年度计划课程列表加载失败')
  } finally {
    detailLoading.value = false
  }
}

function handleCoursePageChange(pageEvent: { current: number, pageSize: number }) {
  coursePageNum.value = pageEvent.current
  coursePageSize.value = pageEvent.pageSize
  void loadPlanCourses()
}

function resetForm() {
  form.id = undefined
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.accreditationCycleId = props.maintenanceCycleId || ''
  form.planYear = String(new Date().getFullYear())
  form.planTitle = `${form.planYear} 年度课程评价计划`
  form.coverageTargetRate = 100
  form.remark = ''
}

function openCreate() {
  if (!canCreatePlan.value) {
    void message.error(annualPlanHint.value)
    return
  }
  drawerTitle.value = '新建年度评价课程计划'
  resetForm()
  drawerOpen.value = true
}

function openEdit(record: AnnualEvaluationPlanVO) {
  if (!canMutatePlan(record) || !isDraft(record)) {
    void message.error(!canMutatePlan(record) ? '历史认证周期的年度计划仅供查看' : '仅草稿年度评价计划允许编辑')
    return
  }
  drawerTitle.value = '编辑年度评价课程计划'
  form.id = record.id
  form.programId = record.programId
  form.trainingPlanId = record.trainingPlanId
  form.accreditationCycleId = record.accreditationCycleId
  form.planYear = record.planYear
  form.planTitle = record.planTitle
  form.coverageTargetRate = record.coverageTargetRate ?? 100
  form.remark = record.remark || ''
  drawerOpen.value = true
}

async function submitPlan() {
  if (submitting.value) {
    return
  }
  if (!form.planYear.trim() || !form.planTitle.trim()) {
    void message.error('请填写年度与计划标题')
    return
  }
  if (!canCreatePlan.value) {
    void message.error(annualPlanHint.value)
    return
  }
  if (!form.accreditationCycleId) {
    void message.error('年度评价计划必须绑定当前有效认证周期')
    return
  }
  if (form.id && form.accreditationCycleId !== props.maintenanceCycleId) {
    void message.error('历史认证周期的年度计划仅供查看')
    return
  }
  const request: AnnualEvaluationPlanSaveRequest = {
    id: form.id,
    programId: form.programId,
    trainingPlanId: form.trainingPlanId,
    accreditationCycleId: form.accreditationCycleId,
    planYear: form.planYear.trim(),
    planTitle: form.planTitle.trim(),
    coverageTargetRate: form.coverageTargetRate,
    remark: form.remark?.trim() || undefined,
    qualityCourseIds: form.qualityCourseIds,
  }
  submitting.value = true
  try {
    if (form.id) {
      await accreditationApi.annualPlanUpdate(request)
      void message.success('年度评价计划已更新')
    } else {
      await accreditationApi.annualPlanCreate(request)
      void message.success('年度评价计划已保存（已自动纳入全部质量课程）')
    }
    drawerOpen.value = false
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度评价计划保存失败')
  } finally {
    submitting.value = false
  }
}

async function removePlan(id: string) {
  if (submitting.value) {
    return
  }
  const record = plans.value.find((item) => item.id === id)
  if (!record || !canMutatePlan(record) || !isDraft(record)) {
    void message.error(record && !canMutatePlan(record) ? '历史认证周期的年度计划仅供查看' : '仅草稿年度评价计划允许删除')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该年度评价计划？' })
  if (!ok) return
  submitting.value = true
  try {
    await accreditationApi.annualPlanDelete(id)
    void message.success('已删除')
    if (selectedPlan.value?.id === id) selectedPlan.value = undefined
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度评价计划删除失败')
  } finally {
    submitting.value = false
  }
}

async function updateCourseStatus(courseRowId: string, evaluationCompleted: boolean) {
  if (submitting.value) {
    return
  }
  if (!selectedPlan.value || !canMutatePlan(selectedPlan.value) || !isPublished(selectedPlan.value)) {
    void message.error(
      selectedPlan.value && !canMutatePlan(selectedPlan.value)
        ? '历史认证周期的年度计划仅供查看'
        : '仅已发布年度评价计划允许登记课程完成状态',
    )
    return
  }
  submitting.value = true
  try {
    await accreditationApi.updateAnnualPlanCourseStatus({ id: courseRowId, evaluationCompleted })
    void message.success(evaluationCompleted ? '已登记课程评价完成' : '已撤销课程评价完成')
    if (selectedPlan.value) {
      await selectPlan(selectedPlan.value.id)
    }
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e, '年度计划课程状态更新失败')
  } finally {
    submitting.value = false
  }
}

async function transitionPlan(record: AnnualEvaluationPlanVO, target: AnnualEvaluationPlanStatusCode) {
  if (submitting.value) return
  if (!canMutatePlan(record)) {
    void message.error('历史认证周期的年度计划仅供查看')
    return
  }
  const action = target === AnnualEvaluationPlanStatusCode.PUBLISHED ? '发布' : '关闭'
  const ok = await confirmAsync({ title: `确认${action}该年度评价计划？` })
  if (!ok) return
  submitting.value = true
  try {
    await accreditationApi.transitionAnnualPlanStatus({ id: record.id, planStatus: target })
    void message.success(`年度评价计划已${action}`)
    await loadPlans()
    if (selectedPlan.value?.id === record.id) await selectPlan(record.id)
    emit('refresh')
  } catch (e) {
    showUserError(e, `年度评价计划${action}失败`)
  } finally {
    submitting.value = false
  }
}

function handleAnnualPlanRowAction(key: string, record: AnnualEvaluationPlanVO) {
  if (key === 'courses') void selectPlan(record.id)
  else if (key === 'edit') openEdit(record)
  else if (key === 'delete') void removePlan(record.id)
  else if (key === 'publish') void transitionPlan(record, AnnualEvaluationPlanStatusCode.PUBLISHED)
  else if (key === 'close') void transitionPlan(record, AnnualEvaluationPlanStatusCode.CLOSED)
}

function handleAnnualCourseRowAction(key: string, courseRowId: string) {
  if (key === 'mark-done') void updateCourseStatus(courseRowId, true)
  else if (key === 'undo-done') void updateCourseStatus(courseRowId, false)
}

watch(() => props.trainingPlanId, loadPlans, { immediate: true })

defineExpose({ openCreate, loadPlans })
</script>

<template>
  <div class="annual-panel">
    <p v-if="annualPlanHint" class="hint">{{ annualPlanHint }}</p>
    <div class="toolbar">
      <UiButton
        size="sm"
        variant="primary"
        :disabled="!trainingPlanId || !canCreatePlan"
        @click="openCreate"
      >
        新建年度计划
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
        <template v-if="column.key === 'coverage'">
          <div class="coverage-cell">
            <UiProgressBar :percent="coveragePercent(record)" size="sm" :show-label="false" />
            <span class="coverage-text">
              {{ record.actualCoverageRate ?? 0 }}% / 目标 {{ record.coverageTargetRate ?? 100 }}%
            </span>
          </div>
        </template>
        <template v-else-if="column.key === 'planStatus'">
          <UiTag :tone="record.planStatus === 'CLOSED' ? 'gray' : record.planStatus === 'PUBLISHED' ? 'green' : 'orange'" size="sm">
            {{ strictEnumLabel(AnnualEvaluationPlanStatusDescription, record.planStatus, '年度评价计划状态') }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="[
              { key: 'courses', label: '课程明细' },
              { key: 'publish', label: '发布', hidden: !(canMutatePlan(record) && record.planStatus === 'DRAFT') },
              { key: 'close', label: '关闭', hidden: !(canMutatePlan(record) && record.planStatus === 'PUBLISHED') },
              { key: 'edit', label: '编辑', hidden: record.planStatus !== 'DRAFT', disabled: !canMutatePlan(record) },
              { key: 'delete', label: '删除', tone: 'danger', hidden: record.planStatus !== 'DRAFT', disabled: !canMutatePlan(record) },
            ]"
            split
            @action="(key) => handleAnnualPlanRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <UiEmpty size="sm" description="暂无年度评价计划" />
      </template>
    </UiDataTable>
    <div v-if="selectedPlan" class="course-block">
      <div class="course-head">
        <h4>{{ selectedPlan.planTitle }} — 课程完成登记</h4>
        <span class="course-meta">
          须评价 {{ courseProgress.total }} 门，已完成 {{ courseProgress.done }} 门
        </span>
      </div>
      <UiProgressBar
        :percent="courseProgress.percent"
        size="sm"
        class="course-progress"
        :show-label="false"
      />
      <UiDataTable
        pagination-mode="server"
        v-model:current="coursePageNum"
        v-model:page-size="coursePageSize"
        :columns="courseColumns"
        :data-source="courseRows"
        :loading="detailLoading"
        row-key="id"
        size="small"
        :total="courseTotal"
        @page-change="handleCoursePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'required'">
            {{ record.evaluationRequired ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'completed'">
            {{ record.evaluationCompleted ? '是' : '否' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                {
                  key: 'mark-done',
                  label: '登记完成',
                  hidden: !(record.evaluationRequired && !record.evaluationCompleted),
                  disabled: !selectedPlan || !canMutatePlan(selectedPlan) || selectedPlan.planStatus !== 'PUBLISHED',
                },
                {
                  key: 'undo-done',
                  label: '撤销完成',
                  hidden: !record.evaluationCompleted,
                  disabled: !selectedPlan || !canMutatePlan(selectedPlan) || selectedPlan.planStatus !== 'PUBLISHED',
                },
              ]"
              split
              @action="(key) => handleAnnualCourseRowAction(key, record.id)"
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
        <UiFormItem label="计划年度" required>
          <UiInput size="sm" v-model="form.planYear" :disabled="!!form.id" />
        </UiFormItem>
        <UiFormItem label="计划标题" required>
          <UiInput size="sm" v-model="form.planTitle" />
        </UiFormItem>
        <UiFormItem label="目标覆盖率（%）">
          <UiInputNumber
            size="sm"
            v-model="form.coverageTargetRate"
            :min="0"
            :max="100"
            class="w-full"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="form.remark" :rows="3" />
        </UiFormItem>
        <p class="hint">保存后将自动纳入本培养方案下全部质量评价课程，无需手工勾选。</p>
      </UiForm>
    </UiDrawer>
  </div>
</template>

<style scoped>
.annual-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.course-block {
  margin-top: var(--dp-space-component-tight);
}
.course-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component-tight);
}
.course-head h4 {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
.course-meta {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
.course-progress {
  margin-bottom: var(--dp-space-component-tight);
  max-width: 360px;
}
.coverage-cell {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  min-width: 160px;
}
.coverage-text {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
.hint {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  margin: 0;
}
.w-full {
  width: 100%;
}
</style>
