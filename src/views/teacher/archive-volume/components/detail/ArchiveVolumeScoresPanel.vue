<template>
  <WorkbenchSurfaceCard flush embedded class="archive-volume-scores-panel">
    <template #head>
      <div class="archive-volume-scores-panel__head">
        <h3 class="archive-volume-scores-panel__title">成绩完成度确认</h3>
        <div class="archive-volume-scores-panel__actions">
          <UiTag :tone="completionTone" size="sm">
            {{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}
          </UiTag>
          <span v-if="confirmMeta" class="archive-volume-scores-panel__meta">{{
            confirmMeta
          }}</span>
        </div>
      </div>
    </template>
    <template v-if="canConfirmScoreCompletion" #toolbar>
      <UiButton
        size="sm"
        variant="primary"
        :loading="scoreConfirmSubmitting"
        @click="handleConfirmScoreCompletion"
      >
        确认成绩完成
      </UiButton>
    </template>

    <UiSkeletonState v-if="gateLoading" variant="card" compact />
    <div v-else class="archive-volume-scores-panel__gates">
      <ArchiveExamScoreGatePanel v-if="showExamGate" :gate="examGate" :loading="gateLoading" />
      <div v-if="showTeachingAffairsGate" class="score-gate">
        <span
          class="score-gate__check"
          :class="teachingAffairsGatePassed ? 'score-gate__check--pass' : 'score-gate__check--fail'"
        >
          {{ teachingAffairsGatePassed ? '✓' : '✗' }}
        </span>
        <div>
          <div class="score-gate__title">平时成绩 — {{ teachingAffairsGateLabel }}</div>
          <div class="score-gate__hint">{{ ARCHIVE_TEACHING_AFFAIRS_SCORE_COMPLETION_HINT }}</div>
        </div>
      </div>
    </div>

    <div class="archive-volume-scores-panel__materials">
      <h3 class="archive-volume-scores-panel__subheading">成绩证明材料</h3>
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
        empty-description="暂无成绩证明材料"
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
import {
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreCompletionStatusDescription,
  ArchiveScoreSourceCode,
  confirmArchiveVolumeScoreCompletion,
  getArchiveVolumeExamGate,
  pageArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { ARCHIVE_TEACHING_AFFAIRS_SCORE_COMPLETION_HINT } from '@/apis/mark/teaching-affairs-sync'
import ArchiveExamScoreGatePanel from '@/components/archive-volume/ArchiveExamScoreGatePanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { buildArchiveMaterialStatusView } from '@/utils/archive-material-status-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeScoresPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  canConfirmScoreCompletion: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const SCORE_MATERIAL_TYPES: ArchiveMaterialTypeCode[] = [
  ArchiveMaterialTypeCode.TRANSCRIPT,
  ArchiveMaterialTypeCode.ITEMIZED_SCORE,
  ArchiveMaterialTypeCode.COURSE_GRADING_BASIS,
  ArchiveMaterialTypeCode.GRADING_INSTRUCTION,
]

const scoreConfirmSubmitting = ref(false)
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
    props.detail.volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL &&
    !!props.detail.volume.examId,
)

const showTeachingAffairsGate = computed(
  () => props.detail.volume.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS,
)

const teachingAffairsGatePassed = computed(
  () =>
    props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.COMPLETED ||
    props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.VERIFIED,
)

const teachingAffairsGateLabel = computed(() => {
  if (props.detail.volume.externalBusinessNo) {
    return `已同步 ${props.detail.volume.externalBusinessNo}`
  }
  return teachingAffairsGatePassed.value ? '已确认' : '待同步'
})

const completionTone = computed((): BadgeTone => {
  const code = props.detail.volume.scoreCompletionStatus
  if (
    code === ArchiveScoreCompletionStatusCode.COMPLETED ||
    code === ArchiveScoreCompletionStatusCode.VERIFIED
  ) {
    return 'green'
  }
  if (code === ArchiveScoreCompletionStatusCode.NOT_REQUIRED) return 'gray'
  return 'orange'
})

const confirmMeta = computed(() => {
  const parts: string[] = []
  if (props.detail.volume.scoreConfirmedUserNickName) {
    parts.push(props.detail.volume.scoreConfirmedUserNickName)
  }
  if (props.detail.volume.scoreCompletionTime) {
    parts.push(formatDateTime(props.detail.volume.scoreCompletionTime))
  }
  return parts.length ? parts.join(' · ') : ''
})

const scoreMaterialColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '状态', key: 'submissionStatus', width: 120 },
]

function scoreCompletionLabel(
  code: ArchiveVolumeDetailResponse['volume']['scoreCompletionStatus'],
) {
  return strictEnumLabel(ArchiveScoreCompletionStatusDescription, code, 'scoreCompletionStatus')
}

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
    showUserError(error, '加载成绩证明材料失败')
  } finally {
    materialsLoading.value = false
  }
}

function handlePageChange(event: { current: number; pageSize: number }): void {
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

async function handleConfirmScoreCompletion() {
  if (!props.volumeId || scoreConfirmSubmitting.value) {
    return
  }
  // MVR-299：与工具栏 canConfirmScoreCompletion 同源二次拦截
  if (!props.canConfirmScoreCompletion) {
    void message.warning('当前账号无成绩完成确认权限')
    return
  }
  scoreConfirmSubmitting.value = true
  try {
    await confirmArchiveVolumeScoreCompletion({
      volumeId: props.volumeId,
    })
    void message.success('成绩完成状态已确认')
    emit('refreshed')
  } catch (error) {
    showUserError(error, '确认成绩完成失败')
  } finally {
    scoreConfirmSubmitting.value = false
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
  gap: var(--dp-space-4);
}

.archive-volume-scores-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-scores-panel__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
}

.archive-volume-scores-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-scores-panel__meta {
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.archive-volume-scores-panel__gates {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
}

.archive-volume-scores-panel__subheading {
  margin: 0 0 var(--dp-space-2);
  font-size: 14px;
  font-weight: 600;
}

.archive-volume-scores-panel__sync-form {
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
}

.archive-volume-scores-panel__sync-fields {
  max-width: 480px;
}

.archive-volume-scores-panel__materials {
  border-top: 1px solid var(--dp-border);
  padding-top: var(--dp-space-3);
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

.material-status-icon--ok {
  color: var(--dp-success);
}

.material-status-icon--missing {
  color: var(--dp-error);
}

.material-status-icon--pending {
  color: var(--dp-text-muted);
}
</style>
