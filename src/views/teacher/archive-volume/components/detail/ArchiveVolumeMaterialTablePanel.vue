<template>
  <WorkbenchSurfaceCard flush class="archive-volume-material-table">
    <template #head>
      <div class="archive-volume-material-table__head">
        <h3 class="archive-volume-material-table__title">归档材料</h3>
        <span class="archive-volume-material-table__meta">{{ materialReadySummary }}</span>
      </div>
    </template>
    <template v-if="canRegisterMaterial" #toolbar>
      <div class="archive-volume-material-table__actions">
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
    </template>
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
          <div v-if="record.submissionStatus" class="material-status">
            <span
              class="material-status-icon"
              :class="`material-status-icon--${materialStatusView(record.submissionStatus).variant}`"
              aria-hidden="true"
            >
              {{ materialStatusView(record.submissionStatus).icon }}
            </span>
            <span class="material-status-label">
              {{ materialStatusView(record.submissionStatus).label }}
            </span>
          </div>
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
        <template v-else-if="column.key === 'tags'">
          <template v-if="record.tags?.length">
            <UiTag v-for="tag in record.tags" :key="tag" tone="gray" size="sm">{{ tag }}</UiTag>
          </template>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'materialActions'">
          <UiTextAction
            v-if="canPreviewMaterialFile(record)"
            tone="primary"
            @click="handlePreviewMaterial(record)"
          >
            预览
          </UiTextAction>
          <UiTextAction
            v-if="canPreviewMaterialFile(record)"
            tone="primary"
            @click="handleDownloadMaterial(record)"
          >
            下载
          </UiTextAction>
          <UiTextAction
            v-if="canRegisterMaterial"
            tone="primary"
            @click="openTagModal(record)"
          >
            编辑标签
          </UiTextAction>
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

    <UiDrawer
      :open="uploadModalOpen"
      title="登记归档材料"
      :width="520"
      :confirm-loading="uploading"
      ok-text="登记"
      :hide-footer="false"
      @update:open="(v: boolean) => (uploadModalOpen = v)"
      @close="uploadModalOpen = false"
      @confirm="submitMaterial"
    >
      <UiAlertStrip
        v-if="registerCatalogLabel"
        dense
        tone="info"
        :title="`登记目录：${registerCatalogLabel}`"
      />
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
        <a-form-item label="自由标签" extra="回车或逗号分隔；与目录编码并用，便于检索">
          <ArchiveMaterialTagSelect v-model="uploadForm.tags" />
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
    </UiDrawer>

    <UiDrawer
      :open="sharedRefModalOpen"
      title="引用合用材料"
      :width="520"
      :confirm-loading="sharedRefSubmitting"
      ok-text="保存引用"
      :hide-footer="false"
      @update:open="(v: boolean) => (sharedRefModalOpen = v)"
      @close="sharedRefModalOpen = false"
      @confirm="submitSharedRef"
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
    </UiDrawer>

    <ArchiveVolumeBatchRegisterModal
      v-model:open="batchRegisterOpen"
      :volume-id="volumeId"
      :catalog-code="selectedCatalogContext.catalogCode"
      :catalog-name="selectedCatalogContext.catalogName"
      :initial-material-type="selectedCatalogContext.materialType"
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
    <ArchiveVolumeMaterialTagModal
      v-model:open="tagModalOpen"
      :material-id="tagEditMaterial?.materialId"
      :file-name="tagEditMaterial?.fileName"
      :initial-tags="tagEditMaterial?.tags"
      @success="emitRefreshed"
    />
    <ScanDispatchDialog
      v-model:open="scanDispatchOpen"
      :volume-id="volumeId"
      :catalog-code="scanDispatchQuery?.catalogCode"
      :material-type="scanDispatchMaterialType"
      :archive-batch-mode="scanDispatchQuery?.batchMode"
      :archive-title="detail.volume.archiveTitle"
      :initial-material-tags="uploadForm.tags"
      :return-to="scanDispatchQuery?.returnTo"
      @created="handleDispatchCreated"
    />
    <ScanDispatchResultDialog
      v-model:open="scanDispatchResultOpen"
      :volume-id="volumeId"
      :payload="scanDispatchResult"
    />
    <FilePreviewDialog :api="filePreview" />
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialOcrStatusCode } from '@/apis/mark/archive-ocr-status'
import type {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ScanDispatchResultPayload } from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import {
  ALL_ARCHIVE_MATERIAL_TYPE_CODES,
  ARCHIVE_MATERIAL_TYPE_OPTIONS,
  ArchiveElectronicOriginalStatusCode,
  ArchiveMaterialMediaTypeCode,
  ArchiveMaterialSortRuleCode,
  ArchiveMaterialTypeDescription,
  ArchiveSharedMaterialRefTypeCode,
  generateArchiveVolumeCourseObjectiveReport,
  generateArchiveVolumeExamAnalysisReport,
  registerArchiveSharedMaterialRef,
  registerArchiveVolumeMaterial,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import FilePreviewDialog from '@/components/FilePreviewDialog.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useFilePreview } from '@/composables/useFilePreview'
import {
  archiveMaterialBelongsToCatalogKey,
  archiveMissingItemTargetsCatalogKey,
  filterArchiveMaterialsByCatalogKey,
} from '@/utils/archive-catalog-material-key'
import {
  buildArchiveMaterialStatusView,
  countArchiveMaterialsReady,
} from '@/utils/archive-material-status-ui'
import { normalizeMaterialTagsForRegister } from '@/utils/archive-material-tag'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeBatchRegisterModal from '@/views/teacher/archive-volume/archive-volume-batch-register-modal.vue'
import ArchiveVolumeCourseSyncModal from '@/views/teacher/archive-volume/archive-volume-course-sync-modal.vue'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'
import ArchiveVolumeMaterialTagModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTagModal.vue'
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
const tagModalOpen = ref(false)
const tagEditMaterial = ref<ArchiveVolumeMaterialVO>()
const scanDispatchOpen = ref(false)
const scanDispatchResultOpen = ref(false)
const scanDispatchQuery = ref<Record<string, string> | null>(null)
const scanDispatchResult = ref<ScanDispatchResultPayload | null>(null)

const scanDispatchMaterialType = computed(() =>
  ALL_ARCHIVE_MATERIAL_TYPE_CODES.find((code) => code === scanDispatchQuery.value?.materialType),
)

interface ArchiveVolumeMaterialUploadForm {
  materialType?: ArchiveMaterialTypeCode
  catalogCode?: string
  fileNodeId?: string
  fileName?: string
  studentNo: string
  studentName: string
  retakeFlag: boolean
  makeupRound: string
  tags: string[]
}

const uploadForm = reactive<ArchiveVolumeMaterialUploadForm>({
  catalogCode: undefined,
  fileNodeId: undefined,
  fileName: undefined,
  studentNo: '',
  studentName: '',
  retakeFlag: false,
  makeupRound: '',
  tags: [],
})
const sharedRefForm = reactive({
  refType: ArchiveSharedMaterialRefTypeCode.MERGED_CLASS_SHARED,
  targetVolumeId: '',
  targetMaterialId: '',
  catalogNote: '',
})
const sharedRefTypeOptions = [
  { value: ArchiveSharedMaterialRefTypeCode.UNIFIED_EXAM_PUBLIC, label: '统考公用' },
  { value: ArchiveSharedMaterialRefTypeCode.MERGED_CLASS_SHARED, label: '合班合用' },
]

const materialTypeOptions = ARCHIVE_MATERIAL_TYPE_OPTIONS

const materialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '类别', key: 'materialType', width: 160 },
  { title: '目录编码', dataIndex: 'catalogCode', width: 120 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '标签', key: 'tags', width: 160 },
  { title: '状态', key: 'submissionStatus', width: 120 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 160 },
  { title: '操作', key: 'materialActions', width: 280 },
]

const filePreview = useFilePreview()

const filteredMaterials = computed(() =>
  filterArchiveMaterialsByCatalogKey(
    props.detail.materials ?? [],
    props.selectedCatalogKeys[0],
  ),
)

const materialReadySummary = computed(() => {
  const materials = filteredMaterials.value
  const readyCount = countArchiveMaterialsReady(materials)
  return `${readyCount}/${materials.length} 就绪`
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

function resolveCatalogName(catalogCode?: string): string | undefined {
  if (!catalogCode) return undefined
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find(
    (item) => item.catalogCode === catalogCode,
  )
  return missing?.catalogName
}

const selectedCatalogContext = computed(() => {
  const context = resolveSelectedCatalogContext()
  return {
    ...context,
    catalogName: resolveCatalogName(context.catalogCode),
  }
})

const registerCatalogLabel = computed(() => {
  const code = uploadForm.catalogCode
  if (!code) return ''
  const name = resolveCatalogName(code)
  return name ? `${code} · ${name}` : code
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
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function materialStatusView(code: ArchiveMaterialSubmissionStatusCode) {
  return buildArchiveMaterialStatusView(code)
}

function materialOcrStatusLabel(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumLabel(ArchiveMaterialOcrStatusDescription, code, 'ocrStatus')
}

function materialOcrStatusTone(code: ArchiveMaterialOcrStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, code, 'ocrStatus')
}

function canRetryMaterialOcr(material: ArchiveVolumeMaterialVO): boolean {
  return material.ocrStatus === 'FAILED' && Boolean(material.fileId)
}

function canPreviewMaterialFile(material: ArchiveVolumeMaterialVO): boolean {
  return Boolean(material.fileId)
}

function handlePreviewMaterial(material: ArchiveVolumeMaterialVO): void {
  if (!material.fileId) return
  void filePreview.openPreview({
    fileId: material.fileId,
    fileName: material.fileName ?? material.materialId,
  })
}

async function handleDownloadMaterial(material: ArchiveVolumeMaterialVO): Promise<void> {
  if (!material.fileId) return
  try {
    await downloadFile({ nodeId: material.fileId })
  } catch (error) {
    showUserError(error, '下载失败')
  }
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

function openTagModal(material: ArchiveVolumeMaterialVO): void {
  tagEditMaterial.value = material
  tagModalOpen.value = true
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

function resolveSelectedCatalogContext(): {
  catalogCode?: string
  materialType?: ArchiveMaterialTypeCode
} {
  const key = props.selectedCatalogKeys[0]
  if (!key) {
    return {}
  }
  const parsedMaterialType = ALL_ARCHIVE_MATERIAL_TYPE_CODES.find((code) => code === key)
  if (parsedMaterialType) {
    return { materialType: parsedMaterialType }
  }
  const material = props.detail.materials.find((item) =>
    archiveMaterialBelongsToCatalogKey(item, key),
  )
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find((item) =>
    archiveMissingItemTargetsCatalogKey(item, key),
  )
  return {
    catalogCode: key,
    materialType: material?.materialType ?? missing?.materialType,
  }
}

function openUploadModal() {
  const context = resolveSelectedCatalogContext()
  uploadForm.materialType = context.materialType
  uploadForm.catalogCode = context.catalogCode
  uploadForm.fileNodeId = undefined
  uploadForm.fileName = undefined
  uploadForm.studentNo = ''
  uploadForm.studentName = ''
  uploadForm.retakeFlag = false
  uploadForm.makeupRound = ''
  uploadForm.tags = []
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
  if (key in ArchiveMaterialTypeDescription) {
    query.materialType = key
    return query
  }
  const material = props.detail.materials.find((item) =>
    archiveMaterialBelongsToCatalogKey(item, key),
  )
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find((item) =>
    archiveMissingItemTargetsCatalogKey(item, key),
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
  sharedRefForm.refType = ArchiveSharedMaterialRefTypeCode.MERGED_CLASS_SHARED
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
  const tags = normalizeMaterialTagsForRegister(uploadForm.tags)
  if (tags === undefined && uploadForm.tags.length > 0) {
    return
  }
  uploading.value = true
  try {
    await registerArchiveVolumeMaterial({
      volumeId: props.volumeId,
      materialType: uploadForm.materialType,
      catalogCode: uploadForm.catalogCode,
      fileId: uploadForm.fileNodeId,
      mediaType: ArchiveMaterialMediaTypeCode.ELECTRONIC,
      sortRule: uploadForm.retakeFlag
        ? ArchiveMaterialSortRuleCode.STUDENT_NO
        : ArchiveMaterialSortRuleCode.CATALOG_ORDER,
      electronicOriginalStatus: ArchiveElectronicOriginalStatusCode.SCANNED,
      studentNo: uploadForm.studentNo.trim() || undefined,
      studentName: uploadForm.studentName.trim() || undefined,
      retakeFlag: uploadForm.retakeFlag || undefined,
      makeupRound: uploadForm.makeupRound.trim() || undefined,
      tags,
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

.archive-volume-material-table__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  width: 100%;
}

.archive-volume-material-table__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-material-table__meta {
  margin-left: auto;
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  font-size: var(--dp-type-hint-size, 11px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-secondary, #64748b);
}

.archive-volume-material-table__actions {
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
