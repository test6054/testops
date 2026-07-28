<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioDevelopmentRecordStatusCode } from '@/apis/portfolio/enums'
import type {
  PortfolioDevelopmentRecordEntryFieldVO,
  PortfolioDevelopmentRecordEntrySchemaVO,
} from '@/apis/portfolio/teacher-platform'
import type { PortfolioDevelopmentRecordEvidenceStatusCode } from '@/types/enums/portfolio-development-record-evidence-status-enum'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioDevelopmentRecordStatusDescription,
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordStatusCode as RecordStatus,
} from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { useQueryTable } from '@/composables/useQueryTable'
import { PortfolioDevelopmentRecordEvidenceStatusDescription } from '@/types/enums/portfolio-development-record-evidence-status-enum'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { PortfolioHonorLevelCode } from '@/types/enums/portfolio-honor-level-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const props = defineProps<{
  title: string
  subtitle: string
  recordType: PortfolioDevelopmentRecordTypeCode
  categoryCode?: string
  levelCode?: PortfolioHonorLevelCode
  nationalOnly?: boolean
  readonly?: boolean
}>()

const router = useRouter()
const importModalOpen = ref(false)
const saving = ref(false)
const removingId = ref('')
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
const applyingExport = ref(false)
const schemaLoading = ref(false)
const schemaLoadFailed = ref(false)
const entrySchema = ref<PortfolioDevelopmentRecordEntrySchemaVO | null>(null)
const uploadingFile = ref(false)
const attachmentName = ref('')
const attachmentInputRef = ref<HTMLInputElement | null>(null)
const form = reactive({
  recordTitle: '',
  descriptionText: '',
  teacherUserId: '',
  awardUnit: '',
  resourceForm: '',
  applicableScope: '',
  recordDate: '',
  fileId: '',
  recordStatus: RecordStatus.DRAFT as PortfolioDevelopmentRecordStatusCode,
})
const formTeacherId = computed(() => form.teacherUserId || undefined)
const { archiveWriteForbidden, archiveWriteBlockMessage, assertArchiveWritable }
  = usePortfolioArchiveWriteGuard({ teacherId: formTeacherId })
const { teacherOptions, searchTeachers } = usePortfolioTeacherSearch()
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  loadError,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable((params) =>
  portfolioDevelopmentRecordApi.page({
    ...params,
    recordType: props.recordType,
    categoryCode: props.categoryCode,
    levelCode: props.levelCode ?? (props.nationalOnly ? PortfolioHonorLevelCode.NATIONAL : undefined),
  }),
)

const requiresTeacher = computed(
  () => entrySchema.value?.teacherRequired === true
    || props.recordType === PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
)
const showEditor = computed(() => !props.readonly)
const evidenceRequired = computed(() => entrySchema.value?.evidenceRequired === true)
const schemaFields = computed(() => entrySchema.value?.fields ?? [])

const importContext = computed(() => ({
  defaultRecordType: props.recordType,
  ...(props.categoryCode ? { defaultCategoryCode: props.categoryCode } : {}),
  ...(props.levelCode ? { defaultLevelCode: props.levelCode } : {}),
  ...(props.nationalOnly ? { defaultLevelCode: PortfolioHonorLevelCode.NATIONAL } : {}),
}))

const columns = computed<ColumnsType>(() => {
  const base: ColumnsType = [
    { title: '资源名称', dataIndex: 'recordTitle', key: 'recordTitle' },
  ]
  if (requiresTeacher.value) {
    base.push({ title: '所属教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 })
  }
  if (evidenceRequired.value) {
    base.push({ title: '业务日', dataIndex: 'recordDate', key: 'recordDate', width: 110 })
    base.push({ title: '来源单位', dataIndex: 'awardUnit', key: 'awardUnit', width: 140 })
    base.push({ title: '形态', dataIndex: 'resourceForm', key: 'resourceForm', width: 120 })
    base.push({ title: '适用范围', dataIndex: 'applicableScope', key: 'applicableScope', width: 140 })
    base.push({ title: '证据', dataIndex: 'evidenceStatus', key: 'evidenceStatus', width: 96 })
  }
  base.push(
    { title: '状态', dataIndex: 'recordStatus', key: 'recordStatus', width: 88 },
    { title: '身份层', key: 'identityLayers', width: 160 },
    { title: '操作', key: 'actions', width: 120 },
  )
  return base
})

function recordStatusLabel(status: PortfolioDevelopmentRecordStatusCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordStatusDescription, status, '发展档案条目状态')
}

function evidenceStatusLabel(status: PortfolioDevelopmentRecordEvidenceStatusCode | undefined): string {
  if (!status) {
    return '—'
  }
  return strictEnumLabel(
    PortfolioDevelopmentRecordEvidenceStatusDescription,
    status,
    '发展档案证据状态',
  )
}

function fieldByCode(code: string): PortfolioDevelopmentRecordEntryFieldVO | undefined {
  return schemaFields.value.find((field) => field.fieldCode === code)
}

function fieldOptions(code: string) {
  return (fieldByCode(code)?.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))
}

function resetForm() {
  form.recordTitle = ''
  form.descriptionText = ''
  form.teacherUserId = ''
  form.awardUnit = ''
  form.resourceForm = ''
  form.applicableScope = ''
  form.recordDate = ''
  form.fileId = ''
  form.recordStatus = RecordStatus.DRAFT
  attachmentName.value = ''
}

async function loadEntrySchema() {
  schemaLoading.value = true
  schemaLoadFailed.value = false
  try {
    entrySchema.value = await portfolioDevelopmentRecordApi.entrySchema({
      recordType: props.recordType,
      categoryCode: props.categoryCode,
    })
  } catch (error) {
    entrySchema.value = null
    schemaLoadFailed.value = true
    showUserError(error, '加载资源库录入 schema 失败')
  } finally {
    schemaLoading.value = false
  }
}

async function refreshListAfterWrite(settledLabel: string) {
  await loadPage({ errorMessage: `${settledLabel}，列表刷新失败` })
}

function validateBySchema(): string | null {
  if (!entrySchema.value) {
    return '录入 schema 未就绪，请刷新页面后重试'
  }
  for (const field of entrySchema.value.fields) {
    if (!field.required) {
      continue
    }
    if (field.fieldCode === 'recordTitle' && !form.recordTitle.trim()) {
      return `请填写${field.fieldLabel}`
    }
    if (field.fieldCode === 'teacherUserId' && !form.teacherUserId) {
      return `请选择${field.fieldLabel}`
    }
    if (field.fieldCode === 'recordDate' && !form.recordDate) {
      return `请填写${field.fieldLabel}`
    }
    if (field.fieldCode === 'awardUnit' && !form.awardUnit.trim()) {
      return `请填写${field.fieldLabel}`
    }
    if (field.fieldCode === 'resourceForm' && !form.resourceForm) {
      return `请选择${field.fieldLabel}`
    }
    if (field.fieldCode === 'applicableScope' && !form.applicableScope.trim()) {
      return `请填写${field.fieldLabel}`
    }
    if (field.fieldCode === 'fileId' && !form.fileId) {
      return `请上传${field.fieldLabel}`
    }
    if (field.fieldCode === 'recordStatus' && !form.recordStatus) {
      return `请选择${field.fieldLabel}`
    }
  }
  return null
}

async function saveRecord() {
  if (saving.value) {
    return
  }
  const validationError = validateBySchema()
  if (validationError) {
    showFormValidationMessage(validationError)
    return
  }
  if (requiresTeacher.value && !assertArchiveWritable('保存发展记录')) {
    return
  }
  saving.value = true
  try {
    await portfolioDevelopmentRecordApi.save({
      recordType: props.recordType,
      recordTitle: form.recordTitle.trim(),
      categoryCode: props.categoryCode,
      levelCode: props.levelCode,
      descriptionText: form.descriptionText.trim() || undefined,
      teacherUserId: requiresTeacher.value ? form.teacherUserId : undefined,
      awardUnit: form.awardUnit.trim() || undefined,
      resourceForm: form.resourceForm || undefined,
      applicableScope: form.applicableScope.trim() || undefined,
      recordDate: form.recordDate || undefined,
      fileId: form.fileId || undefined,
      recordStatus: form.recordStatus,
    })
    void message.success('已保存')
    resetForm()
  } catch (error) {
    showUserError(error, '保存发展记录失败')
    return
  } finally {
    saving.value = false
  }
  await refreshListAfterWrite('已保存')
}

async function removeRecord(id: string) {
  if (removingId.value || saving.value) {
    return
  }
  removingId.value = id
  try {
    await portfolioDevelopmentRecordApi.delete({ id })
    void message.success('已删除')
  } catch (error) {
    showUserError(error, '删除发展记录失败')
    return
  } finally {
    removingId.value = ''
  }
  await refreshListAfterWrite('已删除')
}

async function onImportSuccess() {
  await refreshListAfterWrite('导入已完成')
}

function openExportApply() {
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  if (applyingExport.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  applyingExport.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.DEVELOPMENT_RECORD,
      businessRef: {
        developmentRecordType: props.recordType,
        categoryCode: props.categoryCode,
        levelCode: props.levelCode ?? (props.nationalOnly ? PortfolioHonorLevelCode.NATIONAL : undefined),
        nationalOnly: props.nationalOnly,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交发展档案导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交发展档案导出审批失败')
    return Promise.reject(error)
  } finally {
    applyingExport.value = false
  }
}

function openAttachmentPicker() {
  attachmentInputRef.value?.click()
}

async function onAttachmentPick(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const file = event.target.files?.[0]
  if (!file) {
    return
  }
  uploadingFile.value = true
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    form.fileId = uploaded.id
    attachmentName.value = uploaded.nodeName
    void message.success('证明材料已上传')
  } catch (error) {
    showUserError(error, '证明材料上传失败')
  } finally {
    uploadingFile.value = false
    event.target.value = ''
  }
}

watch(
  () => [props.recordType, props.categoryCode, props.levelCode, props.nationalOnly] as const,
  () => {
    resetForm()
    void loadEntrySchema()
    search()
  },
)

onMounted(() => {
  void loadEntrySchema()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title :title="title" :subtitle="subtitle" />
    </template>
    <UiCard v-if="showEditor" :title="entrySchema?.libraryName ? `${entrySchema.libraryName}·新增` : '新增条目'">
      <UiAlertStrip
        v-if="schemaLoadFailed"
        tone="error"
        title="录入 schema 加载失败"
        description="当前不可新建资源；切换范围或离开再进入后恢复"
        class="dp-mb-component"
      />
      <UiAlertStrip
        v-if="requiresTeacher && archiveWriteForbidden"
        tone="warning"
        title="档案写禁"
        :description="archiveWriteBlockMessage || '该教师档案当前禁止写入'"
        class="dp-mb-component"
      />
      <div v-if="!schemaLoadFailed" class="form-grid">
        <input
          ref="attachmentInputRef"
          type="file"
          class="hidden-file"
          @change="onAttachmentPick"
        />
        <template v-for="field in schemaFields" :key="field.fieldCode">
          <UiInput
            v-if="field.fieldCode === 'recordTitle'"
            size="sm"
            v-model="form.recordTitle"
            class="input input--wide"
            :placeholder="field.placeholder || field.fieldLabel"
          />
          <UiSelect
            v-else-if="field.fieldCode === 'teacherUserId'"
            size="sm"
            v-model="form.teacherUserId"
            allow-search
            allow-clear
            :placeholder="field.placeholder || field.fieldLabel"
            class="input input--teacher"
            :filter-option="false"
            :options="teacherOptions"
            @search="searchTeachers"
          />
          <UiDatePicker
            v-else-if="field.fieldCode === 'recordDate'"
            size="sm"
            v-model="form.recordDate"
            :placeholder="field.placeholder || field.fieldLabel"
          />
          <UiInput
            v-else-if="field.fieldCode === 'awardUnit'"
            size="sm"
            v-model="form.awardUnit"
            class="input"
            :placeholder="field.placeholder || field.fieldLabel"
          />
          <UiInput
            v-else-if="field.fieldCode === 'applicableScope'"
            size="sm"
            v-model="form.applicableScope"
            class="input"
            :placeholder="field.placeholder || field.fieldLabel"
          />
          <UiSelect
            v-else-if="field.fieldCode === 'resourceForm'"
            size="sm"
            v-model="form.resourceForm"
            :placeholder="field.placeholder || field.fieldLabel"
            class="input"
            :options="fieldOptions('resourceForm')"
          />
          <UiSelect
            v-else-if="field.fieldCode === 'recordStatus'"
            size="sm"
            v-model="form.recordStatus"
            :placeholder="field.placeholder || field.fieldLabel"
            class="input"
            :options="fieldOptions('recordStatus')"
          />
          <div v-else-if="field.fieldCode === 'fileId'" class="file-row">
            <UiButton size="sm" :loading="uploadingFile" @click="openAttachmentPicker">
              {{ attachmentName || field.placeholder || '上传证明材料' }}
            </UiButton>
          </div>
          <UiTextarea
            v-else-if="field.fieldCode === 'descriptionText'"
            size="sm"
            v-model="form.descriptionText"
            class="input input--wide"
            :rows="2"
            :placeholder="field.placeholder || field.fieldLabel"
          />
        </template>
        <UiButton
          size="sm"
          variant="primary"
          :loading="saving || schemaLoading"
          :disabled="saving || schemaLoading || schemaLoadFailed || (requiresTeacher && archiveWriteForbidden)"
          @click="saveRecord"
        >
          保存
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <div class="toolbar">
        <UiButton size="sm" @click="() => void loadPage()"> 刷新 </UiButton>
        <UiButton size="sm" variant="primary" v-if="showEditor" @click="importModalOpen = true">
          批量导入
        </UiButton>
        <UiButton
          size="sm"
          :loading="applyingExport"
          :disabled="applyingExport"
          @click="openExportApply"
        >
          申请导出
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!loadError && !loading && rows.length === 0"
        description="当前筛选无发展记录"
      />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        row-key="id"
        style="margin-top: var(--dp-space-block)"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacherUserId'">
            {{ formatPortfolioTeacherDisplay(record.teacherName, record.teacherNumber) }}
          </template>
          <template v-else-if="column.key === 'evidenceStatus'">
            {{ evidenceStatusLabel(record.evidenceStatus) }}
          </template>
          <template v-else-if="column.key === 'recordStatus'">
            {{ recordStatusLabel(record.recordStatus) }}
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="
                record.id
                  || record.teacherId
                  || record.teacherUserId
                  || record.subjectTeacherUserId
                  || record.userId
              "
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="showEditor"
              :items="[{ key: 'delete', label: '删除', tone: 'danger' }]"
              split
              @action="() => removeRecord(record.id)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiPlatformExcelImportModal
      v-if="showEditor"
      v-model:open="importModalOpen"
      entity-label="发展档案"
      :scene-key="ExcelImportSceneKey.PORTFOLIO_DEVELOPMENT_RECORD"
      :context="importContext"
      @success="onImportSuccess"
    />
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出发展档案台账"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="applyingExport"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="说明导出用途与使用范围"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
.input {
  width: 160px;
}
.input--wide {
  width: 240px;
}
.input--teacher {
  width: 220px;
}
.toolbar {
  display: flex;
  gap: var(--dp-space-component-tight);
}
.file-row {
  display: flex;
  align-items: center;
}
.hidden-file {
  display: none;
}
</style>
