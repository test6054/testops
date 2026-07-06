<template>
  <WorkbenchSurfaceCard flush class="archive-volume-scores-panel">
    <template #head>
      <div class="archive-volume-scores-panel__head">
        <h3 class="archive-volume-scores-panel__title">成绩完成度确认</h3>
        <div class="archive-volume-scores-panel__actions">
          <UiTag :tone="completionTone" size="sm">{{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}</UiTag>
          <span v-if="confirmMeta" class="archive-volume-scores-panel__meta">{{ confirmMeta }}</span>
        </div>
      </div>
    </template>
    <template v-if="canConfirmScoreCompletion" #toolbar>
      <UiButton size="sm" :loading="scoreConfirmSubmitting" @click="handleConfirmScoreCompletion">
        确认成绩完成
      </UiButton>
    </template>

    <UiSkeletonState v-if="gateLoading" variant="card" compact />
    <div v-else class="archive-volume-scores-panel__gates">
      <ArchiveExamScoreGatePanel
        v-if="showExamGate"
        :gate="examGate"
        :loading="gateLoading"
      />
      <div v-if="showTeachingAffairsGate" class="score-gate">
        <span class="score-gate__check" :class="teachingAffairsGatePassed ? 'score-gate__check--pass' : 'score-gate__check--fail'">
          {{ teachingAffairsGatePassed ? '✓' : '✗' }}
        </span>
        <div>
          <div class="score-gate__title">平时成绩 — {{ teachingAffairsGateLabel }}</div>
          <div class="score-gate__hint">{{ ARCHIVE_TEACHING_AFFAIRS_SCORE_COMPLETION_HINT }}</div>
        </div>
      </div>
    </div>

    <div v-if="canSyncTeachingAffairs" class="archive-volume-scores-panel__sync-form">
      <h3 class="archive-volume-scores-panel__subheading">教务成绩完成同步</h3>
      <a-form layout="vertical" class="archive-volume-scores-panel__sync-fields">
        <a-form-item label="外部同步单号" required>
          <a-input v-model:value="teachingAffairsSyncNo" placeholder="教务系统业务单号" />
        </a-form-item>
        <a-form-item label="来源系统" required>
          <a-input v-model:value="teachingAffairsSourceSystem" placeholder="如 TEACHING_AFFAIRS" />
        </a-form-item>
        <a-form-item label="成绩证明文件 ID">
          <a-input v-model:value="teachingAffairsProofFileId" placeholder="上传后填写 fileId" />
        </a-form-item>
        <UiButton size="sm" :loading="teachingAffairsSyncing" @click="handleSyncTeachingAffairs">
          同步教务成绩完成
        </UiButton>
      </a-form>
    </div>

    <div class="archive-volume-scores-panel__materials">
      <h3 class="archive-volume-scores-panel__subheading">成绩证明材料</h3>
      <UiDataTable
        pagination-mode="none"
        :columns="scoreMaterialColumns"
        :data-source="scoreMaterials"
        :show-pagination="false"
        flat
        row-key="materialId"
        size="middle"
        empty-description="暂无成绩证明材料"
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
  ArchiveVolumeDetailVO,
  ArchiveVolumeExamGateVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreCompletionStatusDescription,
  ArchiveScoreSourceCode,
  confirmArchiveVolumeScoreCompletion,
  getArchiveVolumeExamGate,
  syncTeachingAffairsScoreCompletion,
} from '@/apis/mark/archive-volume'
import { ARCHIVE_TEACHING_AFFAIRS_SCORE_COMPLETION_HINT } from '@/apis/mark/teaching-affairs-sync'
import ArchiveExamScoreGatePanel from '@/components/archive-volume/ArchiveExamScoreGatePanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { buildArchiveMaterialStatusView } from '@/utils/archive-material-status-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeScoresPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailVO
  canConfirmScoreCompletion: boolean
  canSyncTeachingAffairs: boolean
}>()

const emit = defineEmits<{
  refreshed: []
}>()

const SCORE_MATERIAL_TYPES = new Set<ArchiveMaterialTypeCode>([
  ArchiveMaterialTypeCode.TRANSCRIPT,
  ArchiveMaterialTypeCode.ITEMIZED_SCORE,
  ArchiveMaterialTypeCode.COURSE_GRADING_BASIS,
  ArchiveMaterialTypeCode.GRADING_INSTRUCTION,
])

const scoreConfirmSubmitting = ref(false)
const teachingAffairsSyncing = ref(false)
const gateLoading = ref(false)
const examGate = ref<ArchiveVolumeExamGateVO | null>(null)
const teachingAffairsSyncNo = ref('')
const teachingAffairsSourceSystem = ref(ArchiveScoreSourceCode.TEACHING_AFFAIRS)
const teachingAffairsProofFileId = ref('')

const scoreMaterials = computed(() =>
  (props.detail.materials ?? []).filter((item) => SCORE_MATERIAL_TYPES.has(item.materialType)),
)

const showExamGate = computed(
  () => props.detail.volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL && !!props.detail.volume.examId,
)

const showTeachingAffairsGate = computed(
  () => props.detail.volume.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS,
)

const teachingAffairsGatePassed = computed(
  () =>
    props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.COMPLETED
    || props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.VERIFIED,
)

const teachingAffairsGateLabel = computed(() => {
  if (props.detail.volume.externalBusinessNo) {
    return `已同步 ${props.detail.volume.externalBusinessNo}`
  }
  return teachingAffairsGatePassed.value ? '已确认' : '待同步'
})

const completionTone = computed((): BadgeTone => {
  const code = props.detail.volume.scoreCompletionStatus
  if (code === ArchiveScoreCompletionStatusCode.COMPLETED || code === ArchiveScoreCompletionStatusCode.VERIFIED) return 'green'
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

const scoreMaterialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
  { title: '状态', key: 'submissionStatus', width: 120 },
]

function scoreCompletionLabel(code: ArchiveVolumeDetailVO['volume']['scoreCompletionStatus']) {
  return strictEnumLabel(ArchiveScoreCompletionStatusDescription, code, 'scoreCompletionStatus')
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function materialStatusView(code: ArchiveMaterialSubmissionStatusCode) {
  return buildArchiveMaterialStatusView(code)
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
    showUserError(error)
    examGate.value = null
  } finally {
    gateLoading.value = false
  }
}

async function handleConfirmScoreCompletion() {
  if (!props.volumeId) return
  scoreConfirmSubmitting.value = true
  try {
    await confirmArchiveVolumeScoreCompletion({
      volumeId: props.volumeId,
      scoreCompletionStatus: ArchiveScoreCompletionStatusCode.COMPLETED,
    })
    message.success('成绩完成状态已确认')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    scoreConfirmSubmitting.value = false
  }
}

async function handleSyncTeachingAffairs() {
  if (!props.volumeId) return
  const externalSyncNo = teachingAffairsSyncNo.value.trim()
  const externalSourceSystem = teachingAffairsSourceSystem.value.trim()
  if (!externalSyncNo || !externalSourceSystem) {
    message.warning('请填写外部同步单号与来源系统')
    return
  }
  teachingAffairsSyncing.value = true
  try {
    await syncTeachingAffairsScoreCompletion({
      volumeId: props.volumeId,
      externalSyncNo,
      externalSourceSystem,
      scoreCompletionStatus: ArchiveScoreCompletionStatusCode.COMPLETED,
      scoreProofFileId: teachingAffairsProofFileId.value.trim() || undefined,
    })
    message.success('教务成绩完成状态已同步')
    emit('refreshed')
  } catch (error) {
    showUserError(error)
  } finally {
    teachingAffairsSyncing.value = false
  }
}

onMounted(() => {
  void loadExamGate()
})

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
  gap: var(--dp-space-4, 16px);
}

.archive-volume-scores-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-scores-panel__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-scores-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.archive-volume-scores-panel__meta {
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}

.archive-volume-scores-panel__gates {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
}

.archive-volume-scores-panel__subheading {
  margin: 0 0 var(--dp-space-2, 8px);
  font-size: 14px;
  font-weight: 600;
}

.archive-volume-scores-panel__sync-form {
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel);
}

.archive-volume-scores-panel__sync-fields {
  max-width: 480px;
}

.archive-volume-scores-panel__materials {
  border-top: 1px solid var(--dp-border, #e5e7eb);
  padding-top: var(--dp-space-3, 12px);
}
</style>
