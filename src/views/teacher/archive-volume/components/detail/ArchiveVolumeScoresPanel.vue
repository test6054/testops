<template>
  <WorkbenchSurfaceCard flush embedded class="archive-volume-scores-panel">
    <template #head>
      <div class="archive-volume-scores-panel__head">
        <h3 class="archive-volume-scores-panel__title">成绩材料</h3>
        <p class="archive-volume-scores-panel__hint">
          成绩单、分项成绩等由目录模板决定；请在材料登记中上传必交项，齐备性走完整性校验。
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiButton size="sm" variant="secondary" @click="emit('open-materials')">
        去材料登记
      </UiButton>
    </template>

    <UiSkeletonState v-if="gateLoading" variant="card" compact />
    <div v-else-if="showExamGate" class="archive-volume-scores-panel__gates">
      <ArchiveExamScoreGatePanel :gate="examGate" :loading="gateLoading" />
    </div>

    <div class="archive-volume-scores-panel__materials">
      <h3 class="archive-volume-scores-panel__subheading">成绩类材料</h3>
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="scoreMaterialColumns"
        :data-source="materialsLoadFailed ? [] : scoreMaterials"
        :loading="materialsLoading"
        :total="pageTotal"
        flat
        row-key="materialId"
        size="middle"
        empty-description="暂无成绩类材料，请按模板在材料区登记"
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
        </template>
      </UiDataTable>
    </div>
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveMaterialSubmissionStatusCode,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeExamGateResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreSourceCode,
  getArchiveVolumeExamGate,
  pageArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import ArchiveExamScoreGatePanel from '@/components/archive-volume/ArchiveExamScoreGatePanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { buildArchiveMaterialStatusView } from '@/utils/archive-material-status-ui'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeScoresPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
}>()

const emit = defineEmits<{
  refreshed: []
  'open-materials': []
}>()

const SCORE_MATERIAL_TYPES: ArchiveMaterialTypeCode[] = [
  ArchiveMaterialTypeCode.TRANSCRIPT,
  ArchiveMaterialTypeCode.ITEMIZED_SCORE,
  ArchiveMaterialTypeCode.COURSE_GRADING_BASIS,
  ArchiveMaterialTypeCode.GRADING_INSTRUCTION,
]

const gateLoading = ref(false)
const examGate = ref<ArchiveVolumeExamGateResponse | null>(null)
const scoreMaterials = ref<ArchiveVolumeMaterialResponse[]>([])
const materialsLoading = ref(false)
const materialsLoadFailed = ref(false)
const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const pageTotal = ref(0)

const showExamGate = computed(
  () =>
    props.detail.volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL
    && !!props.detail.volume.examId,
)

const scoreMaterialColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '状态', key: 'submissionStatus', width: 120 },
]

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function materialStatusView(code: ArchiveMaterialSubmissionStatusCode) {
  return buildArchiveMaterialStatusView(code)
}

async function loadScoreMaterials(): Promise<void> {
  if (!props.volumeId) {
    scoreMaterials.value = []
    pageTotal.value = 0
    materialsLoadFailed.value = false
    return
  }
  materialsLoading.value = true
  try {
    const result = await pageArchiveVolumeMaterials({
      volumeId: props.volumeId,
      materialTypes: SCORE_MATERIAL_TYPES,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    scoreMaterials.value = result.list
    pageTotal.value = result.total
    materialsLoadFailed.value = false
  } catch (error) {
    materialsLoadFailed.value = true
    showUserError(error, '加载成绩类材料失败')
  } finally {
    materialsLoading.value = false
  }
}

function handlePageChange(event: { current: number, pageSize: number }): void {
  pageNum.value = event.current
  pageSize.value = event.pageSize
  void loadScoreMaterials()
}

async function loadExamGate() {
  const examId = props.detail.volume.examId
  if (!showExamGate.value || !examId) {
    examGate.value = null
    return
  }
  gateLoading.value = true
  try {
    examGate.value = await getArchiveVolumeExamGate(examId)
  } catch (error) {
    showUserError(error, '加载成绩门槛失败')
    examGate.value = null
  } finally {
    gateLoading.value = false
  }
}

onMounted(() => {
  void loadExamGate()
  void loadScoreMaterials()
})

watch(
  () => props.volumeId,
  () => {
    pageNum.value = 1
    void loadScoreMaterials()
  },
)

watch(
  () => [props.detail.volume.examId, props.detail.volume.scoreSource],
  () => {
    void loadExamGate()
  },
)
</script>

<style scoped>
.archive-volume-scores-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.archive-volume-scores-panel__head {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.archive-volume-scores-panel__title {
  margin: 0;
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
}

.archive-volume-scores-panel__hint {
  margin: 0;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  line-height: 1.5;
}

.archive-volume-scores-panel__gates {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.archive-volume-scores-panel__subheading {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}

.archive-volume-scores-panel__materials {
  display: flex;
  flex-direction: column;
}

.material-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.material-status-icon {
  display: inline-flex;
  width: 1em;
  justify-content: center;
}

.material-status-icon--success {
  color: var(--dp-success);
}

.material-status-icon--warning {
  color: var(--dp-warning);
}

.material-status-icon--danger {
  color: var(--dp-danger);
}

.material-status-icon--muted {
  color: var(--dp-text-tertiary);
}

.material-status-label {
  font-size: var(--dp-font-size-sm);
}
</style>
