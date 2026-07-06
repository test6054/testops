<script lang="ts" setup>
import type { MarkingScanPageRefVO } from '@/apis/mark/exam-scan'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import { QUALITY_DECISION_TONE, QualityDecisionDescription } from '@/apis/mark/exam-scan'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'MarkingScanMaterialPanel' })

const props = defineProps<{
  sliceFileId?: string
  sourceScanPage?: MarkingScanPageRefVO | null
  /** ANSWER_SHEET 模式下的试卷母版页引用（含fileId和ROI） */
  masterPaperPage?: MarkingScanPageRefVO | null
  confidential?: boolean
  examLabel?: string
  watermarkLines?: string[]
}>()

type ViewTab = 'slice' | 'source' | 'master'

const activeTab = ref<ViewTab>('slice')
const sliceImageUrl = ref('')
const sourceImageUrl = ref('')
const masterImageUrl = ref('')
const loading = ref(false)

const hasSlice = computed(() => Boolean(props.sliceFileId))
const hasSource = computed(() => Boolean(props.sourceScanPage?.fileId))
const hasMaster = computed(() => Boolean(props.masterPaperPage?.fileId))
const showTabs = computed(
  () => (hasSlice.value ? 1 : 0) + (hasSource.value ? 1 : 0) + (hasMaster.value ? 1 : 0) > 1,
)
const tabOptions = computed(() => {
  const options: { label: string, value: ViewTab }[] = []
  if (hasSlice.value) {
    options.push({ label: '作答切片', value: 'slice' })
  }
  if (hasSource.value) {
    options.push({ label: '原始扫描页', value: 'source' })
  }
  if (hasMaster.value) {
    options.push({ label: '试卷母版', value: 'master' })
  }
  return options
})

/** 母版页 ROI 定位样式（像素→百分比，适配浏览器任意渲染尺寸） */
const masterRoiStyle = computed(() => {
  const page = props.masterPaperPage
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
  if (masterImageUrl.value) {
    URL.revokeObjectURL(masterImageUrl.value)
    masterImageUrl.value = ''
  }
}

async function loadImages(): Promise<void> {
  releaseImages()
  if (!hasSlice.value && !hasSource.value && !hasMaster.value) {
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
    if (props.masterPaperPage?.fileId) {
      jobs.push(
        getImageBlobUrl(props.masterPaperPage.fileId).then((url) => {
          masterImageUrl.value = url
        }),
      )
    }
    await Promise.all(jobs)
    // 自动选择默认 tab: 切片优先 > 母版 > 原始扫描页
    if (hasSlice.value) {
      activeTab.value = 'slice'
    } else if (hasMaster.value) {
      activeTab.value = 'master'
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
  () => [props.sliceFileId, props.sourceScanPage?.fileId, props.masterPaperPage?.fileId],
  () => {
    void loadImages()
  },
  { immediate: true },
)

onBeforeUnmount(releaseImages)
</script>

<template>
  <div class="marking-scan-material">
    <UiEmpty v-if="!hasSlice && !hasSource && !hasMaster" description="暂无阅卷影像材料" />
    <template v-else>
      <a-segmented
        v-if="showTabs"
        v-model:value="activeTab"
        class="marking-scan-material__tabs"
        :options="tabOptions"
      />
      <div v-else-if="hasSource && !hasSlice" class="marking-scan-material__solo-label">
        原始扫描页
      </div>
      <div v-else-if="hasSlice && !hasSource" class="marking-scan-material__solo-label">
        作答切片
      </div>
      <div
        v-else-if="hasMaster && !hasSlice && !hasSource"
        class="marking-scan-material__solo-label"
      >
        试卷母版
      </div>
      <a-spin :spinning="loading" tip="加载影像中...">
        <div v-if="activeTab === 'slice'" class="marking-scan-material__viewer">
          <ScanImageStage
            v-if="sliceImageUrl"
            :src="sliceImageUrl"
            :confidential="props.confidential"
            :exam-label="props.examLabel"
            :watermark-lines="props.watermarkLines"
            empty-text="切片图片加载失败"
          />
          <UiEmpty v-else-if="!loading" description="暂无数据" />
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
          <UiEmpty v-else-if="!loading" description="暂无数据" />
        </div>
        <div v-else-if="activeTab === 'master'" class="marking-scan-material__viewer">
          <!-- 试卷母版对照（ANSWER_SHEET 模式自动展示，含ROI题目区域高亮） -->
          <div class="marking-scan-material__source-meta">
            <UiTag tone="green" size="sm">试卷母版 · 题干对照</UiTag>
            <UiTag v-if="masterRoiStyle" tone="blue" size="sm">题目区域已标注</UiTag>
          </div>
          <ScanImageStage
            v-if="masterImageUrl"
            :src="masterImageUrl"
            :roi="masterRoiStyle"
            :confidential="props.confidential"
            :exam-label="props.examLabel"
            :watermark-lines="props.watermarkLines"
            empty-text="母版页加载失败"
          />
          <UiEmpty v-else-if="!loading" description="暂无数据" />
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
