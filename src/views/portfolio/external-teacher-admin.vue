<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioExternalTeacherImportBatchStatusCode,
} from '@/apis/portfolio/enums'
import type {
  PortfolioExternalTeacherImportBatchVO,
  PortfolioExternalTeacherSaveRequest,
  PortfolioExternalTeacherStatsVO,
  PortfolioExternalTeacherVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS,
  PortfolioExternalTeacherDataStatusCode,
  PortfolioExternalTeacherDataStatusDescription,
  PortfolioExternalTeacherImportBatchStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioExternalTeacherApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref('roster')
const loading = ref(false)
const statsLoading = ref(false)
const batchLoading = ref(false)
const saving = ref(false)
const rows = ref<PortfolioExternalTeacherVO[]>([])
const stats = ref<PortfolioExternalTeacherStatsVO | null>(null)
const batchRows = ref<PortfolioExternalTeacherImportBatchVO[]>([])
const drawerOpen = ref(false)
const batchDetailOpen = ref(false)
const batchDetail = ref<PortfolioExternalTeacherImportBatchVO | null>(null)
const importModalOpen = ref(false)
const dataStatusFilter = ref<PortfolioExternalTeacherDataStatusCode | ''>('')
const teachSubjectFilter = ref('')
const teacherSourceFilter = ref('')
const contractStatusFilter = ref('')

interface AttachmentItem {
  fileNodeId: string
  fileName: string
}

const attachmentItems = ref<AttachmentItem[]>([])
const attachmentInputRef = ref<HTMLInputElement>()
const uploadingAttachment = ref(false)

const form = reactive<PortfolioExternalTeacherSaveRequest>({
  id: undefined,
  fullName: '',
  gender: '',
  major: '',
  title: '',
  age: undefined,
  idCardNo: '',
  hireTerm: '',
  teachSubject: '',
  teachHours: undefined,
  employerUnit: '',
  teachMajor: '',
  teacherSource: '',
  trialScore: '',
  industryExperience: '',
  contractStatus: '',
  contactPhone: '',
  contactEmail: '',
  hireStartDate: undefined,
  hireEndDate: undefined,
  dataStatus: PortfolioExternalTeacherDataStatusCode.ACTIVE,
})

const dataStatusOptions = PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_OPTIONS

const columns: ColumnsType = [
  { title: '姓名', dataIndex: 'fullName', key: 'fullName', width: 88 },
  { title: '性别', dataIndex: 'gender', key: 'gender', width: 56 },
  { title: '专业', dataIndex: 'major', key: 'major', width: 88 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 72 },
  { title: '年龄', dataIndex: 'age', key: 'age', width: 56 },
  { title: '聘任学期', dataIndex: 'hireTerm', key: 'hireTerm', width: 100 },
  { title: '任教科目', dataIndex: 'teachSubject', key: 'teachSubject', width: 100 },
  { title: '任职单位', dataIndex: 'employerUnit', key: 'employerUnit' },
  { title: '合同状态', dataIndex: 'contractStatus', key: 'contractStatus', width: 88 },
  { title: '状态', key: 'dataStatus', width: 72 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right' },
]

const batchColumns: ColumnsType = [
  { title: '文件名', dataIndex: 'fileName', key: 'fileName' },
  { title: '成功', dataIndex: 'successRows', key: 'successRows', width: 64 },
  { title: '失败', dataIndex: 'failedRows', key: 'failedRows', width: 64 },
  { title: '状态', key: 'batchStatus', width: 96 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

function dataStatusLabel(status: PortfolioExternalTeacherDataStatusCode): string {
  return strictEnumLabel(PortfolioExternalTeacherDataStatusDescription, status, '外聘教师数据状态')
}

function batchStatusLabel(status: PortfolioExternalTeacherImportBatchStatusCode): string {
  return strictEnumLabel(
    PortfolioExternalTeacherImportBatchStatusDescription,
    status,
    '外聘教师导入批次状态',
  )
}

function resetForm() {
  form.id = undefined
  form.fullName = ''
  form.gender = ''
  form.major = ''
  form.title = ''
  form.age = undefined
  form.idCardNo = ''
  form.hireTerm = ''
  form.teachSubject = ''
  form.teachHours = undefined
  form.employerUnit = ''
  form.teachMajor = ''
  form.teacherSource = ''
  form.trialScore = ''
  form.industryExperience = ''
  form.contractStatus = ''
  form.contactPhone = ''
  form.contactEmail = ''
  form.hireStartDate = undefined
  form.hireEndDate = undefined
  form.dataStatus = PortfolioExternalTeacherDataStatusCode.ACTIVE
  attachmentItems.value = []
}

function attachmentFileIds(): string[] {
  return attachmentItems.value.map((item) => item.fileNodeId)
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

async function onAttachmentPick(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const files = input.files
  if (!files?.length) {
    return
  }
  uploadingAttachment.value = true
  try {
    for (const file of Array.from(files)) {
      const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
      attachmentItems.value = [
        ...attachmentItems.value,
        { fileNodeId: uploaded.id, fileName: uploaded.nodeName },
      ]
    }
    message.success('附件已上传')
  } catch (error) {
    showUserError(error, '附件上传失败')
  } finally {
    uploadingAttachment.value = false
    input.value = ''
  }
}

function removeAttachment(fileNodeId: string) {
  attachmentItems.value = attachmentItems.value.filter((item) => item.fileNodeId !== fileNodeId)
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioExternalTeacherApi.page({
      pageNum: 1,
      pageSize: 50,
      dataStatus: dataStatusFilter.value || undefined,
      teachSubject: teachSubjectFilter.value.trim() || undefined,
      teacherSource: teacherSourceFilter.value.trim() || undefined,
      contractStatus: contractStatusFilter.value.trim() || undefined,
    })
    rows.value = page.list
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await portfolioExternalTeacherApi.stats()
  } catch (error) {
    showUserError(error)
  } finally {
    statsLoading.value = false
  }
}

async function loadImportBatches() {
  batchLoading.value = true
  try {
    const page = await portfolioExternalTeacherApi.importBatchPage({ pageNum: 1, pageSize: 50 })
    batchRows.value = page.list
  } catch (error) {
    showUserError(error)
  } finally {
    batchLoading.value = false
  }
}

function openCreate() {
  resetForm()
  drawerOpen.value = true
}

async function openEdit(id: string) {
  resetForm()
  drawerOpen.value = true
  try {
    const detail = await portfolioExternalTeacherApi.get({ id })
    form.id = detail.id
    form.fullName = detail.fullName
    form.gender = detail.gender ?? ''
    form.major = detail.major ?? ''
    form.title = detail.title ?? ''
    form.age = detail.age
    form.idCardNo = detail.idCardNo ?? ''
    form.hireTerm = detail.hireTerm ?? ''
    form.teachSubject = detail.teachSubject ?? ''
    form.teachHours = detail.teachHours
    form.employerUnit = detail.employerUnit ?? ''
    form.teachMajor = detail.teachMajor ?? ''
    form.teacherSource = detail.teacherSource ?? ''
    form.trialScore = detail.trialScore ?? ''
    form.industryExperience = detail.industryExperience ?? ''
    form.contractStatus = detail.contractStatus ?? ''
    form.contactPhone = detail.contactPhone ?? ''
    form.contactEmail = detail.contactEmail ?? ''
    form.hireStartDate = detail.hireStartDate
    form.hireEndDate = detail.hireEndDate
    form.dataStatus = detail.dataStatus
    attachmentItems.value = (detail.attachmentFileIds ?? []).map((fileNodeId) => ({
      fileNodeId,
      fileName: fileNodeId,
    }))
  } catch (error) {
    showUserError(error)
  }
}

async function saveRecord() {
  if (!form.fullName.trim()) {
    message.warning('请填写姓名')
    return
  }
  saving.value = true
  try {
    await portfolioExternalTeacherApi.save({
      id: form.id,
      fullName: form.fullName.trim(),
      gender: form.gender?.trim() || undefined,
      major: form.major?.trim() || undefined,
      title: form.title?.trim() || undefined,
      age: form.age,
      idCardNo: form.idCardNo?.trim() || undefined,
      hireTerm: form.hireTerm?.trim() || undefined,
      teachSubject: form.teachSubject?.trim() || undefined,
      teachHours: form.teachHours,
      employerUnit: form.employerUnit?.trim() || undefined,
      teachMajor: form.teachMajor?.trim() || undefined,
      teacherSource: form.teacherSource?.trim() || undefined,
      trialScore: form.trialScore?.trim() || undefined,
      industryExperience: form.industryExperience?.trim() || undefined,
      contractStatus: form.contractStatus?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      contactEmail: form.contactEmail?.trim() || undefined,
      hireStartDate: form.hireStartDate,
      hireEndDate: form.hireEndDate,
      attachmentFileIds: attachmentFileIds().length ? attachmentFileIds() : undefined,
      dataStatus: form.dataStatus,
    })
    message.success('外聘教师已保存')
    drawerOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error)
  } finally {
    saving.value = false
  }
}

async function revokeRecord(id: string) {
  const ok = await confirmAsync({
    title: '确认停用',
    content: '确认停用此外聘教师记录？',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  try {
    await portfolioExternalTeacherApi.revoke({ id })
    message.success('已停用')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function handleImportSuccess() {
  importModalOpen.value = false
  await Promise.all([loadPage(), loadImportBatches()])
}

async function openBatchDetail(id: string) {
  batchDetailOpen.value = true
  batchDetail.value = null
  try {
    batchDetail.value = await portfolioExternalTeacherApi.importBatchGet({ id })
  } catch (error) {
    showUserError(error)
  }
}

async function exportRoster() {
  try {
    const result = await portfolioExternalTeacherApi.exportRoster()
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadPage()
  await loadStats()
  await loadImportBatches()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="外聘教师台账">
        <template #actions>
          <UiButton variant="primary" @click="openCreate"> 新增外聘教师 </UiButton>
        </template>
      </ContextBar>
    </template>
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="roster" tab="名册">
        <UiCard title="批量导入">
          <UiButton @click="importModalOpen = true"> Excel 批量导入 </UiButton>
        </UiCard>
        <UiPlatformExcelImportModal
          v-model:open="importModalOpen"
          :scene-key="ExcelImportSceneKey.PORTFOLIO_EXTERNAL_TEACHER"
          entity-label="外聘教师"
          @success="handleImportSuccess"
        />
        <UiCard>
          <div class="toolbar">
            <a-select
              v-model:value="dataStatusFilter"
              allow-clear
              placeholder="数据状态"
              style="width: 120px"
              :options="dataStatusOptions"
              @change="loadPage"
            />
            <a-input
              v-model:value="teachSubjectFilter"
              allow-clear
              placeholder="任教科目"
              style="width: 120px"
              @press-enter="loadPage"
            />
            <a-input
              v-model:value="teacherSourceFilter"
              allow-clear
              placeholder="教师来源"
              style="width: 120px"
              @press-enter="loadPage"
            />
            <a-input
              v-model:value="contractStatusFilter"
              allow-clear
              placeholder="合同状态"
              style="width: 120px"
              @press-enter="loadPage"
            />
            <UiButton @click="loadPage"> 刷新 </UiButton>
            <UiButton variant="outline" @click="exportRoster"> 导出台账 </UiButton>
          </div>
          <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无外聘教师" />
          <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'dataStatus'">
                <UiTag :tone="record.dataStatus === 'ACTIVE' ? 'green' : 'gray'">
                  {{ dataStatusLabel(record.dataStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="openEdit(record.id)"> 编辑 </UiTextAction>
                <UiTextAction
                  v-if="record.dataStatus === 'ACTIVE'"
                  @click="revokeRecord(record.id)"
                >
                  停用
                </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="stats" tab="统计">
        <UiCard>
          <UiButton :loading="statsLoading" @click="loadStats"> 刷新统计 </UiButton>
          <a-spin :spinning="statsLoading">
            <div v-if="stats" class="stats-grid">
              <div>
                <h4>合同状态分布</h4>
                <a-table
                  size="small"
                  :pagination="false"
                  row-key="dimensionCode"
                  :data-source="stats.contractStatusCounts"
                  :columns="[
                    { title: '合同状态', dataIndex: 'dimensionCode', key: 'dimensionCode' },
                    { title: '人数', dataIndex: 'count', key: 'count', width: 72 },
                  ]"
                />
              </div>
              <div>
                <h4>教师来源分布</h4>
                <a-table
                  size="small"
                  :pagination="false"
                  row-key="dimensionCode"
                  :data-source="stats.teacherSourceCounts"
                  :columns="[
                    { title: '教师来源', dataIndex: 'dimensionCode', key: 'dimensionCode' },
                    { title: '人数', dataIndex: 'count', key: 'count', width: 72 },
                  ]"
                />
              </div>
            </div>
            <UiEmpty v-else-if="!statsLoading" description="暂无统计数据" />
          </a-spin>
        </UiCard>
      </a-tab-pane>
      <a-tab-pane key="import-batch" tab="导入批次">
        <UiCard>
          <UiButton :loading="batchLoading" @click="loadImportBatches"> 刷新批次 </UiButton>
          <UiDataTable
            :columns="batchColumns"
            :data-source="batchRows"
            :loading="batchLoading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'batchStatus'">
                {{ batchStatusLabel(record.batchStatus) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="openBatchDetail(record.id)"> 详情 </UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-tab-pane>
    </a-tabs>
    <a-drawer
      v-model:open="drawerOpen"
      :title="form.id ? '编辑外聘教师' : '新增外聘教师'"
      width="480"
    >
      <a-form layout="vertical">
        <a-form-item label="姓名" required>
          <a-input v-model:value="form.fullName" />
        </a-form-item>
        <a-form-item label="性别">
          <a-input v-model:value="form.gender" />
        </a-form-item>
        <a-form-item label="专业">
          <a-input v-model:value="form.major" />
        </a-form-item>
        <a-form-item label="职称">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-form-item label="年龄">
          <a-input-number v-model:value="form.age" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="身份证号">
          <a-input v-model:value="form.idCardNo" />
        </a-form-item>
        <a-form-item label="聘任学期">
          <a-input v-model:value="form.hireTerm" />
        </a-form-item>
        <a-form-item label="任教科目">
          <a-input v-model:value="form.teachSubject" />
        </a-form-item>
        <a-form-item label="授课学时">
          <a-input-number v-model:value="form.teachHours" style="width: 100%" />
        </a-form-item>
        <a-form-item label="任职单位">
          <a-input v-model:value="form.employerUnit" />
        </a-form-item>
        <a-form-item label="任教专业">
          <a-input v-model:value="form.teachMajor" />
        </a-form-item>
        <a-form-item label="教师来源">
          <a-input v-model:value="form.teacherSource" />
        </a-form-item>
        <a-form-item label="试讲成绩">
          <a-input v-model:value="form.trialScore" />
        </a-form-item>
        <a-form-item label="行业经历">
          <a-input v-model:value="form.industryExperience" />
        </a-form-item>
        <a-form-item label="合同状态">
          <a-input v-model:value="form.contractStatus" />
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-model:value="form.contactPhone" />
        </a-form-item>
        <a-form-item label="联系邮箱">
          <a-input v-model:value="form.contactEmail" />
        </a-form-item>
        <a-form-item label="聘期开始">
          <a-date-picker
            v-model:value="form.hireStartDate"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="聘期结束">
          <a-date-picker
            v-model:value="form.hireEndDate"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="数据状态">
          <a-select v-model:value="form.dataStatus" :options="dataStatusOptions" />
        </a-form-item>
        <a-form-item label="附件材料">
          <input
            ref="attachmentInputRef"
            type="file"
            multiple
            class="sr-only"
            @change="onAttachmentPick"
          />
          <UiButton :loading="uploadingAttachment" @click="openAttachmentPicker">
            上传附件
          </UiButton>
          <ul v-if="attachmentItems.length" class="attachment-list">
            <li v-for="item in attachmentItems" :key="item.fileNodeId">
              {{ item.fileName }}
              <UiTextAction @click="removeAttachment(item.fileNodeId)"> 移除 </UiTextAction>
            </li>
          </ul>
        </a-form-item>
        <UiButton variant="primary" :loading="saving" @click="saveRecord"> 保存 </UiButton>
      </a-form>
    </a-drawer>
    <a-drawer v-model:open="batchDetailOpen" title="导入批次详情" width="480">
      <template v-if="batchDetail">
        <p>文件 {{ batchDetail.fileName ?? '—' }}</p>
        <p>
          成功 {{ batchDetail.successRows ?? 0 }} · 失败 {{ batchDetail.failedRows ?? 0 }}
        </p>
        <p>状态 {{ batchStatusLabel(batchDetail.batchStatus) }}</p>
        <p v-if="batchDetail.createTime">创建时间 {{ batchDetail.createTime }}</p>
      </template>
    </a-drawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.stats-grid h4 {
  margin: 0 0 8px;
  font-size: 14px;
}
.error-report {
  margin-top: 12px;
  padding: 8px;
  font-size: 12px;
  background: var(--ant-color-fill-quaternary);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}
.attachment-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.attachment-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
</style>
