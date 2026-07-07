<template>
  <div v-if="examId" class="exam-archive-gate-banner">
    <a-skeleton v-if="loading" active :paragraph="{ rows: compact ? 1 : 2 }" />
    <UiAlertStrip
      v-else-if="loadFailed"
      tone="error"
      title="加载归档门禁失败"
      description="无法读取成绩发布与关考进度。"
      dense
    />
    <UiAlertStrip
      v-else-if="gate"
      :tone="bannerTone"
      :title="bannerTitle"
      :description="bannerDescription"
      dense
    >
      <template v-if="showCloseReadyAction" #actions>
        <UiButton variant="outline" size="sm" @click="emit('go-close-exam')"> 前往关考 </UiButton>
      </template>
    </UiAlertStrip>
    <UiDataTable
      v-if="showClassProgressTable && showClassTable"
      :columns="classColumns"
      :data-source="classRows"
      :loading="loading"
      flat
      row-key="classId"
      size="small"
      class="exam-archive-gate-banner__table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'progress'">
          {{ record.publishedScoreCount }}/{{ record.boundPaperCount }}
        </template>
        <template v-else-if="column.key === 'unpublished'">
          <UiTag v-if="record.unpublishedBoundPaperCount > 0" tone="orange" size="sm">
            {{ record.unpublishedBoundPaperCount }} 份未发布
          </UiTag>
          <UiTag v-else tone="green" size="sm">已完成</UiTag>
        </template>
      </template>
    </UiDataTable>
  </div>
</template>

<script lang="ts" setup>
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import { getArchiveVolumeExamGate } from '@/apis/mark/archive-volume'
import { computed, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import {
  buildCloseExamReadyContent,
  useExamArchiveGateHint,
} from '@/composables/useExamArchiveGateHint'
import { showUserError } from '@/utils/error-handler'

const props = withDefaults(
  defineProps<{
    examId?: string | null
    compact?: boolean
    /** 是否在 Banner 下展示按班进度表；与 compact 独立，发布页可紧凑条 + 小表 */
    showClassProgressTable?: boolean
    /** 全场 riskOverview + 门禁联合口径；未传时回退 gate.allScoresPublished */
    scoresFullyPublished?: boolean
  }>(),
  {
    examId: null,
    compact: false,
    showClassProgressTable: true,
    scoresFullyPublished: undefined,
  },
)

const emit = defineEmits<{
  'go-close-exam': []
  loaded: [ArchiveVolumeExamGateResponse]
}>()

const loading = ref(false)
const loadFailed = ref(false)
const gate = ref<ArchiveVolumeExamGateResponse | null>(null)

const { gateProgressHint, gateAnomaly, incompleteClasses } = useExamArchiveGateHint(gate)

const closeExamReady = computed(() => {
  if (props.scoresFullyPublished === true) {
    return true
  }
  if (props.scoresFullyPublished === false) {
    return false
  }
  return gate.value?.allScoresPublished === true
})

const bannerTone = computed(() => {
  if (gateAnomaly.value) {
    return 'error'
  }
  if (gate.value?.gateOpen) {
    return 'success'
  }
  if (closeExamReady.value && !gate.value?.examClosed) {
    return 'success'
  }
  if ((gate.value?.unpublishedBoundPaperCount ?? 0) > 0 || props.scoresFullyPublished === false) {
    return 'warning'
  }
  return 'info'
})

const bannerTitle = computed(() => {
  const current = gate.value
  if (!current) {
    return '归档前置条件'
  }
  if (current.gateOpen) {
    return '双门禁已满足'
  }
  if (gateAnomaly.value) {
    return '考试状态异常'
  }
  if (closeExamReady.value && !current.examClosed) {
    return '成绩已全部发布'
  }
  if ((current.unpublishedBoundPaperCount ?? 0) > 0 || props.scoresFullyPublished === false) {
    return '尚有成绩未发布'
  }
  return '归档前置条件'
})

const bannerDescription = computed(() => {
  const current = gate.value
  if (!current) {
    return '—'
  }
  if (closeExamReady.value && !current.examClosed) {
    return buildCloseExamReadyContent(current)
  }
  if (incompleteClasses.value.length > 0) {
    const classHint = incompleteClasses.value
      .slice(0, 3)
      .map((item) => `${item.className} ${item.unpublishedBoundPaperCount} 份`)
      .join('；')
    return `${gateProgressHint.value}${classHint ? `（${classHint}）` : ''}`
  }
  return gateProgressHint.value
})

const showCloseReadyAction = computed(
  () => props.compact && closeExamReady.value && gate.value?.examClosed !== true,
)

const showClassTable = computed(
  () =>
    (gate.value?.classPublishProgress?.length ?? 0) > 0 &&
    (gate.value?.unpublishedBoundPaperCount ?? 0) > 0,
)

const classColumns = [
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '已发布/可评阅', key: 'progress', width: 120 },
  { title: '未发布', key: 'unpublished', width: 120 },
]

const classRows = computed(() =>
  (gate.value?.classPublishProgress ?? []).map((item) => ({
    classId: item.classId,
    className: item.className?.trim() || (item.classId ? `班级 ${item.classId}` : '未分班'),
    boundPaperCount: item.boundPaperCount ?? 0,
    publishedScoreCount: item.publishedScoreCount ?? 0,
    unpublishedBoundPaperCount: item.unpublishedBoundPaperCount ?? 0,
  })),
)

async function refresh(): Promise<void> {
  if (!props.examId) {
    gate.value = null
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    gate.value = await getArchiveVolumeExamGate(props.examId)
    emit('loaded', gate.value)
  } catch (error) {
    gate.value = null
    loadFailed.value = true
    showUserError(error, '加载考试双门禁失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.examId,
  () => {
    void refresh()
  },
  { immediate: true },
)

defineExpose({
  gate,
  refresh,
})
</script>

<style scoped lang="scss">
.exam-archive-gate-banner {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
}

.exam-archive-gate-banner__table {
  margin-top: var(--dp-space-2);
}
</style>
