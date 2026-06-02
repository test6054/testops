<script lang="ts" setup>
import type { MarkingScanPageRefVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { QUALITY_DECISION_LABEL, QUALITY_DECISION_TONE } from '@/apis/mark/exam'
import { UiAlertStrip, UiEmpty, UiErrorRetryPanel, UiTag } from '@/components/ui-guide/ui'
import { toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingScanMaterialPanel' })

const props = defineProps<{
  sliceFileId?: string
  sourceScanPage?: MarkingScanPageRefVO | null
}>()

type ViewTab = 'slice' | 'source'

const activeTab = ref<ViewTab>('slice')
const sliceImageUrl = ref('')
const sourceImageUrl = ref('')
const loading = ref(false)
const loadError = ref<Error | null>(null)

const hasSlice = computed(() => Boolean(props.sliceFileId))
const hasSource = computed(() => Boolean(props.sourceScanPage?.fileId))
const showTabs = computed(() => hasSlice.value && hasSource.value)

const sourceQualityLabel = computed(() => {
  const status = props.sourceScanPage?.qualityStatus
  if (!status) return ''
  return strictEnumLabel(QUALITY_DECISION_LABEL, status, '扫描页质量判定')
})

const sourceQualityTone = computed((): BadgeTone => {
  const status = props.sourceScanPage?.qualityStatus
  if (!status) return 'gray'
  return strictEnumTone(QUALITY_DECISION_TONE, status, '扫描页质量判定')
})

const sourcePageCaption = computed(() => {
  const page = props.sourceScanPage
  if (!page) return ''
  return `第 ${page.pageSeq} 页 · 模板页 ${page.templatePageNo}`
})

function releaseImages(): void {
  if (sliceImageUrl.value) {
    URL.revokeObjectURL(sliceImageUrl.value)
    sliceImageUrl.value = ''
  }
  if (sourceImageUrl.value) {
    URL.revokeObjectURL(sourceImageUrl.value)
    sourceImageUrl.value = ''
  }
}

async function loadImages(): Promise<void> {
  releaseImages()
  loadError.value = null
  if (!hasSlice.value && !hasSource.value) {
    return
  }
  loading.value = true
  try {
    const jobs: Promise<void>[] = []
    if (props.sliceFileId) {
      jobs.push(
        getImageBlobUrl(props.sliceFileId).then((url) => {
          sliceImageUrl.value = url
        }),
      )
    }
    if (props.sourceScanPage?.fileId) {
      jobs.push(
        getImageBlobUrl(props.sourceScanPage.fileId).then((url) => {
          sourceImageUrl.value = url
        }),
      )
    }
    await Promise.all(jobs)
    if (!hasSlice.value && hasSource.value) {
      activeTab.value = 'source'
    } else {
      activeTab.value = 'slice'
    }
  } catch (error) {
    loadError.value = toUserError(error, '阅卷影像加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.sliceFileId, props.sourceScanPage?.fileId] as const,
  () => {
    void loadImages()
  },
  { immediate: true },
)

onBeforeUnmount(releaseImages)
</script>

<template>
  <div class="marking-scan-material">
    <UiEmpty v-if="!hasSlice && !hasSource" description="暂无阅卷影像材料" />
    <UiErrorRetryPanel
      v-else-if="loadError"
      :error="loadError"
      title="阅卷影像加载失败"
      compact
      @retry="loadImages"
    />
    <template v-else>
      <a-segmented
        v-if="showTabs"
        v-model:value="activeTab"
        class="marking-scan-material__tabs"
        :options="[
          { label: '作答切片', value: 'slice' },
          { label: '原始扫描页', value: 'source' },
        ]"
      />
      <div v-else-if="hasSource && !hasSlice" class="marking-scan-material__solo-label">
        原始扫描页
      </div>
      <div v-else-if="hasSlice && !hasSource" class="marking-scan-material__solo-label">
        作答切片
      </div>
      <UiAlertStrip
        v-if="activeTab === 'source' && sourceScanPage?.qualityStatus === 'BLOCKED'"
        tone="warning"
        title="扫描页质量阻断"
        description="该页扫描质量未通过自动检测，请结合原始影像谨慎批阅。"
        dense
        class="marking-scan-material__alert"
      />
      <a-spin :spinning="loading" tip="加载影像中...">
        <div v-if="activeTab === 'slice'" class="marking-scan-material__viewer">
          <a-image
            v-if="sliceImageUrl"
            :src="sliceImageUrl"
            :preview="{}"
            class="marking-scan-material__image"
          >
            <template #previewMask>点击查看切片大图</template>
          </a-image>
          <UiEmpty v-else-if="!loading" description="切片图片加载失败" />
        </div>
        <div v-else class="marking-scan-material__viewer">
          <div v-if="sourceScanPage" class="marking-scan-material__source-meta">
            <UiTag tone="blue" size="sm">{{ sourcePageCaption }}</UiTag>
            <UiTag :tone="sourceQualityTone" size="sm">{{ sourceQualityLabel }}</UiTag>
          </div>
          <a-image
            v-if="sourceImageUrl"
            :src="sourceImageUrl"
            :preview="{}"
            class="marking-scan-material__image"
          >
            <template #previewMask>点击查看原始扫描页</template>
          </a-image>
          <UiEmpty v-else-if="!loading" description="原始扫描页加载失败" />
        </div>
      </a-spin>
    </template>
  </div>
</template>

<style scoped>
.marking-scan-material {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.marking-scan-material__tabs {
  align-self: flex-start;
}

.marking-scan-material__solo-label {
  color: var(--dp-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
}

.marking-scan-material__alert {
  margin: 0;
}

.marking-scan-material__viewer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.marking-scan-material__source-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.marking-scan-material__image {
  width: 100%;
  border-radius: 4px;
  border: 1px solid var(--dp-border-subtle, #e2e8f0);
}
</style>
