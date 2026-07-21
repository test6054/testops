<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AccreditationCockpitVO,
  AccreditationCycleVO,
  AccreditationEvidenceSaveRequest,
  AccreditationEvidenceVO,
} from '@/apis/quality/accreditation'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  accreditationApi,
  AccreditationEvidenceAnchorTypeCode,
  AccreditationEvidenceAnchorTypeDescription,
  AccreditationEvidenceCategoryCode,
  AccreditationEvidenceCategoryDescription,
  ALL_ACCREDITATION_EVIDENCE_CATEGORY_CODES,
} from '@/apis/quality/accreditation'
import { archiveApi } from '@/apis/quality/archive'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import { CourseSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCheckboxGroup from '@/components/ui-guide/ui/UiCheckboxGroup.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRadio from '@/components/ui-guide/ui/UiRadio.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import {
  canExportExpertPackage,
  canMutateAccreditationEvidence,
  expertPackageExportBlockers,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ExpertPackageTypeCode } from '@/types/enums/expert-package-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  activeCycle?: AccreditationCycleVO
  cockpit?: AccreditationCockpitVO
}>()

const emit = defineEmits<{ 'count-change': [count: number], "exported": [] }>()

const CATEGORY_TABS: { key: '' | AccreditationEvidenceCategoryCode, label: string }[] = [
  { key: '', label: '全部' },
  ...ALL_ACCREDITATION_EVIDENCE_CATEGORY_CODES.map((key) => ({
    key,
    label: strictEnumLabel(AccreditationEvidenceCategoryDescription, key, '认证证据类别'),
  })),
]

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'evidenceCode', key: 'evidenceCode', width: 130, fixed: 'left' },
  { title: '标题', dataIndex: 'evidenceTitle', key: 'evidenceTitle' },
  { title: '类别', dataIndex: 'evidenceCategory', key: 'evidenceCategory', width: 100 },
  { title: '锚点', dataIndex: 'anchorType', key: 'anchorType', width: 110 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 90 },
  { title: '操作', key: 'actions', width: 200 },
]

const loading = ref(false)
const exporting = ref(false)
const evidences = ref<AccreditationEvidenceVO[]>([])
const evidenceQuery = reactive({ pageNum: 1, pageSize: 10 })
const evidenceTotal = ref(0)
const categoryFilter = ref<'' | AccreditationEvidenceCategoryCode>('')
const evidenceOpen = ref(false)
const evidenceDrawerTitle = ref('登记认证证据')
const markImportOpen = ref(false)
const linkedExams = ref<{ examId: string, label: string }[]>([])
const selectedExamIds = ref<string[]>([])

const evidenceForm = reactive<AccreditationEvidenceSaveRequest>({
  programId: '',
  trainingPlanId: '',
  evidenceCategory: AccreditationEvidenceCategoryCode.HOMEWORK,
  anchorType: AccreditationEvidenceAnchorTypeCode.MANUAL,
  evidenceCode: '',
  evidenceTitle: '',
  evidenceDescription: '',
  storageFileId: '',
})
const evidenceEditing = computed(() => !!evidenceForm.id)

const canMutateEvidence = computed(() => canMutateAccreditationEvidence(props.activeCycle))

const canExportPackage = computed(() =>
  canExportExpertPackage(props.activeCycle, props.cockpit, evidenceTotal.value),
)

const exportPackageHint = computed(() => {
  const blockers = expertPackageExportBlockers(
    props.activeCycle,
    props.cockpit,
    evidenceTotal.value,
  )
  return blockers.length ? blockers.join('；') : ''
})

const evidenceMutationHint = computed(() => {
  if (!props.activeCycle) {
    return '请先创建并启用认证周期后再登记证据'
  }
  if (!canMutateEvidence.value) {
    if (props.activeCycle.conclusionRegisteredTime) {
      return '认证结论登记后原始资料证据已冻结，仅可下载查阅'
    }
    return '当前认证阶段不允许维护原始资料证据'
  }
  return ''
})

function emitCount() {
  emit('count-change', evidenceTotal.value)
}

async function loadEvidences() {
  if (!props.trainingPlanId) {
    evidences.value = []
    evidenceTotal.value = 0
    emitCount()
    return
  }
  loading.value = true
  try {
    const result = await accreditationApi.evidencePage({
      programId: props.programId,
      trainingPlanId: props.trainingPlanId,
      evidenceCategory: categoryFilter.value || undefined,
      pageNum: evidenceQuery.pageNum,
      pageSize: evidenceQuery.pageSize,
    })
    evidences.value = result.list
    evidenceTotal.value = result.total
    evidenceQuery.pageNum = result.pageNum
    evidenceQuery.pageSize = result.pageSize
    if (evidences.value.length === 0 && evidenceTotal.value > 0 && evidenceQuery.pageNum > 1) {
      evidenceQuery.pageNum -= 1
      await loadEvidences()
      return
    }
    emitCount()
  } catch (e) {
    showUserError(e, '认证证据加载失败')
  } finally {
    loading.value = false
  }
}

async function loadLinkedExams() {
  linkedExams.value = []
  if (!props.trainingPlanId) return
  try {
    const options = await accreditationApi.linkedExamOptions({
      trainingPlanId: props.trainingPlanId,
      programId: props.programId,
    })
    linkedExams.value = options.map((item) => ({
      examId: item.sourceExamId,
      label: item.label,
    }))
  } catch (e) {
    showUserError(e, '关联考试选项加载失败')
  }
}

function resetEvidenceForm(category?: AccreditationEvidenceCategoryCode) {
  evidenceForm.id = undefined
  evidenceForm.programId = props.programId
  evidenceForm.trainingPlanId = props.trainingPlanId
  evidenceForm.qualityCourseId = undefined
  evidenceForm.assessmentItemId = undefined
  evidenceForm.sourceExamId = undefined
  evidenceForm.anchorId = undefined
  evidenceForm.markScannedPageId = undefined
  evidenceForm.markPaperInstanceId = undefined
  evidenceForm.evidenceCategory
    = category || categoryFilter.value || AccreditationEvidenceCategoryCode.HOMEWORK
  evidenceForm.anchorType = AccreditationEvidenceAnchorTypeCode.MANUAL
  evidenceForm.evidenceCode = ''
  evidenceForm.evidenceTitle = ''
  evidenceForm.evidenceDescription = ''
  evidenceForm.storageFileId = ''
  evidenceForm.schoolYear = undefined
  evidenceForm.semester = undefined
}

function openEvidenceCreate(category?: AccreditationEvidenceCategoryCode) {
  if (!canMutateEvidence.value) {
    void message.error(evidenceMutationHint.value || '当前不可登记认证证据')
    return
  }
  evidenceDrawerTitle.value = '登记认证证据'
  resetEvidenceForm(category)
  evidenceOpen.value = true
}

function openEvidenceEdit(record: AccreditationEvidenceVO) {
  if (!canMutateEvidence.value) {
    void message.error(evidenceMutationHint.value || '当前不可编辑认证证据')
    return
  }
  evidenceDrawerTitle.value = '编辑认证证据'
  evidenceForm.id = record.id
  evidenceForm.programId = record.programId
  evidenceForm.trainingPlanId = record.trainingPlanId
  evidenceForm.qualityCourseId = record.qualityCourseId
  evidenceForm.assessmentItemId = record.assessmentItemId
  evidenceForm.sourceExamId = record.sourceExamId
  evidenceForm.evidenceCategory = record.evidenceCategory
  evidenceForm.anchorType = record.anchorType
  evidenceForm.anchorId = record.anchorId
  evidenceForm.markScannedPageId = record.markScannedPageId
  evidenceForm.markPaperInstanceId = record.markPaperInstanceId
  evidenceForm.evidenceCode = record.evidenceCode
  evidenceForm.evidenceTitle = record.evidenceTitle
  evidenceForm.evidenceDescription = record.evidenceDescription || ''
  evidenceForm.storageFileId = record.storageFileId
  evidenceForm.schoolYear = record.schoolYear
  evidenceForm.semester = record.semester
  evidenceOpen.value = true
}

const evidenceFileName = ref<string>()

watch(evidenceFileName, (name) => {
  if (name && !evidenceForm.evidenceTitle) {
    evidenceForm.evidenceTitle = name
  }
})

async function submitEvidence() {
  if (!evidenceForm.storageFileId) {
    void message.error('请先上传证据文件')
    return
  }
  if (!evidenceForm.evidenceCode.trim() || !evidenceForm.evidenceTitle.trim()) {
    void message.error('请填写证据编码与标题')
    return
  }
  if (evidenceForm.qualityCourseId) {
    evidenceForm.anchorType = AccreditationEvidenceAnchorTypeCode.QUALITY_COURSE
    evidenceForm.anchorId = evidenceForm.qualityCourseId
  }
  const request: AccreditationEvidenceSaveRequest = {
    id: evidenceForm.id,
    programId: evidenceForm.programId,
    trainingPlanId: evidenceForm.trainingPlanId,
    qualityCourseId: evidenceForm.qualityCourseId || undefined,
    assessmentItemId: evidenceForm.assessmentItemId || undefined,
    sourceExamId: evidenceForm.sourceExamId || undefined,
    evidenceCategory: evidenceForm.evidenceCategory,
    anchorType: evidenceForm.anchorType,
    anchorId: evidenceForm.anchorId || undefined,
    evidenceCode: evidenceForm.evidenceCode.trim(),
    evidenceTitle: evidenceForm.evidenceTitle.trim(),
    evidenceDescription: evidenceForm.evidenceDescription?.trim() || undefined,
    storageFileId: evidenceForm.storageFileId,
    schoolYear: evidenceForm.schoolYear?.trim() || undefined,
    semester: evidenceForm.semester,
    markScannedPageId: evidenceForm.markScannedPageId || undefined,
    markPaperInstanceId: evidenceForm.markPaperInstanceId || undefined,
  }
  try {
    if (evidenceForm.id) {
      await accreditationApi.evidenceUpdate(request)
      void message.success('证据已更新')
    } else {
      await accreditationApi.evidenceCreate(request)
      void message.success('证据已登记')
    }
    evidenceOpen.value = false
    await loadEvidences()
  } catch (e) {
    showUserError(e, '认证证据保存失败')
  }
}

async function downloadEvidence(record: AccreditationEvidenceVO) {
  await handleDownloadFile({
    fileId: record.storageFileId,
    fileName: record.evidenceTitle,
  })
}

async function deleteEvidence(id: string) {
  if (!canMutateEvidence.value) {
    void message.error(evidenceMutationHint.value || '当前不可删除认证证据')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该证据？' })
  if (!ok) return
  try {
    await accreditationApi.evidenceDelete(id)
    await loadEvidences()
  } catch (e) {
    showUserError(e, '认证证据删除失败')
  }
}

function handleEvidenceRowAction(key: string, record: AccreditationEvidenceVO) {
  if (key === 'download') void downloadEvidence(record)
  else if (key === 'edit') openEvidenceEdit(record)
  else if (key === 'delete') void deleteEvidence(record.id)
}

async function openMarkImport() {
  if (!canMutateEvidence.value) {
    void message.error(evidenceMutationHint.value || '当前不可同步阅卷考试扫描页证据')
    return
  }
  await loadLinkedExams()
  selectedExamIds.value = []
  markImportOpen.value = true
}

async function submitMarkImport() {
  if (selectedExamIds.value.length === 0) {
    showFormValidationMessage('请选择至少一场已关联阅卷考试的考试')
    return
  }
  try {
    const count = await accreditationApi.importMarkExamEvidence({
      programId: props.programId,
      trainingPlanId: props.trainingPlanId,
      examIds: selectedExamIds.value,
    })
    void message.success(`已同步 ${count} 条扫描页证据`)
    markImportOpen.value = false
    await loadEvidences()
  } catch (e) {
    showUserError(e, '扫描页证据同步失败')
  }
}

async function exportExpertPackage() {
  if (!props.trainingPlanId) return
  if (!canExportPackage.value) {
    void message.error(exportPackageHint.value || '专家材料包导出条件未满足')
    return
  }
  exporting.value = true
  try {
    await archiveApi.exportExpertPackage({
      packageType: ExpertPackageTypeCode.PROGRAM_ACCREDITATION,
      targetId: props.trainingPlanId,
      archiveCode: `ACCRED-PKG-${props.trainingPlanId}`,
      archiveCategory: ExpertPackageTypeCode.PROGRAM_ACCREDITATION,
      notes: '认证驾驶舱导出专业认证专家材料包',
    })
    void message.success('专家材料包导出任务已提交')
    emit('exported')
  } catch (e) {
    showUserError(e, '专家材料包导出失败')
  } finally {
    exporting.value = false
  }
}

async function handleEvidencePageChange(pageEvent: { current: number, pageSize: number }) {
  evidenceQuery.pageNum = pageEvent.current
  evidenceQuery.pageSize = pageEvent.pageSize
  await loadEvidences()
}

watch(categoryFilter, async () => {
  evidenceQuery.pageNum = 1
  await loadEvidences()
})
watch(
  () => [props.programId, props.trainingPlanId],
  async () => {
    evidenceQuery.pageNum = 1
    await loadEvidences()
  },
  { immediate: true },
)

defineExpose({ loadEvidences })
</script>

<template>
  <div class="evidence-panel">
    <p v-if="exportPackageHint && !canExportPackage" class="hint">{{ exportPackageHint }}</p>
    <p v-if="evidenceMutationHint" class="hint">{{ evidenceMutationHint }}</p>
    <div class="toolbar">
      <UiRadioGroup v-model="categoryFilter" size="sm">
        <UiRadio v-for="tab in CATEGORY_TABS" :key="tab.key || 'all'" :value="tab.key">
          {{ tab.label }}
        </UiRadio>
      </UiRadioGroup>
      <div class="toolbar-actions">
        <UiButton
          size="sm"
          variant="primary"
          :disabled="!trainingPlanId || !canMutateEvidence"
          @click="openEvidenceCreate()"
        >
          上传登记
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :disabled="!trainingPlanId || !canMutateEvidence"
          @click="openMarkImport"
        >
          mark 扫描页同步
        </UiButton>
        <UiButton
          size="sm"
          variant="outline"
          :loading="exporting"
          :disabled="!trainingPlanId || !canExportPackage"
          @click="exportExpertPackage"
        >
          导出专家材料包
        </UiButton>
      </div>
    </div>
    <UiDataTable
      v-model:current="evidenceQuery.pageNum"
      v-model:page-size="evidenceQuery.pageSize"
      :columns="columns"
      :data-source="evidences"
      :loading="loading"
      :total="evidenceTotal"
      row-key="id"
      @page-change="handleEvidencePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'evidenceCategory'">
          {{
            strictEnumLabel(
              AccreditationEvidenceCategoryDescription,
              record.evidenceCategory,
              '认证证据类别',
            )
          }}
        </template>
        <template v-else-if="column.key === 'anchorType'">
          {{
            strictEnumLabel(
              AccreditationEvidenceAnchorTypeDescription,
              record.anchorType,
              '认证证据锚点类型',
            )
          }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="[
              { key: 'download', label: '下载' },
              { key: 'edit', label: '编辑', disabled: !canMutateEvidence },
              { key: 'delete', label: '删除', tone: 'danger', disabled: !canMutateEvidence },
            ]"
            split
            @action="(key) => handleEvidenceRowAction(key, record)"
          />
        </template>
      </template>
      <template #empty>
        <UiEmpty size="sm" description="按类别上传或从 mark 同步，供专家包 manifest 引用 fileId" />
      </template>
    </UiDataTable>
    <UiDrawer
      v-model:open="evidenceOpen"
      :title="evidenceDrawerTitle"
      width="520"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEvidence"
    >
      <UiForm layout="vertical">
        <UiFormItem label="证据类别" required>
          <UiSelect
            v-model="evidenceForm.evidenceCategory"
            :disabled="evidenceEditing"
            size="sm"
            :options="[
              { value: 'EXAM_PAPER', label: '试卷样本' },
              { value: 'HOMEWORK', label: '作业样本' },
              { value: 'LAB_REPORT', label: '实验报告' },
              { value: 'GRADUATION_PROJECT', label: '毕业设计' },
              { value: 'COURSE_MATERIAL', label: '课程材料' },
              { value: 'FACILITY', label: '实验设施' },
              { value: 'MANAGEMENT_DOC', label: '管理文件' },
              { value: 'OTHER', label: '其他' },
            ]"
          />
        </UiFormItem>
        <UiFormItem label="关联课程">
          <CourseSelector
            v-model:value="evidenceForm.qualityCourseId"
            :training-plan-id="trainingPlanId"
            :program-id="programId"
            :disabled="evidenceEditing"
            allow-clear
          />
        </UiFormItem>
        <UiFormItem label="证据编码" required>
          <UiInput size="sm" v-model="evidenceForm.evidenceCode" :disabled="evidenceEditing" />
        </UiFormItem>
        <UiFormItem label="证据标题" required>
          <UiInput size="sm" v-model="evidenceForm.evidenceTitle" />
        </UiFormItem>
        <UiFormItem label="学年">
          <UiInput size="sm" v-model="evidenceForm.schoolYear" placeholder="如 2024-2025" />
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="evidenceForm.evidenceDescription" :rows="3" />
        </UiFormItem>
        <UiFormItem
          :label="evidenceForm.id ? '证据文件（重新上传可替换）' : '证据文件'"
          :required="!evidenceForm.id"
        >
          <UiPlatformFileField
            v-model:file-node-id="evidenceForm.storageFileId"
            v-model:file-name="evidenceFileName"
            :scene-key="FileUploadSceneKey.QUALITY_ACCREDITATION_EVIDENCE"
            button-text="选择文件"
          />
          <p v-if="evidenceForm.id && evidenceForm.storageFileId" class="file-hint">
            当前 fileId：{{ evidenceForm.storageFileId }}
          </p>
        </UiFormItem>
      </UiForm>
    </UiDrawer>
    <UiDrawer
      v-model:open="markImportOpen"
      title="从 edu-mark 同步扫描页"
      width="520"
      :hide-footer="false"
      ok-text="同步"
      @ok="submitMarkImport"
    >
      <p v-if="linkedExams.length === 0" class="hint">
        培养方案下考核环节未绑定 edu-mark 考试 ID，请先在课程矩阵配置 sourceExamId。
      </p>
      <UiCheckboxGroup v-else v-model="selectedExamIds" class="exam-list" direction="vertical">
        <UiCheckbox v-for="exam in linkedExams" :key="exam.examId" :value="exam.examId">
          {{ exam.label }}
        </UiCheckbox>
      </UiCheckboxGroup>
    </UiDrawer>
  </div>
</template>

<style scoped>
.evidence-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.exam-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hint {
  font-size: 13px;
  color: var(--dp-text-tertiary);
}
.file-hint {
  font-size: 12px;
  color: var(--dp-text-tertiary);
  margin: 8px 0 0;
}
</style>
