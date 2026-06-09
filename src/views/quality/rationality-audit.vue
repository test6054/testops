<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar subtitle="CEEAA 2025强制要求：每门课程须经考核评价依据合理性审核">
        <template #status>
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

      <div class="filter-card">
        <a-form layout="inline">
          <a-form-item label="培养方案">
            <TrainingPlanSelector v-model:value="trainingPlanId" :program-id="programId || null" />
          </a-form-item>
          <a-form-item label="学年">
            <a-input v-model:value="schoolYear" placeholder="2025-2026" style="width:140px" />
          </a-form-item>
          <a-form-item label="学期">
            <a-select v-model:value="semester" :options="[{label:'第一学期',value:'1'},{label:'第二学期',value:'2'}]" style="width:140px" />
          </a-form-item>
          <a-form-item>
            <UiButton size="sm" @click="loadList">查询</UiButton>
          </a-form-item>
        </a-form>
      </div>

      <a-spin :spinning="loading">
        <UiDataTable
          :columns="columns"
          :data-source="list"
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
              <span class="op-link" @click="openEdit(record)">{{ record.hasAuditRecord ? '编辑审核' : '新建审核' }}</span>
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
import { computed, ref } from 'vue'
import SafetyCertificateOutlined from '@ant-design/icons-vue/SafetyCertificateOutlined'
import message from 'ant-design-vue/es/message'
import { TrainingPlanSelector } from '@/components/quality/selectors'
import { UiButton, UiCard, UiDataTable, UiTag } from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import type {
  RationalityAuditCourseLedgerItemVO,
  RationalityAuditCourseLedgerOverviewVO,
  RationalityAuditSaveRequest,
} from '@/apis/quality/rationality-audit'
import {
  createRationalityAudit,
  getRationalityAuditCourseLedger,
  updateRationalityAudit,
} from '@/apis/quality/rationality-audit'

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

const loading = ref(false)
const trainingPlanId = ref<string | null>(null)
const programId = ref<string | null>(null)
const schoolYear = ref('')
const semester = ref('')
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

function auditStatusTone(s: string) { return s === 'APPROVED' ? 'green' : s === 'REJECTED' ? 'red' : 'orange' }
function auditStatusLabel(s: string) { return s === 'APPROVED' ? '已通过' : s === 'REJECTED' ? '已驳回' : '待审核' }
function booleanTagTone(v?: boolean) { return v === true ? 'green' : v === false ? 'red' : 'orange' }

async function loadList() {
  if (!trainingPlanId.value || !schoolYear.value || !semester.value) {
    message.warning('请选择培养方案、学年和学期')
    return
  }
  loading.value = true
  try {
    const response = await getRationalityAuditCourseLedger({
      trainingPlanId: trainingPlanId.value,
      schoolYear: schoolYear.value,
      semester: semester.value,
    })
    overview.value = response.overview
    list.value = response.items
  } catch (e: any) {
    message.error('加载审核列表失败: ' + (e?.message ?? ''))
  } finally {
    loading.value = false
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
      schoolYear: schoolYear.value,
      semester: semester.value,
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
  } catch (e: any) {
    message.error('操作失败: ' + (e?.message ?? ''))
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
  color: var(--text-color, #1f2329);
  font-weight: 500;
  line-height: 22px;
}

.course-code {
  color: var(--text-secondary-color, #86909c);
  font-size: 12px;
  line-height: 18px;
}
</style>
