<script setup lang="ts">
/**
 * 阅卷考后讲评页：质量评价同步状态芯片与跳转。
 */
import type { ExamSummaryVO } from '@/apis/mark/exam'
import type { MarkExamSyncStatusVO } from '@/apis/quality/mark-exam-sync'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  MARK_EXAM_QUALITY_SYNC_STATUS_TONE,
  MarkExamQualitySyncStatusDescription,
  markExamSyncApi,
} from '@/apis/quality/mark-exam-sync'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkQualitySyncChip' })

const props = defineProps<{
  exam?: ExamSummaryVO | null
}>()

const router = useRouter()
const loading = ref(false)
const syncStatus = ref<MarkExamSyncStatusVO | null>(null)

const canQuery = computed(
  () => props.exam?.examId && props.exam.courseId && props.exam.academicYear && props.exam.semester,
)

const statusLabel = computed(() => {
  if (!syncStatus.value?.status) return '质量同步：加载中'
  const label = strictEnumLabel(
    MarkExamQualitySyncStatusDescription,
    syncStatus.value.status,
    '质量同步状态',
  )
  return `质量评价同步：${label}`
})

const statusTone = computed<BadgeTone>(() => {
  if (!syncStatus.value?.status) return 'gray'
  return strictEnumTone(MARK_EXAM_QUALITY_SYNC_STATUS_TONE, syncStatus.value.status, '质量同步状态')
})

async function loadStatus() {
  if (!canQuery.value || !props.exam) {
    syncStatus.value = null
    return
  }
  loading.value = true
  try {
    syncStatus.value = await markExamSyncApi.status({
      examId: props.exam.examId,
      courseId: props.exam.courseId!,
      academicYear: props.exam.academicYear!,
      semester: props.exam.semester!,
    })
  } catch (error) {
    syncStatus.value = null
    showUserError(error, '质量同步状态加载失败')
  } finally {
    loading.value = false
  }
}

function goQuality() {
  const query: Record<string, string> = {}
  if (syncStatus.value?.trainingPlanId) {
    query.trainingPlanId = syncStatus.value.trainingPlanId
  }
  if (syncStatus.value?.qualityCourseId) {
    query.qualityCourseId = syncStatus.value.qualityCourseId
  }
  void router.push({
    name: 'QualityAchievement',
    query,
  })
}

watch(
  () => props.exam?.examId,
  () => {
    void loadStatus()
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="canQuery" class="mark-quality-sync-chip">
    <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
    <span v-if="syncStatus?.message" class="mark-quality-sync-chip__message">
      {{ syncStatus.message }}
    </span>
    <UiButton
      variant="ghost"
      size="sm"
      :loading="loading"
      :disabled="syncStatus?.status === 'NOT_CONFIGURED'"
      @click="goQuality"
    >
      打开质量达成度
    </UiButton>
  </div>
</template>

<style scoped lang="scss">
.mark-quality-sync-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mark-quality-sync-chip__message {
  color: var(--dp-text-muted);
  font-size: 12px;
}
</style>
