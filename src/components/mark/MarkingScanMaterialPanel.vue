<script lang="ts" setup>
import type { MarkingScanPageRefVO } from '@/apis/mark/exam-scan'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { QUALITY_DECISION_TONE, QualityDecisionDescription } from '@/apis/mark/exam-scan'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSegmented from '@/components/ui-guide/ui/UiSegmented.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingScanMaterialPanel' })

const props = defineProps<{
  sliceFileId?: string
  sourceScanPage?: MarkingScanPageRefVO | null
  /** ANSWER_SHEET 模式下的制卷页引用（含fileId和ROI） */
  layoutPaperPage?: MarkingScanPageRefVO | null
  confidential?: boolean
  examLabel?: string
  watermarkLines?: string[]
}>()

type ViewTab = 'slice' | 'source' | 'layout'

const activeTab = ref<ViewTab>('slice')
const sliceImageUrl = ref('')
const sourceImageUrl = ref('')
const layoutImageUrl = ref('')
const loading = ref(false)

const hasSlice = computed(() => Boolean(props.sliceFileId))
const hasSource = computed(() => Boolean(props.sourceScanPage?.fileId))
const hasLayout = computed(() => Boolean(props.layoutPaperPage?.fileId))
const showTabs = computed(
  () => (hasSlice.value ? 1 : 0) + (hasSource.value ? 1 : 0) + (hasLayout.value ? 1 : 0) > 1,
)
const tabOptions = computed(() => {
  const options: { label: string, value: ViewTab }[] = []
  if (hasSlice.value) {
    options.push({ label: '作答切片', value: 'slice' })
  }
  if (hasSource.value) {
    options.push({ label: '原始扫描页', value: 'source' })
  }
  if (hasLayout.value) {
    options.push({ label: '制卷页', value: 'layout' })
  }
  return options
})

/** 制卷页 ROI 定位样式（像素→百分比，适配浏览器任意渲染尺寸） */
const layoutRoiStyle = computed(() => {
  const page = props.layoutPaperPage
  if (
    !page
    || page.roiX == null
    || page.roiY == null
    || page.roiWidth == null
    || page.roiHeight == null
  ) {
    return null
  }
  const pw = page.pageImageWidth
  const ph = page.pageImageHeight
  if (!pw || !ph || pw <= 0 || ph <= 0) return null
  return {
    left: `${(page.roiX / pw) * 100}%`,
    top: `${(page.roiY / ph) * 100}%`,
    width: `${(page.roiWidth / pw) * 100}%`,
    height: `${(page.roiHeight / ph) * 100}%`,
  }
})

const sourceQualityLabel = computed(() => {
  const status = props.sourceScanPage?.qualityStatus
  if (!status) return ''
  return strictEnumLabel(QualityDecisionDescription, status, '扫描页质量判定')
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
  if (layoutImageUrl.value) {
    URL.revokeObjectURL(layoutImageUrl.value)
    layoutImageUrl.value = ''
  }
}

async function loadImages(): Promise<void> {
  releaseImages()
  if (!hasSlice.value && !hasSource.value && !hasLayout.value) {
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
    if (props.layoutPaperPage?.fileId) {
      jobs.push(
        getImageBlobUrl(props.layoutPaperPage.fileId).then((url) => {
          layoutImageUrl.value = url
        }),
      )
    }
    await Promise.all(jobs)
    // 自动选择默认 tab: 切片优先 > 制卷页 > 原始扫描页
    if (hasSlice.value) {
      activeTab.value = 'slice'
    } else if (hasLayout.value) {
      activeTab.value = 'layout'
    } else {
      activeTab.value = 'source'
    }
  } catch (error) {
    showUserError(error, '阅卷影像加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.sliceFileId, props.sourceScanPage?.fileId, props.layoutPaperPage?.fileId],
  () => {
    void loadImages()
  },
  { immediate: true },
)

onBeforeUnmount(releaseImages)
</script>

<template>
  <div class="marking-scan-material">
    <UiEmpty size="sm" v-if="!hasSlice && !hasSource && !hasLayout" description="暂无阅卷影像材料" />
    <template v-else>
      <UiSegmented
        v-if="showTabs"
        v-model="activeTab"
        class="marking-scan-material__tabs"
        :options="tabOptions"
        size="sm"
      />
      <div v-else-if="hasSource && !hasSlice" class="marking-scan-material__solo-label">
        原始扫描页
      </div>
      <div v-else-if="hasSlice && !hasSource" class="marking-scan-material__solo-label">
        作答切片
      </div>
      <div
        v-else-if="hasLayout && !hasSlice && !hasSource"
        class="marking-scan-material__solo-label"
      >
        制卷页
      </div>
      <UiSpin :spinning="loading" tip="加载影像中...">
        <div v-if="activeTab === 'slice'" class="marking-scan-material__viewer">
          <ScanImageStage
            v-if="sliceImageUrl"
            :src="sliceImageUrl"
            :confidential="props.confidential"
            :exam-label="props.examLabel"
            :watermark-lines="props.watermarkLines"
            empty-text="切片图片加载失败"
          />
          <UiEmpty size="sm" v-else-if="!loading" description="暂无影像" />
        </div>
        <div v-else-if="activeTab === 'source'" class="marking-scan-material__viewer">
          <div v-if="sourceScanPage" class="marking-scan-material__source-meta">
            <UiTag tone="blue" size="sm">{{ sourcePageCaption }}</UiTag>
            <UiTag :tone="sourceQualityTone" size="sm">{{ sourceQualityLabel }}</UiTag>
          </div>
          <ScanImageStage
            v-if="sourceImageUrl"
            :src="sourceImageUrl"
            :confidential="props.confidential"
            :exam-label="props.examLabel"
            :watermark-lines="props.watermarkLines"
            empty-text="原始扫描页加载失败"
          />
          <UiEmpty size="sm" v-else-if="!loading" description="暂无影像" />
        </div>
        <div v-else-if="activeTab === 'layout'" class="marking-scan-material__viewer">
          <!-- 制卷页对照（ANSWER_SHEET 模式自动展示，含ROI题目区域高亮） -->
          <div class="marking-scan-material__source-meta">
            <UiTag tone="green" size="sm">制卷页 · 题干对照</UiTag>
            <UiTag v-if="layoutRoiStyle" tone="blue" size="sm">题目区域已标注</UiTag>
          </div>
          <ScanImageStage
            v-if="layoutImageUrl"
            :src="layoutImageUrl"
            :roi="layoutRoiStyle"
            :confidential="props.confidential"
            :exam-label="props.examLabel"
            :watermark-lines="props.watermarkLines"
            empty-text="制卷页加载失败"
          />
          <UiEmpty size="sm" v-else-if="!loading" description="暂无影像" />
        </div>
      </UiSpin>
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
  color: var(--dp-text-secondary);
  font-size: 13px;
  font-weight: 600;
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
</style>
