<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import type {
  AccreditationCockpitVO,
  AccreditationCycleVO,
  AccreditationEvidenceCategory,
  AccreditationEvidenceSaveRequest,
  AccreditationEvidenceVO,
} from '@/apis/quality/accreditation'
import type { AssessmentItemVO } from '@/apis/quality/assessment-item'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  ACCREDITATION_EVIDENCE_ANCHOR_LABEL,
  ACCREDITATION_EVIDENCE_CATEGORY_LABEL,
  accreditationApi,
} from '@/apis/quality/accreditation'
import { archiveApi } from '@/apis/quality/archive'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import { CourseSelector } from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import {
  canExportExpertPackage,
  canMutateAccreditationEvidence,
  expertPackageExportBlockers,
} from '@/composables/useAccreditationWorkbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  programId: string
  trainingPlanId: string
  activeCycle?: AccreditationCycleVO
  cockpit?: AccreditationCockpitVO
}>()

const emit = defineEmits<{ 'count-change': [count: number], "exported": [] }>()

const CATEGORY_TABS: { key: '' | AccreditationEvidenceCategory, label: string }[] = [
  { key: '', label: '全部' },
  { key: 'EXAM_PAPER', label: '试卷样本' },
  { key: 'HOMEWORK', label: '作业样本' },
  { key: 'LAB_REPORT', label: '实验报告' },
  { key: 'GRADUATION_PROJECT', label: '毕业设计' },
  { key: 'COURSE_MATERIAL', label: '课程材料' },
  { key: 'FACILITY', label: '实验设施' },
  { key: 'MANAGEMENT_DOC', label: '管理文件' },
  { key: 'OTHER', label: '其他' },
]

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'evidenceCode', key: 'evidenceCode', width: 130 },
  { title: '标题', dataIndex: 'evidenceTitle', key: 'evidenceTitle' },
  { title: '类别', dataIndex: 'evidenceCategory', key: 'evidenceCategory', width: 100 },
  { title: '锚点', dataIndex: 'anchorType', key: 'anchorType', width: 110 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 90 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const loading = ref(false)
const exporting = ref(false)
const evidences = ref<AccreditationEvidenceVO[]>([])
const evidenceQuery = reactive({ pageNum: 1, pageSize: 10 })
const evidenceTotal = ref(0)
const categoryFilter = ref<'' | AccreditationEvidenceCategory>('')
const evidenceOpen = ref(false)
const evidenceDrawerTitle = ref('登记认证证据')
const markImportOpen = ref(false)
const linkedExams = ref<{ examId: string, label: string }[]>([])
const selectedExamIds = ref<string[]>([])

const evidenceForm = reactive<AccreditationEvidenceSaveRequest>({
  programId: '',
  trainingPlanId: '',
  evidenceCategory: 'HOMEWORK',
  anchorType: 'MANUAL',
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
    if (props.activeCycle.conclusionRegisteredAt) {
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
    evidences.value = readPageList(result, '认证证据列表加载失败，请刷新后重试')
    evidenceTotal.value = readPageTotal(result, '认证证据列表加载失败，请刷新后重试')
    evidenceQuery.pageNum = result.pageNum
    evidenceQuery.pageSize = result.pageSize
    if (evidences.value.length === 0 && evidenceTotal.value > 0 && evidenceQuery.pageNum > 1) {
      evidenceQuery.pageNum -= 1
      await loadEvidences()
      return
    }
    emitCount()
  } catch (e) {
    showUserError(e)
  } finally {
    loading.value = false
  }
}

async function loadLinkedExams() {
  linkedExams.value = []
  if (!props.trainingPlanId) return
  try {
    const courses = await readAllPages(
      (pageNum) =>
        qualityCourseApi.page({
          trainingPlanId: props.trainingPlanId,
          programId: props.programId,
          pageNum,
          pageSize: 100,
        }),
      '质量评价课程列表加载失败，请刷新后重试',
    )
    const seen = new Set<string>()
    for (const course of courses) {
      const items: AssessmentItemVO[] = await assessmentItemApi.listByCourse(course.id)
      for (const item of items) {
        if (item.sourceExamId && !seen.has(item.sourceExamId)) {
          seen.add(item.sourceExamId)
          linkedExams.value.push({
            examId: item.sourceExamId,
            label: `${course.courseName} / ${item.itemName}（考试 ${item.sourceExamId}）`,
          })
        }
      }
    }
  } catch (e) {
    showUserError(e)
  }
}

function resetEvidenceForm(category?: AccreditationEvidenceCategory) {
  evidenceForm.id = undefined
  evidenceForm.programId = props.programId
  evidenceForm.trainingPlanId = props.trainingPlanId
  evidenceForm.qualityCourseId = undefined
  evidenceForm.assessmentItemId = undefined
  evidenceForm.sourceExamId = undefined
  evidenceForm.anchorId = undefined
  evidenceForm.markScannedPageId = undefined
  evidenceForm.markPaperInstanceId = undefined
  evidenceForm.evidenceCategory = category || categoryFilter.value || 'HOMEWORK'
  evidenceForm.anchorType = 'MANUAL'
  evidenceForm.evidenceCode = ''
  evidenceForm.evidenceTitle = ''
  evidenceForm.evidenceDescription = ''
  evidenceForm.storageFileId = ''
  evidenceForm.schoolYear = undefined
  evidenceForm.semester = undefined
}

function openEvidenceCreate(category?: AccreditationEvidenceCategory) {
  if (!canMutateEvidence.value) {
    message.error(evidenceMutationHint.value || '当前不可登记认证证据')
    return
  }
  evidenceDrawerTitle.value = '登记认证证据'
  resetEvidenceForm(category)
  evidenceOpen.value = true
}

function openEvidenceEdit(record: AccreditationEvidenceVO) {
  if (!canMutateEvidence.value) {
    message.error(evidenceMutationHint.value || '当前不可编辑认证证据')
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

async function uploadEvidenceFile(option: UploadRequestOption) {
  const file = option.file as File
  try {
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_ACCREDITATION_EVIDENCE' })
    evidenceForm.storageFileId = uploaded.id
    if (!evidenceForm.evidenceTitle) evidenceForm.evidenceTitle = file.name
    option.onSuccess?.(uploaded)
    message.success('文件已上传')
  } catch (e) {
    option.onError?.(e as Error)
    showUserError(e)
  }
}

async function submitEvidence() {
  if (!evidenceForm.storageFileId) {
    message.error('请先上传证据文件')
    return
  }
  if (!evidenceForm.evidenceCode.trim() || !evidenceForm.evidenceTitle.trim()) {
    message.error('请填写证据编码与标题')
    return
  }
  if (evidenceForm.qualityCourseId) {
    evidenceForm.anchorType = 'QUALITY_COURSE'
    evidenceForm.anchorId = evidenceForm.qualityCourseId
  }
  try {
    if (evidenceForm.id) {
      await accreditationApi.evidenceUpdate(evidenceForm)
      message.success('证据已更新')
    } else {
      await accreditationApi.evidenceCreate(evidenceForm)
      message.success('证据已登记')
    }
    evidenceOpen.value = false
    await loadEvidences()
  } catch (e) {
    showUserError(e)
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
    message.error(evidenceMutationHint.value || '当前不可删除认证证据')
    return
  }
  const ok = await confirmAsync({ title: '确认删除该证据？' })
  if (!ok) return
  try {
    await accreditationApi.evidenceDelete(id)
    await loadEvidences()
  } catch (e) {
    showUserError(e)
  }
}

async function openMarkImport() {
  if (!canMutateEvidence.value) {
    message.error(evidenceMutationHint.value || '当前不可同步 mark 扫描页证据')
    return
  }
  await loadLinkedExams()
  selectedExamIds.value = []
  markImportOpen.value = true
}

async function submitMarkImport() {
  if (selectedExamIds.value.length === 0) {
    message.error('请选择至少一场已关联 edu-mark 的考试')
    return
  }
  try {
    const count = await accreditationApi.importMarkExamEvidence({
      programId: props.programId,
      trainingPlanId: props.trainingPlanId,
      examIds: selectedExamIds.value,
    })
    message.success(`已同步 ${count} 条扫描页证据`)
    markImportOpen.value = false
    await loadEvidences()
  } catch (e) {
    showUserError(e)
  }
}

async function exportExpertPackage() {
  if (!props.trainingPlanId) return
  if (!canExportPackage.value) {
    message.error(exportPackageHint.value || '专家材料包导出条件未满足')
    return
  }
  exporting.value = true
  try {
    await archiveApi.exportExpertPackage({
      packageType: 'PROGRAM_ACCREDITATION',
      targetId: props.trainingPlanId,
      archiveCode: `ACCRED-PKG-${props.trainingPlanId}`,
      archiveCategory: 'PROGRAM_ACCREDITATION',
      notes: '认证驾驶舱导出专业认证专家材料包',
    })
    message.success('专家材料包导出任务已提交')
    emit('exported')
  } catch (e) {
    showUserError(e)
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
      <a-radio-group v-model:value="categoryFilter" button-style="solid" size="small">
        <a-radio-button v-for="tab in CATEGORY_TABS" :key="tab.key || 'all'" :value="tab.key">
          {{ tab.label }}
        </a-radio-button>
      </a-radio-group>
      <div class="toolbar-actions">
        <UiButton
          variant="primary"
          :disabled="!trainingPlanId || !canMutateEvidence"
          @click="openEvidenceCreate()"
        >
          上传登记
        </UiButton>
        <UiButton
          variant="outline"
          :disabled="!trainingPlanId || !canMutateEvidence"
          @click="openMarkImport"
        >
          mark 扫描页同步
        </UiButton>
        <UiButton
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
              ACCREDITATION_EVIDENCE_CATEGORY_LABEL,
              record.evidenceCategory,
              '认证证据类别',
            )
          }}
        </template>
        <template v-else-if="column.key === 'anchorType'">
          {{
            strictEnumLabel(
              ACCREDITATION_EVIDENCE_ANCHOR_LABEL,
              record.anchorType,
              '认证证据锚点类型',
            )
          }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiButton size="sm" variant="ghost" @click="downloadEvidence(record)">下载</UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!canMutateEvidence"
            @click="openEvidenceEdit(record)"
          >
            编辑
          </UiButton>
          <UiButton
            size="sm"
            status="danger"
            variant="ghost"
            :disabled="!canMutateEvidence"
            @click="deleteEvidence(record.id)"
          >
            删除
          </UiButton>
        </template>
      </template>
      <template #empty>
        <UiEmpty description="按类别上传或从 mark 同步，供专家包 manifest 引用 fileId" />
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
      <a-form layout="vertical">
        <a-form-item label="证据类别" required>
          <a-select v-model:value="evidenceForm.evidenceCategory" :disabled="evidenceEditing">
            <a-select-option value="EXAM_PAPER">试卷样本</a-select-option>
            <a-select-option value="HOMEWORK">作业样本</a-select-option>
            <a-select-option value="LAB_REPORT">实验报告</a-select-option>
            <a-select-option value="GRADUATION_PROJECT">毕业设计</a-select-option>
            <a-select-option value="COURSE_MATERIAL">课程材料</a-select-option>
            <a-select-option value="FACILITY">实验设施</a-select-option>
            <a-select-option value="MANAGEMENT_DOC">管理文件</a-select-option>
            <a-select-option value="OTHER">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="关联课程">
          <CourseSelector
            v-model:value="evidenceForm.qualityCourseId"
            :training-plan-id="trainingPlanId"
            :program-id="programId"
            :disabled="evidenceEditing"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="证据编码" required>
          <a-input v-model:value="evidenceForm.evidenceCode" :disabled="evidenceEditing" />
        </a-form-item>
        <a-form-item label="证据标题" required>
          <a-input v-model:value="evidenceForm.evidenceTitle" />
        </a-form-item>
        <a-form-item label="学年">
          <a-input v-model:value="evidenceForm.schoolYear" placeholder="如 2024-2025" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="evidenceForm.evidenceDescription" :rows="3" />
        </a-form-item>
        <a-form-item
          :label="evidenceForm.id ? '证据文件（重新上传可替换）' : '证据文件'"
          :required="!evidenceForm.id"
        >
          <a-upload :custom-request="uploadEvidenceFile" :max-count="1">
            <UiButton variant="outline">选择文件</UiButton>
          </a-upload>
          <p v-if="evidenceForm.id && evidenceForm.storageFileId" class="file-hint">
            当前 fileId：{{ evidenceForm.storageFileId }}
          </p>
        </a-form-item>
      </a-form>
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
      <a-checkbox-group v-else v-model:value="selectedExamIds" class="exam-list">
        <a-checkbox v-for="exam in linkedExams" :key="exam.examId" :value="exam.examId">
          {{ exam.label }}
        </a-checkbox>
      </a-checkbox-group>
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
  color: rgba(0, 0, 0, 0.55);
}
.file-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin: 8px 0 0;
}
</style>
