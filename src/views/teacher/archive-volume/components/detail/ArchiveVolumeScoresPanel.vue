<template>
  <section class="archive-volume-scores-panel">
    <a-descriptions bordered size="small" :column="2" class="archive-volume-scores-panel__lifecycle">
      <a-descriptions-item label="成绩完成">
        {{ scoreCompletionLabel(detail.volume.scoreCompletionStatus) }}
      </a-descriptions-item>
      <a-descriptions-item label="成绩来源">
        {{ detail.volume.scoreSource ?? '—' }}
      </a-descriptions-item>
    </a-descriptions>
    <div v-if="canConfirmScoreCompletion" class="archive-volume-scores-panel__toolbar">
      <UiButton size="sm" :loading="scoreConfirmSubmitting" @click="handleConfirmScoreCompletion">
        确认成绩完成
      </UiButton>
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
      </template>
    </UiDataTable>
  </section>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchiveMaterialTypeCode,
  ArchiveVolumeDetailVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import {
  ARCHIVE_MATERIAL_TYPE_LABEL,
  ARCHIVE_SCORE_COMPLETION_STATUS_LABEL,
  confirmArchiveVolumeScoreCompletion,
  syncTeachingAffairsScoreCompletion,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { showUserError } from '@/utils/error-handler'
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
  'TRANSCRIPT',
  'ITEMIZED_SCORE',
  'COURSE_GRADING_BASIS',
  'GRADING_INSTRUCTION',
])

const scoreConfirmSubmitting = ref(false)
const teachingAffairsSyncing = ref(false)
const teachingAffairsSyncNo = ref('')
const teachingAffairsSourceSystem = ref('TEACHING_AFFAIRS')
const teachingAffairsProofFileId = ref('')

const scoreMaterials = computed(() =>
  (props.detail.materials ?? []).filter(item => SCORE_MATERIAL_TYPES.has(item.materialType)),
)

const scoreMaterialColumns: ColumnsType<ArchiveVolumeMaterialVO> = [
  { title: '材料类型', key: 'materialType', width: 160 },
  { title: '文件名', dataIndex: 'fileName' },
  { title: '学号', dataIndex: 'studentNo', width: 120 },
]

function scoreCompletionLabel(code: ArchiveVolumeDetailVO['volume']['scoreCompletionStatus']) {
  return strictEnumLabel(ARCHIVE_SCORE_COMPLETION_STATUS_LABEL, code, 'scoreCompletionStatus')
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

async function handleConfirmScoreCompletion() {
  if (!props.volumeId) return
  scoreConfirmSubmitting.value = true
  try {
    await confirmArchiveVolumeScoreCompletion({
      volumeId: props.volumeId,
      scoreCompletionStatus: 'COMPLETED',
    })
    message.success('成绩完成状态已确认')
    emit('refreshed')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
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
      scoreCompletionStatus: 'COMPLETED',
      scoreProofFileId: teachingAffairsProofFileId.value.trim() || undefined,
    })
    message.success('教务成绩完成状态已同步')
    emit('refreshed')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    teachingAffairsSyncing.value = false
  }
}
</script>

<style scoped>
.archive-volume-scores-panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.archive-volume-scores-panel__lifecycle {
  margin-bottom: var(--dp-space-3, 12px);
}

.archive-volume-scores-panel__subheading {
  margin: 0 0 var(--dp-space-2, 8px);
  font-size: 14px;
  font-weight: 600;
}

.archive-volume-scores-panel__sync-form {
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control, 8px);
}

.archive-volume-scores-panel__sync-fields {
  max-width: 480px;
}

.archive-volume-scores-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}
</style>
