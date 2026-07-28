<script setup lang="ts">
/**
 * 阅卷考后讲评页：质量评价同步状态芯片与跳转。
 */
import type { ExamSummaryResponse } from '@/apis/mark/exam'
import type {
  MarkExamCourseSyncStatusVO,
  MarkExamSyncStatusVO,
} from '@/apis/quality/mark-exam-sync'
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
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkQualitySyncChip' })

const props = defineProps<{
  exam?: ExamSummaryResponse | null
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

const courseStatuses = computed(() => syncStatus.value?.courseStatuses ?? [])

const courseMenuItems = computed(() =>
  courseStatuses.value.map(course => ({
    key: course.qualityCourseId,
    label: course.qualityCourseCode
      ? `${course.qualityCourseName || '质量课程'}（${course.qualityCourseCode}）`
      : course.qualityCourseName || `质量课程 ${course.qualityCourseId}`,
  })),
)

function goQuality(course: MarkExamCourseSyncStatusVO) {
  const query: Record<string, string> = {
    qualityCourseId: course.qualityCourseId,
  }
  if (course.trainingPlanId) {
    query.trainingPlanId = course.trainingPlanId
  }
  void router.push({
    name: 'QualityAchievement',
    query,
  })
}

function goSingleQuality() {
  const course = courseStatuses.value[0]
  if (course) goQuality(course)
}

function goSelectedQuality(qualityCourseId: string) {
  const course = courseStatuses.value.find(item => item.qualityCourseId === qualityCourseId)
  if (course) goQuality(course)
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
      v-if="courseStatuses.length === 1"
      variant="ghost"
      size="sm"
      :loading="loading"
      :disabled="syncStatus?.status === 'NOT_CONFIGURED'"
      @click="goSingleQuality"
    >
      打开质量达成度
    </UiButton>
    <UiDropdownAction
      v-else-if="courseStatuses.length > 1"
      trigger-style="button"
      button-text="选择教学班"
      :items="courseMenuItems"
      :disabled="syncStatus?.status === 'NOT_CONFIGURED'"
      @select="goSelectedQuality"
    />
  </div>
</template>

<style scoped lang="scss">
.mark-quality-sync-chip {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  flex-wrap: wrap;
}

.mark-quality-sync-chip__message {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}
</style>
