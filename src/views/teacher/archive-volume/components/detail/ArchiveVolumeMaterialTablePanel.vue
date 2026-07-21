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
        <UiButton size="sm" variant="primary" @click="openUploadModal">登记材料</UiButton>
        <UiDropdownAction
          v-if="materialMoreActionItems.length"
          trigger-style="button"
          button-text="更多"
          :items="materialMoreActionItems"
          @select="onMaterialMoreAction"
        />
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
    <UiAlertStrip
      v-if="materialStatsLoadFailed"
      tone="warning"
      title="材料统计加载失败"
      description="列表仍可使用，就绪数量暂不可用。"
    >
      <template #actions>
        <UiButton size="sm" variant="outline" @click="loadMaterialStats">重新加载</UiButton>
      </template>
    </UiAlertStrip>
    <UiDataTable
      v-model:current="pageNum"
      v-model:page-size="pageSize"
      pagination-mode="server"
      :columns="materialColumns"
      :data-source="materialsLoadFailed ? [] : materials"
      :loading="materialsLoading"
      :total="pageTotal"
      flat
      row-key="materialId"
      size="middle"
      empty-description="该目录项下暂无材料"
      :load-error="materialsLoadFailed"
      @page-change="handlePageChange"
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
            v-if="
              record.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED && record.ocrFailureReason
            "
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
            v-if="canMaintainMaterial === true"
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
            查看文字识别
          </UiTextAction>
          <UiTextAction
            v-if="canRetryMaterialOcr(record)"
            tone="primary"
            :disabled="retryingMaterialIds.has(record.materialId)"
            @click="confirmRetryMaterialOcr(record)"
          >
            {{ retryingMaterialIds.has(record.materialId) ? '提交中' : '重试文字识别' }}
          </UiTextAction>
        </template>
      </template>
    </UiDataTable>

    <div class="archive-volume-material-table__shared-refs">
      <div class="archive-volume-material-table__shared-head">
        <h4 class="archive-volume-material-table__shared-title">合用材料引用</h4>
        <span class="archive-volume-material-table__meta">{{ sharedRefs.length }} 条</span>
      </div>
      <UiAlertStrip
        v-if="sharedRefsLoadFailed"
        tone="warning"
        title="合用材料引用加载失败"
        description="可重试加载；已登记引用在加载失败时暂不可见。"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="loadSharedRefs">重新加载</UiButton>
        </template>
      </UiAlertStrip>
      <UiDataTable
        :columns="sharedRefColumns"
        :data-source="sharedRefsLoadFailed ? [] : sharedRefs"
        :loading="sharedRefsLoading"
        pagination-mode="none"
        flat
        row-key="refId"
        size="middle"
        empty-description="本卷暂无合用材料引用"
        :load-error="sharedRefsLoadFailed"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'refType'">
            {{ sharedRefTypeLabel(record.refType) }}
          </template>
          <template v-else-if="column.key === 'sharedRefActions'">
            <UiTextAction
              v-if="canRemoveSharedMaterialRef"
              tone="danger"
              :disabled="removingSharedRefId === record.refId"
              @click="confirmRemoveSharedRef(record)"
            >
              {{ removingSharedRefId === record.refId ? '解除中' : '解除' }}
            </UiTextAction>
            <span v-else>-</span>
          </template>
        </template>
      </UiDataTable>
    </div>

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
      <UiForm layout="vertical">
        <UiFormItem label="材料类型" required>
          <UiSelect
            size="sm"
            v-model="uploadForm.materialType"
            :options="ARCHIVE_MATERIAL_TYPE_OPTIONS"
            placeholder="选择材料类型"
          />
        </UiFormItem>
        <UiFormItem label="学号">
          <UiInput size="sm" v-model="uploadForm.studentNo" placeholder="学生试卷可填学号" />
        </UiFormItem>
        <UiFormItem label="姓名">
          <UiInput size="sm" v-model="uploadForm.studentName" placeholder="学生姓名" />
        </UiFormItem>
        <UiFormItem label="重修/补考">
          <UiCheckbox v-model="uploadForm.retakeFlag">标记为重修或补考答卷</UiCheckbox>
        </UiFormItem>
        <UiFormItem v-if="uploadForm.retakeFlag" label="补考轮次">
          <UiInput size="sm" v-model="uploadForm.makeupRound" placeholder="如 补考1" />
        </UiFormItem>
        <UiFormItem label="自由标签" tooltip="回车或逗号分隔；与目录编码并用，便于检索">
          <ArchiveMaterialTagSelect v-model="uploadForm.tags" :volume-id="volumeId" />
        </UiFormItem>
        <UiFormItem label="扫描文件" required>
          <UiPlatformFileField
            v-model:file-node-id="uploadForm.fileNodeId"
            v-model:file-name="uploadForm.fileName"
            :scene-key="FileUploadSceneKey.MARK_ARCHIVE_VOLUME_MATERIAL"
            button-text="选择文件"
          />
        </UiFormItem>
      </UiForm>
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
      <UiForm layout="vertical">
        <UiFormItem label="引用类型" required>
          <UiSelect
            size="sm"
            v-model="sharedRefForm.refType"
            :options="sharedRefTypeOptions"
            placeholder="选择引用类型"
          />
        </UiFormItem>
        <UiFormItem label="目标卷编号" required>
          <UiInput
            size="sm"
            v-model="sharedRefForm.targetVolumeId"
            placeholder="合用材料所在归档任务编号"
          />
        </UiFormItem>
        <UiFormItem label="目标材料编号" required>
          <UiInput size="sm" v-model="sharedRefForm.targetMaterialId" placeholder="目标材料编号" />
        </UiFormItem>
        <UiFormItem label="目录备注">
          <UiInput
            size="sm"
            v-model="sharedRefForm.catalogNote"
            placeholder="如 合用材料见××班级卷"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <ArchiveVolumeBatchRegisterModal
      v-model:open="batchRegisterOpen"
      :volume-id="volumeId"
      :catalog-code="selectedCatalogContext.catalogCode"
      :catalog-name="selectedCatalogContext.catalogName"
      :initial-material-type="selectedCatalogContext.materialType"
      :can-register-material="canRegisterMaterial"
      @success="emitRefreshed"
    />
    <ArchiveVolumeCourseSyncModal
      v-model:open="courseSyncOpen"
      :volume-id="volumeId"
      :can-register-material="canRegisterMaterial"
      @success="emitRefreshed"
    />
    <ArchiveVolumeMaterialOcrDetailModal
      v-model:open="ocrDetailOpen"
      :material-id="ocrDetailMaterialId"
    />
    <ArchiveVolumeMaterialTagModal
      v-model:open="tagModalOpen"
      :material-id="tagEditMaterial?.materialId"
      :volume-id="volumeId"
      :file-name="tagEditMaterial?.fileName"
      :initial-tags="tagEditMaterial?.tags"
      :can-maintain-material="canMaintainMaterial"
      @success="emitRefreshed"
    />
    <ScanDispatchDialog
      v-model:open="scanDispatchOpen"
      :can-register-material="canRegisterMaterial"
      :volume-id="volumeId"
      :catalog-code="scanDispatchQuery?.catalogCode"
      :material-type="scanDispatchMaterialType"
      :archive-batch-mode="scanDispatchQuery?.batchMode"
      :archive-title="detail.volume.archiveTitle"
      :physical-storage-location="detail.volume.physicalStorageLocation"
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
import type {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialResponse,
  ArchiveVolumeMaterialStatsResponse,
  ArchiveVolumeSharedMaterialRefResponse,
} from '@/apis/mark/archive-volume'
import {
  ALL_ARCHIVE_MATERIAL_TYPE_CODES,
  ARCHIVE_MATERIAL_TYPE_OPTIONS,
  ArchiveElectronicOriginalStatusCode,
  ArchiveMaterialMediaTypeCode,
  ArchiveMaterialSortRuleCode,
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  ArchiveSharedMaterialRefTypeCode,
  generateArchiveVolumeCourseObjectiveReport,
  generateArchiveVolumeExamAnalysisReport,
  getArchiveVolumeMaterialStats,
  listArchiveSharedMaterialRefs,
  pageArchiveVolumeMaterials,
  registerArchiveSharedMaterialRef,
  registerArchiveVolumeMaterial,
  removeArchiveSharedMaterialRef,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { ScanDispatchResultPayload } from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import ScanDispatchResultDialog from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusCode,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import FilePreviewDialog from '@/components/FilePreviewDialog.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useFilePreview } from '@/composables/useFilePreview'
import { archiveMissingItemTargetsCatalogKey } from '@/utils/archive-catalog-material-key'
import { buildArchiveMaterialStatusView } from '@/utils/archive-material-status-ui'
import { normalizeMaterialTagsForRegister } from '@/utils/archive-material-tag'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeBatchRegisterModal from '@/views/teacher/archive-volume/archive-volume-batch-register-modal.vue'
import ArchiveVolumeCourseSyncModal from '@/views/teacher/archive-volume/archive-volume-course-sync-modal.vue'
import ArchiveMaterialTagSelect from '@/views/teacher/archive-volume/components/ArchiveMaterialTagSelect.vue'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'
import ArchiveVolumeMaterialTagModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTagModal.vue'
import ScanDispatchDialog from '@/views/teacher/archive-volume/components/ScanDispatchDialog.vue'

defineOptions({ name: 'ArchiveVolumeMaterialTablePanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  selectedCatalogKeys: string[]
  canRegisterMaterial: boolean
  /** MVR-185：标签/OCR 可不在收材窗口 */
  canMaintainMaterial?: boolean
  /** MVR-183：解除合用引用可不在收材窗口 */
  canRemoveSharedMaterialRef?: boolean
}>()

const emit = defineEmits<{
  refreshed: [options?: { silent?: boolean }]
  'ocr-completed-stale': []
  'stats-ready': [stats: ArchiveVolumeMaterialStatsResponse | null]
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
const sharedRefs = ref<ArchiveVolumeSharedMaterialRefResponse[]>([])
const sharedRefsLoading = ref(false)
const sharedRefsLoadFailed = ref(false)
const removingSharedRefId = ref<string | null>(null)
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref<string>()
const tagModalOpen = ref(false)
const tagEditMaterial = ref<ArchiveVolumeMaterialResponse>()
const scanDispatchOpen = ref(false)
const scanDispatchResultOpen = ref(false)
const scanDispatchQuery = ref<Record<string, string> | null>(null)
const scanDispatchResult = ref<ScanDispatchResultPayload | null>(null)

const pageNum = ref(1)
const pageSize = ref(20)
const pageTotal = ref(0)
const materials = ref<ArchiveVolumeMaterialResponse[]>([])
const materialsLoading = ref(false)
const materialsLoadFailed = ref(false)
const materialStats = ref<ArchiveVolumeMaterialStatsResponse | null>(null)
const materialStatsLoadFailed = ref(false)
const retryingMaterialIds = reactive(new Set<string>())

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

const materialColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
  { title: '类别', key: 'materialType', width: 160 },
  { title: '目录编码', dataIndex: 'catalogCode', width: 120 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '标签', key: 'tags', width: 160 },
  { title: '状态', key: 'submissionStatus', width: 120 },
  { title: '文字识别状态', key: 'ocrStatus', width: 160 },
  { title: '操作', key: 'materialActions', width: 280 },
]

const sharedRefColumns: ColumnsType<ArchiveVolumeSharedMaterialRefResponse> = [
  { title: '引用类型', key: 'refType', width: 120 },
  { title: '目标卷编号', dataIndex: 'targetVolumeId' },
  { title: '目标材料编号', dataIndex: 'targetMaterialId' },
  { title: '目录备注', dataIndex: 'catalogNote' },
  { title: '操作', key: 'sharedRefActions', width: 100 },
]

const filePreview = useFilePreview()

const materialReadySummary = computed(() => {
  if (!materialStats.value) {
    return '—'
  }
  const catalogKey = props.selectedCatalogKeys[0]
  if (catalogKey) {
    const scoped = materialStats.value.catalogSummaries.find(
      (item) => item.catalogKey === catalogKey,
    )
    if (!scoped) {
      return '0/0 就绪'
    }
    return `${scoped.readyCount}/${scoped.totalCount} 就绪`
  }
  const summary = materialStats.value.volumeSummary
  return `${summary.readyCount}/${summary.totalCount} 就绪`
})

const materialMoreActionItems = computed(() => {
  const items: Array<{ key: string; label: string }> = [
    { key: 'scan', label: '一体机扫描' },
    { key: 'batch', label: '批量登记' },
    { key: 'course-sync', label: '课程平台同步' },
    { key: 'shared-ref', label: '引用合用材料' },
  ]
  if (canGenerateExamReports.value) {
    items.push(
      { key: 'exam-analysis', label: '生成试卷分析' },
      { key: 'course-objective', label: '生成达成度报告' },
    )
  }
  return items
})

function onMaterialMoreAction(key: string): void {
  if (key === 'scan') {
    openArchiveScan()
    return
  }
  if (key === 'batch') {
    batchRegisterOpen.value = true
    return
  }
  if (key === 'course-sync') {
    // MVR-377：与 canRegisterMaterial / BE requireCanManageMaterials 二次拦截
    if (props.canRegisterMaterial !== true) {
      showFormValidationMessage('当前账号无材料登记权限')
      return
    }
    courseSyncOpen.value = true
    return
  }
  if (key === 'shared-ref') {
    openSharedRefModal()
    return
  }
  if (key === 'exam-analysis') {
    void handleGenerateExamAnalysis()
    return
  }
  if (key === 'course-objective') {
    void handleGenerateCourseObjective()
  }
}

async function loadMaterials(): Promise<void> {
  if (!props.volumeId) {
    materials.value = []
    pageTotal.value = 0
    materialsLoadFailed.value = false
    return
  }
  materialsLoading.value = true
  try {
    const result = await pageArchiveVolumeMaterials({
      volumeId: props.volumeId,
      catalogKey: props.selectedCatalogKeys[0] || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    materials.value = result.list
    pageTotal.value = result.total
    materialsLoadFailed.value = false
  } catch (error) {
    materialsLoadFailed.value = true
    showUserError(error, '加载归档材料失败')
  } finally {
    materialsLoading.value = false
  }
}

async function loadMaterialStats(): Promise<void> {
  if (!props.volumeId) {
    materialStats.value = null
    materialStatsLoadFailed.value = false
    emit('stats-ready', null)
    return
  }
  try {
    materialStats.value = await getArchiveVolumeMaterialStats({ volumeId: props.volumeId })
    materialStatsLoadFailed.value = false
    emit('stats-ready', materialStats.value)
  } catch (error) {
    materialStatsLoadFailed.value = true
    materialStats.value = null
    emit('stats-ready', null)
    showUserError(error, '加载材料统计失败')
  }
}

async function loadSharedRefs(): Promise<void> {
  if (!props.volumeId) {
    sharedRefs.value = []
    sharedRefsLoadFailed.value = false
    return
  }
  sharedRefsLoading.value = true
  try {
    sharedRefs.value = await listArchiveSharedMaterialRefs({ volumeId: props.volumeId })
    sharedRefsLoadFailed.value = false
  } catch (error) {
    sharedRefsLoadFailed.value = true
    showUserError(error, '加载合用材料引用失败')
  } finally {
    sharedRefsLoading.value = false
  }
}

async function reloadMaterialsAndStats(): Promise<void> {
  await Promise.all([loadMaterials(), loadMaterialStats(), loadSharedRefs()])
}

function sharedRefTypeLabel(refType?: ArchiveSharedMaterialRefTypeCode): string {
  if (!refType) {
    return '-'
  }
  const hit = sharedRefTypeOptions.find((item) => item.value === refType)
  return hit?.label ?? String(refType)
}

async function confirmRemoveSharedRef(
  record: ArchiveVolumeSharedMaterialRefResponse,
): Promise<void> {
  if (removingSharedRefId.value || props.canRemoveSharedMaterialRef !== true) {
    if (props.canRemoveSharedMaterialRef !== true) {
      void message.warning('当前账号无解除合用材料引用权限')
    }
    return
  }
  void confirmAsync({
    title: '解除合用材料引用？',
    content: '解除后本卷不再共享该目标材料，须重新收材与审核后方可提交。',
    type: 'warning',
    okText: '解除引用',
    cancelText: '取消',
    onOk: () => removeSharedRef(record),
  })
}

async function removeSharedRef(record: ArchiveVolumeSharedMaterialRefResponse): Promise<void> {
  if (removingSharedRefId.value) {
    return
  }
  // MVR-302：与 canRemoveSharedMaterialRef 同源二次拦截
  if (props.canRemoveSharedMaterialRef !== true) {
    void message.warning('当前账号无解除合用材料引用权限')
    return
  }
  removingSharedRefId.value = record.refId
  try {
    await removeArchiveSharedMaterialRef({
      volumeId: props.volumeId,
      refId: record.refId,
    })
    void message.success('合用材料引用已解除')
    emitRefreshed()
  } catch (error) {
    showUserError(error, '解除合用材料引用失败')
  } finally {
    removingSharedRefId.value = null
  }
}

function handlePageChange(): void {
  void loadMaterials()
}

const effectiveExamId = computed(
  () => props.detail.volume?.examId ?? props.detail.volume?.relatedExamId,
)

/** MVR-294/374：与 BE requireCanManageMaterials 对齐，仅认 canRegisterMaterial===true */
const canGenerateExamReports = computed(
  () => Boolean(effectiveExamId.value) && props.canRegisterMaterial === true,
)

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
    total != null &&
    mapped != null &&
    total > 0 &&
    mapped >= total &&
    goalTotal != null &&
    goalCovered != null &&
    goalTotal > 0 &&
    goalCovered < goalTotal
  ) {
    return `质量评价课程目标覆盖 ${goalCovered}/${goalTotal} 未完成，须确保每个课程目标至少映射一题后再生成达成度报告。`
  }
  if (total == null || mapped == null) {
    return '生成课程目标达成报告前，须先在考试统计页完成全部试题的课程目标映射，并覆盖全部质量评价课程目标。'
  }
  return `试题-课程目标映射 ${mapped}/${total} 未完成，生成达成度报告前须补全全部映射并覆盖每个质量评价课程目标。`
})

async function handleGenerateExamAnalysis(): Promise<void> {
  if (generatingExamAnalysis.value || generatingCourseObjective.value) return
  // MVR-294：与 BE requireCanManageMaterials 二次拦截
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无权登记本卷材料，无法生成试卷分析报告')
    return
  }
  generatingExamAnalysis.value = true
  try {
    const expectedMaterialId = props.detail.materials.find(
      (item) => item.materialType === ArchiveMaterialTypeCode.EXAM_ANALYSIS,
    )?.materialId
    await generateArchiveVolumeExamAnalysisReport({ volumeId: props.volumeId, expectedMaterialId })
    void message.success('试卷分析报告已生成并登记')
    emitRefreshed()
  } catch (error) {
    showUserError(error, '生成试卷分析报告失败')
  } finally {
    generatingExamAnalysis.value = false
  }
}

async function handleGenerateCourseObjective(): Promise<void> {
  if (generatingExamAnalysis.value || generatingCourseObjective.value) return
  // MVR-294：与 BE requireCanManageMaterials 二次拦截
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无权登记本卷材料，无法生成课程目标达成报告')
    return
  }
  if (props.detail.courseObjectiveReportReady === false) {
    showFormValidationMessage(courseObjectiveMappingHint.value ?? '请先完成试题-课程目标映射')
    return
  }
  generatingCourseObjective.value = true
  try {
    const expectedMaterialId = props.detail.materials.find(
      (item) => item.materialType === ArchiveMaterialTypeCode.COURSE_OBJECTIVE_REPORT,
    )?.materialId
    await generateArchiveVolumeCourseObjectiveReport({
      volumeId: props.volumeId,
      expectedMaterialId,
    })
    void message.success('课程目标达成报告已生成并登记')
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

function canRetryMaterialOcr(material: ArchiveVolumeMaterialResponse): boolean {
  // MVR-185：OCR 重试与收材窗口解耦
  if (props.canMaintainMaterial !== true) return false
  return material.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED && Boolean(material.fileId)
}

function canPreviewMaterialFile(material: ArchiveVolumeMaterialResponse): boolean {
  return Boolean(material.fileId)
}

function handlePreviewMaterial(material: ArchiveVolumeMaterialResponse): void {
  if (!material.fileId) return
  void filePreview.openPreview({
    fileId: material.fileId,
    fileName: material.fileName ?? material.materialId,
  })
}

async function handleDownloadMaterial(material: ArchiveVolumeMaterialResponse): Promise<void> {
  if (!material.fileId) return
  try {
    await downloadFile({ nodeId: material.fileId })
  } catch (error) {
    showUserError(error, '下载失败')
  }
}

function canViewMaterialOcr(material: ArchiveVolumeMaterialResponse): boolean {
  return (
    material.ocrStatus === ArchiveMaterialOcrStatusCode.COMPLETED ||
    material.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED ||
    material.ocrStatus === ArchiveMaterialOcrStatusCode.RUNNING
  )
}

function openMaterialOcrDetail(material: ArchiveVolumeMaterialResponse): void {
  ocrDetailMaterialId.value = material.materialId
  ocrDetailOpen.value = true
}

function openTagModal(material: ArchiveVolumeMaterialResponse): void {
  if (props.canMaintainMaterial !== true) return
  tagEditMaterial.value = material
  tagModalOpen.value = true
}

function emitRefreshed(options?: { silent?: boolean }) {
  emit('refreshed', options)
  void reloadMaterialsAndStats()
}

function confirmRetryMaterialOcr(material: ArchiveVolumeMaterialResponse): void {
  // MVR-422：与 canRetryMaterialOcr 同源二次闸（维护权∧FAILED∧fileId）
  if (!canRetryMaterialOcr(material)) {
    if (props.canMaintainMaterial !== true) {
      void message.warning('当前账号无维护材料识别权限')
    } else {
      void message.warning('当前材料不可重试文字识别（非失败态或无文件）')
    }
    return
  }
  if (retryingMaterialIds.has(material.materialId)) return
  void confirmAsync({
    title: '重试文字识别？',
    content: `材料「${material.fileName ?? material.materialId}」将重新进入文字识别队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      if (retryingMaterialIds.has(material.materialId)) return
      retryingMaterialIds.add(material.materialId)
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        void message.success('已入队，等待识别')
        emitRefreshed()
      } catch (error) {
        showUserError(error, '文字识别重试提交失败')
      } finally {
        retryingMaterialIds.delete(material.materialId)
      }
    },
  })
}

let materialOcrPollTimer: ReturnType<typeof setInterval> | null = null

const shouldPollMaterialOcr = computed(
  () => (materialStats.value?.ocrOverview.activeOcrCount ?? 0) > 0,
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
        emit('ocr-completed-stale')
      })()
    }
  },
  { immediate: true },
)

onMounted(() => {
  void reloadMaterialsAndStats()
})

watch(
  () => props.volumeId,
  () => {
    pageNum.value = 1
    void reloadMaterialsAndStats()
  },
)

watch(
  () => props.selectedCatalogKeys[0],
  () => {
    pageNum.value = 1
    void loadMaterials()
  },
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
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find((item) =>
    archiveMissingItemTargetsCatalogKey(item, key),
  )
  return {
    catalogCode: key,
    materialType: missing?.materialType,
  }
}

function openUploadModal() {
  // MVR-302：与 canRegisterMaterial 同源二次拦截
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无材料登记权限')
    return
  }
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
  const missing = props.detail.latestIntegrityCheck?.missingItems?.find((item) =>
    archiveMissingItemTargetsCatalogKey(item, key),
  )
  const resolvedMaterialType = missing?.materialType
  if (!resolvedMaterialType) {
    return null
  }
  query.catalogCode = key
  query.materialType = resolvedMaterialType
  return query
}

function openArchiveScan() {
  // MVR-302：扫描收材登记与 canRegisterMaterial 对齐
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无材料登记权限')
    return
  }
  const query = resolveArchiveScanQuery()
  if (!query) {
    showFormValidationMessage('请先在左侧目录选择可登记的材料项')
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
  // MVR-302：合用引用登记与 canRegisterMaterial 对齐
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无材料登记权限')
    return
  }
  sharedRefForm.refType = ArchiveSharedMaterialRefTypeCode.MERGED_CLASS_SHARED
  sharedRefForm.targetVolumeId = ''
  sharedRefForm.targetMaterialId = ''
  sharedRefForm.catalogNote = ''
  sharedRefModalOpen.value = true
}

async function submitMaterial() {
  if (uploading.value) {
    return
  }
  // MVR-302：与 canRegisterMaterial 同源二次拦截
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无材料登记权限')
    return
  }
  if (!uploadForm.materialType || !uploadForm.fileNodeId) {
    showFormValidationMessage('请选择材料类型和文件')
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
    void message.success('材料登记成功')
    uploadModalOpen.value = false
    emitRefreshed()
  } catch (error) {
    showUserError(error, '材料登记失败')
  } finally {
    uploading.value = false
  }
}

async function submitSharedRef() {
  if (sharedRefSubmitting.value) {
    return
  }
  // MVR-302：与 canRegisterMaterial 同源二次拦截
  if (props.canRegisterMaterial !== true) {
    void message.warning('当前账号无材料登记权限')
    return
  }
  if (!sharedRefForm.targetVolumeId.trim() || !sharedRefForm.targetMaterialId.trim()) {
    showFormValidationMessage('请填写目标卷与材料编号')
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
    void message.success('合用材料引用已保存')
    sharedRefModalOpen.value = false
    emitRefreshed()
  } catch (error) {
    showUserError(error, '材料登记失败')
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
  gap: var(--dp-space-4);
}

.archive-volume-material-table__shared-refs {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface-subtle, var(--dp-bg-layout));
}

.archive-volume-material-table__shared-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-material-table__shared-title {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-color-text-primary);
}

.archive-volume-material-table__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  width: 100%;
}

.archive-volume-material-table__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-material-table__meta {
  margin-left: auto;
  font-family: var(--dp-font-mono);
  font-size: var(--dp-type-hint-size);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--dp-text-muted) 7%, transparent);
}

.archive-volume-material-table__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-material-table__ocr-failure {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--dp-text-muted);
}

.archive-volume-material-table__mapping-hint {
  margin: 0;
  padding: var(--dp-space-2) var(--dp-space-3);
  font-size: 13px;
  color: var(--dp-text-secondary);
  border: 1px solid color-mix(in srgb, var(--dp-primary) 18%, transparent);
  border-radius: var(--dp-radius-control-inner, 4px);
  background: color-mix(in srgb, var(--dp-primary) 4%, transparent);
}

.archive-volume-material-table__mapping-link {
  margin-left: 8px;
}

.archive-volume-material-table__status {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-1);
}

.archive-volume-material-table__status-icon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.archive-volume-material-table__status-icon--gray {
  background: var(--dp-color-text-quaternary);
}

.archive-volume-material-table__status-icon--blue {
  background: var(--dp-color-primary);
}

.archive-volume-material-table__status-icon--green {
  background: var(--dp-color-success);
}

.archive-volume-material-table__status-icon--red {
  background: var(--dp-color-error);
}

.archive-volume-material-table__status-icon--orange {
  background: var(--dp-color-warning);
}

.archive-volume-material-table__status-icon--purple {
  background: var(--dp-purple-700);
}

.archive-volume-material-table__tip {
  margin: 0 var(--dp-space-4) var(--dp-space-3);
}

.material-status {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-1);
}

.material-status-icon {
  font-size: 12px;
  line-height: 1;
}
</style>
