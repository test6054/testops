<template>
  <WorkbenchSurfaceCard flush embedded class="archive-volume-scores-panel">
    <template #head>
      <div class="archive-volume-scores-panel__head">
        <h3 class="archive-volume-scores-panel__title">成绩材料与门禁</h3>
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
    <template #toolbar>
      <UiButton size="sm" variant="primary" @click="emit('open-materials')">
        去材料登记
      </UiButton>
    </template>

    <p class="archive-volume-scores-panel__hint">
      高校归档提交前须齐备成绩主证据：模板将成绩单或分项成绩标为必交时，成绩维须至少提交其一（仅认已提交，豁免不计）；
      目录逐项齐备仍由完整性门禁承担。线上阅卷卷另须考试双门禁开放；教务成绩卷须完成同步。
    </p>

    <UiSkeletonState v-if="gateLoading" variant="card" compact />
    <div v-else class="archive-volume-scores-panel__gates">
      <ArchiveExamScoreGatePanel v-if="showExamGate" :gate="examGate" :loading="gateLoading" />
      <div v-if="showTeachingAffairsSyncFact" class="score-gate">
        <span class="score-gate__check score-gate__check--pass">✓</span>
        <div>
          <div class="score-gate__title">教务成绩回写事实（只读）</div>
          <div class="score-gate__hint">
            {{ teachingAffairsSyncFactHint }}
          </div>
        </div>
      </div>
      <div class="score-gate">
        <span
          class="score-gate__check"
          :class="scoreMaterialGatePassed ? 'score-gate__check--pass' : 'score-gate__check--fail'"
        >
          {{ scoreMaterialGatePassed ? '✓' : '✗' }}
        </span>
        <div>
          <div class="score-gate__title">成绩主证据 — {{ scoreMaterialGateLabel }}</div>
          <div class="score-gate__hint">{{ scoreMaterialGateHint }}</div>
        </div>
      </div>
    </div>

    <div class="archive-volume-scores-panel__materials">
      <h3 class="archive-volume-scores-panel__subheading">成绩类材料</h3>
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="scoreMaterialColumns"
        :data-source="materialsLoadFailed ? [] : scoreMaterials"
        :loading="materialsLoading === true"
        :total="pageTotal"
        flat
        row-key="materialId"
        size="middle"
        empty-description="暂无成绩类材料"
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
  ArchiveVolumeDetailResponse,
  ArchiveVolumeExamGateResponse,
  ArchiveVolumeMaterialResponse,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreCompletionStatusDescription,
  ArchiveScoreSourceCode,
  getArchiveVolumeExamGate,
  pageArchiveVolumeMaterials,
} from '@/apis/mark/archive-volume'
import ArchiveExamScoreGatePanel from '@/components/archive-volume/ArchiveExamScoreGatePanel.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { ArchiveMaterialSubmissionStatusCode } from '@/types/enums/archive-material-submission-status-enum'
import { isPrimaryArchiveScoreEvidenceMaterial } from '@/types/enums/archive-material-type-enum'
import { buildArchiveMaterialStatusView } from '@/utils/archive-material-status-ui'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeScoresPanel' })

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
}>()

const emit = defineEmits<{
  'refreshed': []
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

/** 历史教务回写卷：只展示系统回写事实，不得再伪装为教师可操作门禁。 */
const showTeachingAffairsSyncFact = computed(
  () => props.detail.volume.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS,
)

const teachingAffairsSyncFactHint = computed(() => {
  const statusLabel = scoreCompletionLabel(props.detail.volume.scoreCompletionStatus)
  const externalNo = props.detail.volume.externalBusinessNo?.trim()
  const completed
    = props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.COMPLETED
      || props.detail.volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.VERIFIED
  if (completed) {
    if (externalNo) {
      return `教务成绩已同步完成（${statusLabel}，外部单号 ${externalNo}）。成绩主证据仍须按模板登记并满足完整性。`
    }
    return `教务成绩已同步完成（${statusLabel}）。成绩主证据仍须按模板登记并满足完整性。`
  }
  if (externalNo) {
    return `教务成绩尚未同步完成（当前 ${statusLabel}，外部单号 ${externalNo}）；须等系统回写完成后方可提交，同时登记模板成绩主证据。`
  }
  return `教务成绩尚未同步完成（当前 ${statusLabel}）；须等系统回写完成后方可提交，同时登记模板成绩主证据。教师端不手工录入教务同步单号。`
})

const submittedPrimaryScoreMaterialCount = computed(() =>
  scoreMaterials.value.filter(
    (item) =>
      isPrimaryArchiveScoreEvidenceMaterial(item.materialType)
      && item.submissionStatus === ArchiveMaterialSubmissionStatusCode.SUBMITTED,
  ).length,
)

const scoreMaterialGatePassed = computed(() => {
  if (props.detail.volume.scoreSubmitReady === true) {
    return true
  }
  return submittedPrimaryScoreMaterialCount.value > 0
})

const scoreMaterialGateLabel = computed(() => {
  if (submittedPrimaryScoreMaterialCount.value > 0) {
    return `已提交 ${submittedPrimaryScoreMaterialCount.value} 份主证据`
  }
  if (materialsLoading.value) {
    return '加载中'
  }
  if (materialsLoadFailed.value) {
    return '材料加载失败'
  }
  if (props.detail.volume.scoreSubmitReady === false) {
    return '未齐备'
  }
  if (props.detail.volume.scoreSubmitReady === true) {
    return '成绩维度已齐备'
  }
  return '等待提交清单判定'
})

const scoreMaterialGateHint = computed(() => {
  if (submittedPrimaryScoreMaterialCount.value > 0) {
    return '成绩单或分项成绩已提交；若提交仍被阻断，请核对考试双门禁或教务同步状态。'
  }
  if (props.detail.volume.scoreSubmitReady === true) {
    return '当前模板与成绩来源门禁已满足；材料表仅展示当前分页，最终以提交清单实时判定为准。'
  }
  return '请在材料清单登记并提交成绩单或分项成绩。延期/豁免不能替代成绩主证据。'
})

const completionTone = computed((): BadgeTone => {
  const code = props.detail.volume.scoreCompletionStatus
  if (
    code === ArchiveScoreCompletionStatusCode.COMPLETED
    || code === ArchiveScoreCompletionStatusCode.VERIFIED
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

<style scoped lang="scss">
.archive-volume-scores-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-3);
  min-width: 0;
}

.archive-volume-scores-panel__title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-volume-scores-panel__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.archive-volume-scores-panel__meta {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-volume-scores-panel__hint {
  margin: 0 0 var(--dp-space-3);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
  color: var(--dp-text-secondary);
}

.archive-volume-scores-panel__gates {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  margin-bottom: var(--dp-space-4);
}

.score-gate {
  display: flex;
  gap: var(--dp-space-3);
  align-items: flex-start;
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.score-gate__check {
  flex: 0 0 auto;
  font-weight: 700;
}

.score-gate__check--pass {
  color: var(--dp-success);
}

.score-gate__check--fail {
  color: var(--dp-error);
}

.score-gate__title {
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.score-gate__hint {
  margin-top: 4px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-volume-scores-panel__subheading {
  margin: 0 0 var(--dp-space-2);
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.material-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.material-status-icon {
  font-size: var(--dp-font-size-xs);
}

.material-status-label {
  font-size: var(--dp-font-size-sm);
}
</style>
