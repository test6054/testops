<template>
  <div class="archive-volume-material-table">
    <div v-if="canRegisterMaterial" class="archive-volume-material-table__toolbar">
      <UiButton size="sm" @click="openUploadModal">登记材料</UiButton>
      <UiButton
        v-if="canGenerateExamReports"
        size="sm"
        variant="outline"
        :loading="generatingExamAnalysis"
        @click="handleGenerateExamAnalysis"
      >
        生成试卷分析
      </UiButton>
      <UiButton
        v-if="canGenerateExamReports"
        size="sm"
        variant="outline"
        :loading="generatingCourseObjective"
        @click="handleGenerateCourseObjective"
      >
        生成达成度报告
      </UiButton>
      <UiButton size="sm" variant="outline" @click="openArchiveScan">一体机扫描</UiButton>
      <UiButton size="sm" variant="outline" @click="batchRegisterOpen = true">批量登记</UiButton>
      <UiButton size="sm" variant="outline" @click="courseSyncOpen = true">课程平台同步</UiButton>
      <UiButton size="sm" variant="outline" @click="openSharedRefModal">引用合用材料</UiButton>
    </div>
    <p
      v-if="canGenerateExamReports && courseObjectiveMappingHint"
      class="archive-volume-material-table__mapping-hint"
    >
      {{ courseObjectiveMappingHint }}
      <RouterLink
        v-if="courseObjectiveMappingPath"
        :to="courseObjectiveMappingPath"
        class="archive-volume-material-table__mapping-link"
      >
        前往考试统计维护映射
      </RouterLink>
    </p>
    <UiDataTable
      pagination-mode="none"
      :columns="materialColumns"
      :data-source="filteredMaterials"
      :show-pagination="false"
      flat
      row-key="materialId"
      size="middle"
      empty-description="该目录项下暂无材料"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'materialType'">
          {{ materialTypeLabel(record.materialType) }}
        </template>
        <template v-else-if="column.key === 'submissionStatus'">
          <span v-if="record.submissionStatus" class="archive-volume-material-table__status">
            <span
              class="archive-volume-material-table__status-icon"
              :class="`archive-volume-material-table__status-icon--${submissionStatusTone(record.submissionStatus)}`"
              aria-hidden="true"
            />
            <UiTag :tone="submissionStatusTone(record.submissionStatus)" size="sm">
              {{ submissionStatusLabel(record.submissionStatus) }}
            </UiTag>
          </span>
        </template>
        <template v-else-if="column.key === 'ocrStatus'">
          <span v-if="record.ocrStatus" class="archive-volume-material-table__status">
            <span
              class="archive-volume-material-table__status-icon"
              :class="`archive-volume-material-table__status-icon--${materialOcrStatusTone(record.ocrStatus)}`"
              aria-hidden="true"
            />
            <UiTag :tone="materialOcrStatusTone(record.ocrStatus)" size="sm">
              {{ materialOcrStatusLabel(record.ocrStatus) }}
            </UiTag>
          </span>
          <span
            v-if="record.ocrStatus === 'FAILED' && record.ocrFailureReason"
            class="archive-volume-material-table__ocr-failure"
          >
            {{ record.ocrFailureReason }}
          </span>
        </template>
        <template v-else-if="column.key === 'materialActions'">
          <UiTextAction
            v-if="canViewMaterialOcr(record)"
            tone="primary"
            @click="openMaterialOcrDetail(record)"
          >
            查看 OCR
          </UiTextAction>
          <UiTextAction
            v-if="canRetryMaterialOcr(record)"
            tone="primary"
            @click="confirmRetryMaterialOcr(record)"
          >
            重试 OCR
          </UiTextAction>
        </template>
      </template>
    </UiDataTable>

    <a-modal
      v-model:open="uploadModalOpen"
      title="登记归档材料"
      :confirm-loading="uploading"
      ok-text="登记"
      cancel-text="取消"
      @ok="submitMaterial"
    >
      <a-form layout="vertical">
        <a-form-item label="材料类型" required>
          <a-select
            v-model:value="uploadForm.materialType"
            :options="materialTypeOptions"
            placeholder="选择材料类型"
          />
        </a-form-item>
        <a-form-item label="学号">
          <a-input v-model:value="uploadForm.studentNo" placeholder="学生试卷可填学号" />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input v-model:value="uploadForm.studentName" placeholder="学生姓名" />
        </a-form-item>
        <a-form-item label="重修/补考">
          <a-checkbox v-model:checked="uploadForm.retakeFlag">标记为重修或补考答卷</a-checkbox>
        </a-form-item>
        <a-form-item v-if="uploadForm.retakeFlag" label="补考轮次">
          <a-input v-model:value="uploadForm.makeupRound" placeholder="如 补考1" />
        </a-form-item>
        <a-form-item label="扫描文件" required>
          <UiPlatformFileField
            v-model:file-node-id="uploadForm.fileNodeId"
            v-model:file-name="uploadForm.fileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="sharedRefModalOpen"
      title="引用合用材料"
      :confirm-loading="sharedRefSubmitting"
      ok-text="保存引用"
      cancel-text="取消"
      @ok="submitSharedRef"
    >
      <a-form layout="vertical">
        <a-form-item label="引用类型" required>
          <a-select
            v-model:value="sharedRefForm.refType"
            :options="sharedRefTypeOptions"
            placeholder="选择引用类型"
          />
        </a-form-item>
        <a-form-item label="目标卷 ID" required>
          <a-input
            v-model:value="sharedRefForm.targetVolumeId"
            placeholder="合用材料所在归档卷 ID"
          />
        </a-form-item>
        <a-form-item label="目标材料 ID" required>
          <a-input v-model:value="sharedRefForm.targetMaterialId" placeholder="目标材料 ID" />
        </a-form-item>
        <a-form-item label="目录备注">
          <a-input v-model:value="sharedRefForm.catalogNote" placeholder="如 合用材料见××班级卷" />
        </a-form-item>
      </a-form>
    </a-modal>

    <ArchiveVolumeBatchRegisterModal
      v-model:open="batchRegisterOpen"
      :volume-id="volumeId"
      @success="emitRefreshed"
    />
    <ArchiveVolumeCourseSyncModal
      v-model:open="courseSyncOpen"
      :volume-id="volumeId"
      @success="emitRefreshed"
    />
    <ArchiveVolumeMaterialOcrDetailModal
      v-model:open="ocrDetailOpen"
      :material-id="ocrDetailMaterialId"
    />
    <ScanDispatchDialog
      v-model:open="scanDispatchOpen"
      :volume-id="volumeId"
      :catalog-code="scanDispatchQuery?.catalogCode"
      :material-type="scanDispatchMaterialType"
      :archive-batch-mode="scanDispatchQuery?.batchMode"
      :archive-title="detail.volume.archiveTitle"
      @created="handleDispatchCreated"
    />
    <ScanDispatchResultDialog
      v-model:open="scanDispatchResultOpen"
      :volume-id="volumeId"
      :payload="scanDispatchResult"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import type { PaperArchiveOcrStatusCode } from '@/apis/mark/paper-archive'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ScanDispatchResultPayload } from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL,
  ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE,
  ARCHIVE_MATERIAL_TYPE_LABEL,
  generateArchiveVolumeCourseObjectiveReport,
  generateArchiveVolumeExamAnalysisReport,
  registerArchiveSharedMaterialRef,
  registerArchiveVolumeMaterial,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import {
  PAPER_ARCHIVE_OCR_STATUS_LABEL,
  PAPER_ARCHIVE_OCR_STATUS_TONE,
} from '@/apis/mark/paper-archive'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeBatchRegisterModal from '@/views/teacher/archive-volume/archive-volume-batch-register-modal.vue'
import ArchiveVolumeCourseSyncModal from '@/views/teacher/archive-volume/archive-volume-course-sync-modal.vue'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'
import ScanDispatchDialog from '@/views/teacher/archive-volume/components/ScanDispatchDialog.vue'
import ScanDispatchResultDialog from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'

defineOptions({ name: 'ArchiveVolumeMaterialTablePanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  selectedCatalogKeys: string[]
  canRegisterMaterial: boolean
}>()

const emit = defineEmits<{
  "refreshed": [options?: { silent?: boolean }]
  'ocr-completed-stale': []
}>()

const route = useRoute()
const batchRegisterOpen = ref(false)
const courseSyncOpen = ref(false)
const uploading = ref(false)
const generatingExamAnalysis = ref(false)
const generatingCourseObjective = ref(false)
const uploadModalOpen = ref(false)
const sharedRefModalOpen = ref(false)
const sharedRefSubmitting = ref(false)
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref<string>()
const scanDispatchOpen = ref(false)
const scanDispatchResultOpen = ref(false)
const scanDispatchQuery = ref<Record<string, string> | null>(null)
const scanDispatchResult = ref<ScanDispatchResultPayload | null>(null)

const scanDispatchMaterialType = computed(() => {
  const value = scanDispatchQuery.value?.materialType
  if (!value) {
    return undefined
  }
  if (value in ARCHIVE_MATERIAL_TYPE_LABEL) {
    return value as ArchiveMaterialTypeCode
  }
  return undefined
})

const uploadForm = reactive({
  materialType: undefined as ArchiveMaterialTypeCode | undefined,
  fileNodeId: undefined as string | undefined,
  fileName: undefined as string | undefined,
  studentNo: '',
  studentName: '',
  retakeFlag: false,
  makeupRound: '',
})
const sharedRefForm = reactive({
  refType: 'MERGED_CLASS_SHARED' as 'UNIFIED_EXAM_PUBLIC' | 'MERGED_CLASS_SHARED',
  targetVolumeId: '',
  targetMaterialId: '',
  catalogNote: '',
})
const sharedRefTypeOptions = [
  { value: 'UNIFIED_EXAM_PUBLIC', label: '统考公用' },
  { value: 'MERGED_CLASS_SHARED', label: '合班合用' },
]

const materialTypeOptions = Object.entries(ARCHIVE_MATERIAL_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const materialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '目录编码', dataIndex: 'catalogCode', width: 120 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '提交状态', key: 'submissionStatus', width: 120 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 160 },
  { title: '操作', key: 'materialActions', width: 160 },
]

const filteredMaterials = computed(() => {
  const materials = props.detail.materials ?? []
  const key = props.selectedCatalogKeys[0]
  if (!key) return materials
  return materials.filter((item) => (item.catalogCode || item.materialType) === key)
})

const effectiveExamId = computed(
  () => props.detail.volume?.examId ?? props.detail.volume?.relatedExamId,
)

const canGenerateExamReports = computed(() => Boolean(effectiveExamId.value))

const courseObjectiveMappingPath = computed(() => {
  const examId = effectiveExamId.value
  if (!examId) return null
  return `/teacher/exams/${examId}/archive/statistics`
})

const courseObjectiveMappingHint = computed(() => {
  if (props.detail.courseObjectiveReportReady === true) return null
  const total = props.detail.courseObjectiveTotalQuestionCount
  const mapped = props.detail.courseObjectiveMappedQuestionCount
  const goalTotal = props.detail.courseObjectiveTotalGoalCount
  const goalCovered = props.detail.courseObjectiveCoveredGoalCount
  if (
    total != null
    && mapped != null
    && total > 0
    && mapped >= total
    && goalTotal != null
    && goalCovered != null
    && goalTotal > 0
    && goalCovered < goalTotal
  ) {
    return `quality 课程目标覆盖 ${goalCovered}/${goalTotal} 未完成，须确保每个课程目标至少映射一题后再生成达成度报告。`
  }
  if (total == null || mapped == null) {
    return '生成课程目标达成报告前，须先在考试统计页完成全部试题的课程目标映射，并覆盖全部 quality 课程目标。'
  }
  return `试题-课程目标映射 ${mapped}/${total} 未完成，生成达成度报告前须补全全部映射并覆盖每个 quality 课程目标。`
})

async function handleGenerateExamAnalysis(): Promise<void> {
  generatingExamAnalysis.value = true
  try {
    await generateArchiveVolumeExamAnalysisReport(props.volumeId)
    message.success('试卷分析报告已生成并登记')
    emitRefreshed()
  } catch (error) {
    showUserError(error, '生成试卷分析报告失败')
  } finally {
    generatingExamAnalysis.value = false
  }
}

async function handleGenerateCourseObjective(): Promise<void> {
  if (props.detail.courseObjectiveReportReady === false) {
    message.warning(courseObjectiveMappingHint.value ?? '请先完成试题-课程目标映射')
    return
  }
  generatingCourseObjective.value = true
  try {
    await generateArchiveVolumeCourseObjectiveReport(props.volumeId)
    message.success('课程目标达成报告已生成并登记')
    emitRefreshed()
  } catch (error) {
    showUserError(error, '生成课程目标达成报告失败')
  } finally {
    generatingCourseObjective.value = false
  }
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function submissionStatusLabel(code: ArchiveMaterialSubmissionStatusCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_SUBMISSION_STATUS_LABEL, code, 'submissionStatus')
}

function submissionStatusTone(code: ArchiveMaterialSubmissionStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_MATERIAL_SUBMISSION_STATUS_TONE, code, 'submissionStatus')
}

function materialOcrStatusLabel(code: PaperArchiveOcrStatusCode) {
  return strictEnumLabel(PAPER_ARCHIVE_OCR_STATUS_LABEL, code, 'ocrStatus')
}

function materialOcrStatusTone(code: PaperArchiveOcrStatusCode): BadgeTone {
  return strictEnumTone(PAPER_ARCHIVE_OCR_STATUS_TONE, code, 'ocrStatus')
}

function canRetryMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return material.ocrStatus === 'FAILED' && Boolean(material.fileId)
}

function canViewMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return (
    material.ocrStatus === 'COMPLETED'
    || material.ocrStatus === 'FAILED'
    || material.ocrStatus === 'RUNNING'
  )
}

function openMaterialOcrDetail(material: ArchiveVolumeMaterialVO): void {
  ocrDetailMaterialId.value = material.materialId
  ocrDetailOpen.value = true
}

function emitRefreshed(options?: { silent?: boolean }) {
  emit('refreshed', options)
}

function confirmRetryMaterialOcr(material: ArchiveVolumeMaterialVO): void {
  void confirmAsync({
    title: '重试 OCR 识别？',
    content: `材料「${material.fileName ?? material.materialId}」将重新进入 OCR 队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        message.success('已入队，等待识别')
        emitRefreshed()
      } catch (error) {
        showUserError(error, 'OCR 重试提交失败')
      }
    },
  })
}

let materialOcrPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollMaterialOcr = computed(() =>
  (props.detail.materials ?? []).some(
    (item) => item.ocrStatus === 'PENDING' || item.ocrStatus === 'RUNNING',
  ),
)

watch(
  shouldPollMaterialOcr,
  (shouldPoll, wasPolling) => {
    if (shouldPoll && !materialOcrPollTimer) {
      materialOcrPollTimer = setInterval(() => {
        emitRefreshed({ silent: true })
      }, 5000)
    } else if (!shouldPoll && materialOcrPollTimer) {
      clearInterval(materialOcrPollTimer)
      materialOcrPollTimer = null
    }
    if (wasPolling && !shouldPoll) {
      void (async () => {
        emitRefreshed({ silent: true })
        if (props.detail.fourPropertyStale) {
          emit('ocr-completed-stale')
        }
      })()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (materialOcrPollTimer) {
    clearInterval(materialOcrPollTimer)
    materialOcrPollTimer = null
  }
})

function openUploadModal() {
  uploadForm.materialType = undefined
  uploadForm.fileNodeId = undefined
  uploadForm.fileName = undefined
  uploadForm.studentNo = ''
  uploadForm.studentName = ''
  uploadForm.retakeFlag = false
  uploadForm.makeupRound = ''
  uploadModalOpen.value = true
}

function resolveArchiveScanQuery(): Record<string, string> | null {
  const key = props.selectedCatalogKeys[0]
  if (!key) {
    return null
  }
  const query: Record<string, string> = {
    volumeId: props.volumeId,
    returnTo: route.fullPath,
    batchMode: 'PER_PAGE',
  }
  if (key in ARCHIVE_MATERIAL_TYPE_LABEL) {
    query.materialType = key
    return query
  }
  const material = props.detail.materials.find((item) => item.catalogCode === key)
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find(
    (item) => item.catalogCode === key,
  )
  const resolvedMaterialType = material?.materialType ?? missing?.materialType
  if (!resolvedMaterialType) {
    return null
  }
  query.catalogCode = key
  query.materialType = resolvedMaterialType
  return query
}

function openArchiveScan() {
  const query = resolveArchiveScanQuery()
  if (!query) {
    message.warning('请先在左侧目录选择可登记的材料项')
    return
  }
  scanDispatchQuery.value = query
  scanDispatchOpen.value = true
}

function handleDispatchCreated(payload: ScanDispatchResultPayload) {
  scanDispatchResult.value = payload
  scanDispatchResultOpen.value = true
}

function openSharedRefModal() {
  sharedRefForm.refType = 'MERGED_CLASS_SHARED'
  sharedRefForm.targetVolumeId = ''
  sharedRefForm.targetMaterialId = ''
  sharedRefForm.catalogNote = ''
  sharedRefModalOpen.value = true
}

async function submitMaterial() {
  if (!uploadForm.materialType || !uploadForm.fileNodeId) {
    message.warning('请选择材料类型和文件')
    return
  }
  uploading.value = true
  try {
    await registerArchiveVolumeMaterial({
      volumeId: props.volumeId,
      materialType: uploadForm.materialType,
      fileId: uploadForm.fileNodeId,
      mediaType: 'ELECTRONIC',
      sortRule: uploadForm.retakeFlag ? 'STUDENT_NO' : 'CATALOG_ORDER',
      electronicOriginalStatus: 'SCANNED',
      studentNo: uploadForm.studentNo.trim() || undefined,
      studentName: uploadForm.studentName.trim() || undefined,
      retakeFlag: uploadForm.retakeFlag || undefined,
      makeupRound: uploadForm.makeupRound.trim() || undefined,
      triggerOcr: true,
    })
    message.success('材料登记成功')
    uploadModalOpen.value = false
    emitRefreshed()
  } catch (error) {
    showUserError(error)
  } finally {
    uploading.value = false
  }
}

async function submitSharedRef() {
  if (!sharedRefForm.targetVolumeId.trim() || !sharedRefForm.targetMaterialId.trim()) {
    message.warning('请填写目标卷与材料 ID')
    return
  }
  sharedRefSubmitting.value = true
  try {
    await registerArchiveSharedMaterialRef({
      volumeId: props.volumeId,
      refType: sharedRefForm.refType,
      targetVolumeId: sharedRefForm.targetVolumeId.trim(),
      targetMaterialId: sharedRefForm.targetMaterialId.trim(),
      catalogNote: sharedRefForm.catalogNote.trim() || undefined,
    })
    message.success('合用材料引用已保存')
    sharedRefModalOpen.value = false
    emitRefreshed()
  } catch (error) {
    showUserError(error)
  } finally {
    sharedRefSubmitting.value = false
  }
}
</script>

<style scoped>
.archive-volume-material-table {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-material-table__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-material-table__ocr-failure {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.archive-volume-material-table__mapping-hint {
  margin: 0;
  font-size: 13px;
  color: var(--dp-text-secondary, #595959);
}

.archive-volume-material-table__mapping-link {
  margin-left: 8px;
}

.archive-volume-material-table__status {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-1, 4px);
}

.archive-volume-material-table__status-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.archive-volume-material-table__status-icon--gray {
  background: var(--dp-color-text-quaternary, #bfbfbf);
}

.archive-volume-material-table__status-icon--blue {
  background: var(--dp-color-primary, #1677ff);
}

.archive-volume-material-table__status-icon--green {
  background: var(--dp-color-success, #52c41a);
}

.archive-volume-material-table__status-icon--red {
  background: var(--dp-color-error, #ff4d4f);
}

.archive-volume-material-table__status-icon--orange {
  background: var(--dp-color-warning, #fa8c16);
}

.archive-volume-material-table__status-icon--purple {
  background: #722ed1;
}
</style>
