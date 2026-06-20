<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AnnualEvaluationPlanSaveRequest, AnnualEvaluationPlanVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { accreditationApi } from '@/apis/quality'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  activeCycleId?: string
}>()

const emit = defineEmits<{ refresh: [] }>()

const planColumns: ColumnsType = [
  { title: '年度', dataIndex: 'planYear', key: 'planYear', width: 80 },
  { title: '计划标题', dataIndex: 'planTitle', key: 'planTitle' },
  { title: '须评价', dataIndex: 'requiredCourseCount', key: 'requiredCourseCount', width: 80 },
  { title: '已完成', dataIndex: 'completedCourseCount', key: 'completedCourseCount', width: 80 },
  { title: '覆盖率', key: 'coverage', width: 200 },
  { title: '操作', key: 'actions', width: 240, fixed: 'right' },
]

const courseColumns: ColumnsType = [
  { title: '课程编码', dataIndex: 'courseCode', key: 'courseCode', width: 120 },
  { title: '课程名称', dataIndex: 'courseName', key: 'courseName' },
  { title: '须评价', key: 'required', width: 80 },
  { title: '已完成', key: 'completed', width: 80 },
  { title: '操作', key: 'actions', width: 100 },
]

const loading = ref(false)
const plans = ref<AnnualEvaluationPlanVO[]>([])
const selectedPlan = ref<AnnualEvaluationPlanVO>()
const drawerOpen = ref(false)
const detailLoading = ref(false)
const drawerTitle = ref('年度评价课程计划')

const form = reactive<AnnualEvaluationPlanSaveRequest>({
  programId: '',
  trainingPlanId: '',
  planYear: '',
  planTitle: '',
  coverageTargetRate: 100,
})

const courseProgress = computed(() => {
  const courses = selectedPlan.value?.courses || []
  const required = courses.filter((c) => c.evaluationRequired)
  if (required.length === 0) return { percent: 0, done: 0, total: 0 }
  const done = required.filter((c) => c.evaluationCompleted).length
  return {
    percent: Math.round((done / required.length) * 100),
    done,
    total: required.length,
  }
})

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
    plans.value = await accreditationApi.annualPlanList(props.trainingPlanId)
    if (selectedPlan.value) {
      const hit = plans.value.find((p) => p.id === selectedPlan.value?.id)
      if (hit) await selectPlan(hit.id)
      else selectedPlan.value = undefined
    }
  } catch (e) {
    showUserError(e)
  } finally {
    loading.value = false
  }
}

async function selectPlan(id: string) {
  detailLoading.value = true
  try {
    selectedPlan.value = await accreditationApi.annualPlanDetail(id)
  } catch (e) {
    showUserError(e)
  } finally {
    detailLoading.value = false
  }
}

function resetForm() {
  form.id = undefined
  form.programId = props.programId
  form.trainingPlanId = props.trainingPlanId
  form.accreditationCycleId = props.activeCycleId
  form.planYear = String(new Date().getFullYear())
  form.planTitle = `${form.planYear} 年度课程评价计划`
  form.coverageTargetRate = 100
  form.remark = ''
}

function openCreate() {
  drawerTitle.value = '新建年度评价课程计划'
  resetForm()
  drawerOpen.value = true
}

function openEdit(record: AnnualEvaluationPlanVO) {
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
  if (!form.planYear.trim() || !form.planTitle.trim()) {
    message.error('请填写年度与计划标题')
    return
  }
  try {
    if (form.id) {
      await accreditationApi.annualPlanUpdate(form)
      message.success('年度评价计划已更新')
    } else {
      await accreditationApi.annualPlanCreate(form)
      message.success('年度评价计划已保存（已自动纳入全部质量课程）')
    }
    drawerOpen.value = false
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

async function removePlan(id: string) {
  const ok = await confirmAsync({ title: '确认删除该年度评价计划？' })
  if (!ok) return
  try {
    await accreditationApi.annualPlanDelete(id)
    message.success('已删除')
    if (selectedPlan.value?.id === id) selectedPlan.value = undefined
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

async function updateCourseStatus(courseRowId: string, evaluationCompleted: boolean) {
  try {
    await accreditationApi.updateAnnualPlanCourseStatus({ id: courseRowId, evaluationCompleted })
    message.success(evaluationCompleted ? '已登记课程评价完成' : '已撤销课程评价完成')
    if (selectedPlan.value) await selectPlan(selectedPlan.value.id)
    await loadPlans()
    emit('refresh')
  } catch (e) {
    showUserError(e)
  }
}

watch(() => props.trainingPlanId, loadPlans, { immediate: true })

defineExpose({ openCreate, loadPlans })
</script>

<template>
  <div class="annual-panel">
    <div class="toolbar">
      <UiButton variant="primary" :disabled="!trainingPlanId" @click="openCreate">
        新建年度计划
      </UiButton>
    </div>
    <UiDataTable :columns="planColumns" :data-source="plans" :loading="loading" row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'coverage'">
          <div class="coverage-cell">
            <a-progress
              :percent="coveragePercent(record)"
              :success="{ percent: coveragePercent(record) }"
              size="small"
            />
            <span class="coverage-text">
              {{ record.actualCoverageRate ?? 0 }}% / 目标 {{ record.coverageTargetRate ?? 100 }}%
            </span>
          </div>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton size="sm" variant="ghost" @click.stop="selectPlan(record.id)">
            课程明细
          </UiButton>
          <UiButton size="sm" variant="outline" @click.stop="openEdit(record)">编辑</UiButton>
          <UiButton size="sm" status="danger" variant="ghost" @click.stop="removePlan(record.id)">
            删除
          </UiButton>
        </template>
      </template>
      <template #empty>
        <UiEmpty description="暂无年度评价计划" />
      </template>
    </UiDataTable>
    <div v-if="selectedPlan" class="course-block">
      <div class="course-head">
        <h4>{{ selectedPlan.planTitle }} — 课程完成登记</h4>
        <span class="course-meta">
          须评价 {{ courseProgress.total }} 门，已完成 {{ courseProgress.done }} 门
        </span>
      </div>
      <a-progress :percent="courseProgress.percent" size="small" class="course-progress" />
      <UiDataTable
        :columns="courseColumns"
        :data-source="selectedPlan.courses || []"
        :loading="detailLoading"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'required'">
            {{
              record.evaluationRequired ? '是' : '否'
            }}
          </template>
          <template v-else-if="column.key === 'completed'">
            {{
              record.evaluationCompleted ? '是' : '否'
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              v-if="record.evaluationRequired && !record.evaluationCompleted"
              size="sm"
              variant="primary"
              @click="updateCourseStatus(record.id, true)"
            >
              登记完成
            </UiButton>
            <UiButton
              v-else-if="record.evaluationCompleted"
              size="sm"
              variant="outline"
              @click="updateCourseStatus(record.id, false)"
            >
              撤销完成
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
        <a-form-item label="计划年度" required>
          <a-input v-model:value="form.planYear" />
        </a-form-item>
        <a-form-item label="计划标题" required>
          <a-input v-model:value="form.planTitle" />
        </a-form-item>
        <a-form-item label="目标覆盖率（%）">
          <a-input-number
            v-model:value="form.coverageTargetRate"
            :min="0"
            :max="100"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.remark" :rows="3" />
        </a-form-item>
        <p class="hint">保存后将自动纳入本培养方案下全部质量评价课程，无需手工勾选。</p>
      </a-form>
    </UiDrawer>
  </div>
</template>

<style scoped>
.annual-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  gap: 8px;
}
.course-block {
  margin-top: 8px;
}
.course-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.course-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.course-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.course-progress {
  margin-bottom: 8px;
  max-width: 360px;
}
.coverage-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}
.coverage-text {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 0;
}
.w-full {
  width: 100%;
}
</style>
