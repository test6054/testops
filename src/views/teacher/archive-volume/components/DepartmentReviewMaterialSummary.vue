<script setup lang="ts">
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveCatalogStatusDescription,
  ArchiveVolumeSubmitChecklistPhaseDescription,
  getArchiveVolumeMaterialStats,
} from '@/apis/mark/archive-volume'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import {
  ArchiveSelfCheckStatusCode,
  ArchiveSelfCheckStatusDescription,
} from '@/types/enums/archive-self-check-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const props = defineProps<{
  volumeId: string
  detail: ArchiveVolumeDetailResponse
  /** 列表抽屉不跳转 Tab 时隐藏快捷入口 */
  showNavigateActions?: boolean
}>()

const emit = defineEmits<{
  navigate: [tabKey: string]
}>()

const ARCHIVE_SELF_CHECK_STATUS_TONE = {
  [ArchiveSelfCheckStatusCode.NOT_STARTED]: 'gray',
  [ArchiveSelfCheckStatusCode.IN_PROGRESS]: 'orange',
  [ArchiveSelfCheckStatusCode.COMPLETED]: 'green',
} as const

const materialCount = ref<number | null>(null)

const catalogLabel = computed(() => {
  const status = props.detail.catalogStatus
  if (!status) return '—'
  return strictEnumLabel(ArchiveCatalogStatusDescription, status, 'catalogStatus')
})

const selfCheckLabel = computed(() => {
  const status = props.detail.selfCheckStatus
  if (!status) return '—'
  return strictEnumLabel(ArchiveSelfCheckStatusDescription, status, 'selfCheckStatus')
})

const selfCheckTone = computed(() => {
  const status = props.detail.selfCheckStatus
  if (!status) return 'gray'
  return strictEnumTone(ARCHIVE_SELF_CHECK_STATUS_TONE, status, 'selfCheckStatus')
})

const integritySummary = computed(() => {
  const check = props.detail.latestIntegrityCheck
  if (check?.passed === true) return { label: '已通过', tone: 'green' as const }
  if (check?.passed === false) {
    const missing = check.missingItems?.length ?? 0
    return { label: missing > 0 ? `缺 ${missing} 项` : '未通过', tone: 'red' as const }
  }
  const status = props.detail.volume.integrityStatus
  if (status === 'WAIVED') return { label: '已豁免', tone: 'blue' as const }
  if (status === 'PASSED') return { label: '已通过', tone: 'green' as const }
  return { label: '待检', tone: 'orange' as const }
})

const checklistPhaseLabel = computed(() => {
  const key = props.detail.submitProgress?.checklistPhaseKey
  if (!key) return '—'
  return strictEnumLabel(ArchiveVolumeSubmitChecklistPhaseDescription, key, 'checklistPhaseKey')
})

const fourPropertySummary = computed(() => {
  const check = props.detail.latestFourPropertyCheck
  if (!check) return { label: '待检', tone: 'orange' as const }
  if (props.detail.fourPropertyStale) return { label: '待复检', tone: 'orange' as const }
  if (check.overallPassed === true) return { label: '已通过', tone: 'green' as const }
  if (check.overallPassed === false) return { label: '未通过', tone: 'red' as const }
  return { label: '待检', tone: 'orange' as const }
})

const missingItems = computed(() => props.detail.latestIntegrityCheck?.missingItems ?? [])

async function loadMaterialCount(): Promise<void> {
  if (!props.volumeId) {
    materialCount.value = null
    return
  }
  try {
    const stats = await getArchiveVolumeMaterialStats({ volumeId: props.volumeId })
    materialCount.value = stats.volumeSummary.totalCount
  } catch (error) {
    materialCount.value = null
    showUserError(error, '加载材料统计失败')
  }
}

watch(
  () => props.volumeId,
  () => {
    void loadMaterialCount()
  },
)

onMounted(() => {
  void loadMaterialCount()
})
</script>

<template>
  <section class="dept-review-summary">
    <div class="dept-review-summary__head">
      <span class="dept-review-summary__title">材料与提交前摘要</span>
      <span class="dept-review-summary__hint">院系档案员审核前可在此核对完整性，无需进入详情逐 Tab 切换</span>
    </div>
    <dl class="dept-review-summary__grid">
      <div class="dept-review-summary__item">
        <dt>已登记材料</dt>
        <dd>{{ materialCount ?? '—' }} 件</dd>
      </div>
      <div class="dept-review-summary__item">
        <dt>编目</dt>
        <dd>{{ catalogLabel }}</dd>
      </div>
      <div class="dept-review-summary__item">
        <dt>自查清单</dt>
        <dd>
          <UiTag :tone="selfCheckTone" size="sm">{{ selfCheckLabel }}</UiTag>
        </dd>
      </div>
      <div class="dept-review-summary__item">
        <dt>完整性</dt>
        <dd>
          <UiTag :tone="integritySummary.tone" size="sm">{{ integritySummary.label }}</UiTag>
        </dd>
      </div>
      <div class="dept-review-summary__item">
        <dt>四性检测</dt>
        <dd>
          <UiTag :tone="fourPropertySummary.tone" size="sm">{{ fourPropertySummary.label }}</UiTag>
        </dd>
      </div>
      <div class="dept-review-summary__item">
        <dt>提交前阶段</dt>
        <dd>{{ checklistPhaseLabel }}</dd>
      </div>
    </dl>
  </section>
  <ul v-if="missingItems.length > 0" class="dept-review-summary__missing">
    <li
      v-for="(item, index) in missingItems"
      :key="`${item.catalogCode ?? item.materialType}-${index}`"
    >
      {{ item.missingReason || item.catalogName || item.materialType }}
    </li>
  </ul>
  <div v-if="showNavigateActions" class="dept-review-summary__actions">
    <UiTextAction @click="emit('navigate', 'materials')">查看材料收集</UiTextAction>
    <UiTextAction @click="emit('navigate', 'integrity')">完整性与四性</UiTextAction>
  </div>
</template>

<style scoped lang="scss">
.dept-review-summary {
  padding: 12px;
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.dept-review-summary__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.dept-review-summary__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.dept-review-summary__hint {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.dept-review-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 0;
}

.dept-review-summary__item {
  dt {
    margin: 0 0 2px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  dd {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-primary);
  }
}

.dept-review-summary__missing {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--dp-color-error);
}
</style>
