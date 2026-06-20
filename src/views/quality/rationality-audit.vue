<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar subtitle="CEEAA 2025强制要求：每门课程须经考核评价依据合理性审核">
        <template #status>
          <QualityScopeHeader @change="handleScopeChange" />
          <UiTag tone="blue" size="sm">覆盖率 {{ coverageRate }}%</UiTag>
          <UiTag :tone="coverageRate >= 100 ? 'green' : 'orange'" size="sm">
            {{ coverageRate >= 100 ? '已全部覆盖' : `${pendingCount} 门未通过/未审核` }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <UiCard>
      <template #title>
        <SafetyCertificateOutlined />
        <span>考核评价依据合理性审核</span>
      </template>

      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      >
        <template #field-semester>
          <a-select
            v-model:value="filterForm.semester"
            :options="SemesterOptions"
            placeholder="学期"
            allow-clear
            style="width: 100%"
          />
        </template>
      </UiFilterBar>

      <a-spin :spinning="loading">
        <UiDataTable
          pagination-mode="none"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          row-key="qualityCourseId"
          :show-pagination="false"
          flat
          :total="list.length"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'auditStatus'">
              <UiTag :tone="auditStatusTone(record.auditStatus)" size="sm">{{ auditStatusLabel(record.auditStatus) }}</UiTag>
            </template>
            <template v-else-if="column.key === 'courseName'">
              <div class="course-cell">
                <div class="course-name">{{ record.courseName }}</div>
                <div v-if="record.courseCode" class="course-code">{{ record.courseCode }}</div>
              </div>
            </template>
            <template v-else-if="column.key === 'checks'">
              <a-space size="small">
                <UiTag :tone="booleanTagTone(record.contentAligned)" size="sm">内容一致</UiTag>
                <UiTag :tone="booleanTagTone(record.rubricMeasurable)" size="sm">标准可衡量</UiTag>
                <UiTag :tone="booleanTagTone(record.methodReasonable)" size="sm">方法合理</UiTag>
              </a-space>
            </template>
            <template v-else-if="column.key === 'source'">
              <UiTag :tone="record.hasAuditRecord ? 'blue' : 'orange'" size="sm">
                {{ record.hasAuditRecord ? '已有审核记录' : '未建审核记录' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction @click="openEdit(record)">
                {{ record.hasAuditRecord ? '编辑审核' : '新建审核' }}
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
      </a-spin>
    </UiCard>
    <!-- 审核编辑弹窗 -->
    <a-modal
      v-model:open="editOpen"
      title="考核评价依据合理性审核"
      width="520px"
      :confirm-loading="editing"
      cancel-text="关闭"
    >
      <a-form layout="vertical">
        <a-form-item label="课程">
          <a-input :value="editForm.courseName || ''" disabled />
        </a-form-item>
        <a-form-item label="考核内容是否与课程目标一致">
          <a-switch v-model:checked="editForm.contentAligned" />
        </a-form-item>
        <a-form-item label="评分标准是否明确可衡量">
          <a-switch v-model:checked="editForm.rubricMeasurable" />
        </a-form-item>
        <a-form-item label="评价方法是否合理">
          <a-switch v-model:checked="editForm.methodReasonable" />
        </a-form-item>
        <a-form-item label="审核意见">
          <a-textarea v-model:value="editForm.auditOpinion" :rows="3" placeholder="审核意见..." />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-space>
          <UiButton variant="outline" @click="editOpen = false">取消</UiButton>
          <UiButton status="danger" :loading="editing" @click="submitAudit('REJECTED')">驳回</UiButton>
          <UiButton variant="primary" :loading="editing" @click="submitAudit('APPROVED')">审核通过</UiButton>
        </a-space>
      </template>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  RationalityAuditCourseLedgerItemVO,
  RationalityAuditCourseLedgerOverviewVO,
  RationalityAuditSaveRequest,
} from '@/apis/quality/rationality-audit'
import type { FilterField } from '@/components/ui-guide/ui/types'
import SafetyCertificateOutlined from '@ant-design/icons-vue/SafetyCertificateOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import {
  createRationalityAudit,
  getRationalityAuditCourseLedger,
  updateRationalityAudit,
} from '@/apis/quality/rationality-audit'
import QualityScopeHeader from '@/components/quality/QualityScopeHeader.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useQualityStore } from '@/stores/modules/quality'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError, toUserError } from '@/utils/error-handler'

defineOptions({ name: 'QualityRationalityAudit' })

interface RationalityAuditEditForm {
  id?: string
  qualityCourseId?: string
  courseName?: string
  auditOpinion?: string
  contentAligned?: boolean
  rubricMeasurable?: boolean
  methodReasonable?: boolean
}

interface RationalityAuditFilterModel {
  schoolYear: string
  semester: string
}

const loading = ref(false)
const listLoadError = ref<Error | null>(null)
const qualityStore = useQualityStore()
const filterForm = reactive<RationalityAuditFilterModel>({
  schoolYear: '',
  semester: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'schoolYear',
    type: 'input',
    placeholder: '2025-2026',
    allowClear: true,
    width: 140,
  },
  { key: 'semester', type: 'custom', width: 140 },
]
const list = ref<RationalityAuditCourseLedgerItemVO[]>([])
const overview = ref<RationalityAuditCourseLedgerOverviewVO>({
  totalCourseCount: 0,
  auditedCourseCount: 0,
  approvedCourseCount: 0,
  pendingCourseCount: 0,
  coverageRate: 0,
})
const editOpen = ref(false)
const editing = ref(false)
const editForm = ref<RationalityAuditEditForm>({})

const pendingCount = computed(() => overview.value.pendingCourseCount)
const coverageRate = computed(() => Number(overview.value.coverageRate ?? 0))

const columns = [
  { title: '课程', key: 'courseName', dataIndex: 'courseName', width: 200 },
  { title: '状态', key: 'auditStatus', width: 100 },
  { title: '台账来源', key: 'source', width: 120 },
  { title: '审核项', key: 'checks', width: 280 },
  { title: '审核意见', key: 'auditOpinion', dataIndex: 'auditOpinion', ellipsis: true },
  { title: '审核时间', key: 'auditedAt', dataIndex: 'auditedAt', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

function auditStatusTone(s: string) {
  return s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange'
}

function auditStatusLabel(s: string) {
  return s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审核'
}

function booleanTagTone(v?: boolean) {
  return v === true ? 'green' : v === false ? 'red' : 'orange'
}

async function loadList() {
  const trainingPlanId = qualityStore.currentTrainingPlanId
  const { schoolYear, semester } = filterForm
  if (!trainingPlanId || !schoolYear || !semester) {
    message.warning('请选择培养方案、学年和学期')
    return
  }
  loading.value = true
  listLoadError.value = null
  try {
    const response = await getRationalityAuditCourseLedger({
      trainingPlanId,
      schoolYear,
      semester,
    })
    overview.value = response.overview
    list.value = response.items
  } catch (e: unknown) {
    listLoadError.value = toUserError(e, '加载审核列表失败')
    showUserError(e, '加载审核列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  void loadList()
}

function handleReset() {
  Object.assign(filterForm, {
    schoolYear: '',
    semester: '',
  })
  listLoadError.value = null
  list.value = []
  overview.value = {
    totalCourseCount: 0,
    auditedCourseCount: 0,
    approvedCourseCount: 0,
    pendingCourseCount: 0,
    coverageRate: 0,
  }
}

function handleScopeChange(): void {
  listLoadError.value = null
  if (filterForm.schoolYear && filterForm.semester && qualityStore.currentTrainingPlanId) {
    void loadList()
  }
}

function openEdit(record: RationalityAuditCourseLedgerItemVO) {
  editForm.value = {
    id: record.id,
    qualityCourseId: record.qualityCourseId,
    courseName: record.courseName,
    auditOpinion: record.auditOpinion,
    contentAligned: record.contentAligned,
    rubricMeasurable: record.rubricMeasurable,
    methodReasonable: record.methodReasonable,
  }
  editOpen.value = true
}

async function submitAudit(status: 'APPROVED' | 'REJECTED') {
  if (!editForm.value.qualityCourseId) {
    message.error('缺少课程信息，无法提交审核')
    return
  }
  editing.value = true
  try {
    const request: RationalityAuditSaveRequest = {
      qualityCourseId: editForm.value.qualityCourseId,
      auditStatus: status,
      auditOpinion: editForm.value.auditOpinion || '',
      contentAligned: editForm.value.contentAligned ?? false,
      rubricMeasurable: editForm.value.rubricMeasurable ?? false,
      methodReasonable: editForm.value.methodReasonable ?? false,
      schoolYear: filterForm.schoolYear,
      semester: filterForm.semester,
    }
    if (editForm.value.id) {
      request.id = editForm.value.id
      await updateRationalityAudit(request)
    } else {
      await createRationalityAudit(request)
    }
    message.success(status === 'APPROVED' ? '审核已通过' : '已驳回')
    editOpen.value = false
    await loadList()
  } catch (e: unknown) {
    showUserError(e, '操作失败')
  } finally {
    editing.value = false
  }
}
</script>

<style scoped lang="scss">
.course-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.course-name {
  color: var(--ant-color-text);
  font-weight: 500;
  line-height: 22px;
}

.course-code {
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  line-height: 18px;
}
</style>
