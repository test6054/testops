<template>
  <UiDialog
    :open="open"
    title="处置重复影像"
    :width="920"
    :confirm-loading="submitting === true"
    :mask-closable="false"
    ok-text="提交保留选择"
    @update:open="$emit('update:open', $event)"
    @ok="handleOk"
  >
    <template v-if="resolution">
      <UiAlertStrip
        tone="warning"
        :closable="false"
        dense
        title="按证据侧选择保留扫描页"
        description="同卷重复仅废弃未保留页；异卷重复将废弃未保留答卷的全部 ACTIVE 页，并触发影像账本对账。"
        class="duplicate-resolve__alert"
      />
      <div class="duplicate-resolve__sides">
        <article
          v-for="side in evidenceSides"
          :key="side.pageId"
          class="duplicate-resolve__side"
          :class="{ 'duplicate-resolve__side--selected': selectedPageId === side.pageId }"
        >
          <header class="duplicate-resolve__side-head">
            <UiTag :tone="side.tone" size="sm">{{ side.sideLabel }}</UiTag>
            <UiTypographyText strong :content="side.paperDisplay.primaryText" />
            <div class="duplicate-resolve__meta">
              <span>批次 {{ side.scanBatchDisplayName || '—' }}</span>
              <span>
                模板页 {{ side.templatePageNo ?? '—' }}
                <template v-if="side.pageSeq != null"> · 页序 {{ side.pageSeq }}</template>
              </span>
              <span>扫描 {{ formatDateTimeWithSeconds(side.scannedTime) }}</span>
              <span v-if="side.qualityStatus">
                质量 {{ strictEnumLabel(QualityDecisionDescription, side.qualityStatus, '扫描页质量判定') }}
              </span>
            </div>
          </header>
          <UiSkeletonState v-if="side.previewLoading" variant="card" compact />
          <ScanImageStage
            v-else-if="side.previewUrl"
            :src="side.previewUrl"
            :caption="side.sideLabel"
            :confidential="isExamConfidential"
            :exam-label="examConfidentialLabel"
            :watermark-lines="watermarkLines"
            :min-height="240"
            empty-text="影像加载失败"
          />
          <UiEmpty
            v-else-if="side.previewFailed"
            size="sm"
            description="该侧影像加载失败，核验答卷锚点后再选择"
          />
          <UiEmpty v-else size="sm" description="无可用页影像" />
          <UiButton
            size="sm"
            :variant="selectedPageId === side.pageId ? 'primary' : 'outline'"
            :disabled="submitting || !canManageOwnerLedgerWrites || !evidencePreviewsReady"
            @click="selectKeepSide(side)"
          >
            {{ selectedPageId === side.pageId ? '已选保留此影像' : '保留此影像' }}
          </UiButton>
        </article>
      </div>
      <UiAlertStrip
        v-if="!evidencePreviewsReady"
        :tone="evidencePreviewsLoading ? 'info' : 'error'"
        :title="evidencePreviewsLoading ? '双侧影像证据加载中' : '双侧影像证据不完整'"
        :description="evidencePreviewsLoading
          ? '两侧原始扫描页均加载成功后才能选择保留侧。'
          : '至少一侧原始扫描页不可用，当前不能提交破坏性处置。'"
        :closable="false"
        dense
        class="duplicate-resolve__alert"
      />
      <UiAlertStrip
        v-if="discardConsequence"
        tone="info"
        :closable="false"
        dense
        :title="discardConsequence"
        class="duplicate-resolve__alert"
      />
      <UiForm layout="vertical">
        <UiFormItem
          label="处置原因"
          required
          :validate-status="submitError && !resolutionReason.trim() ? 'error' : undefined"
          :help="submitError && !resolutionReason.trim() ? submitError : undefined"
        >
          <UiTextarea
            size="sm"
            v-model="resolutionReason"
            :disabled="submitting"
            :rows="3"
            :max-length="200"
            :show-count="true"
            placeholder="说明为何保留该侧影像"
          />
        </UiFormItem>
        <UiFormItem
          v-if="submitError && selectedPageId"
          validate-status="error"
          :help="submitError"
        >
          <span />
        </UiFormItem>
      </UiForm>
    </template>
  </UiDialog>
</template>

<script lang="ts" setup>
import type {
  DuplicatePageEvidenceVO,
  ExamPaperDuplicateResolutionVO,
} from '@/apis/mark/image-ledger'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { fetchStoragePreviewBlobUrl } from '@/apis/edu/file-management'
import { QualityDecisionDescription } from '@/apis/mark/exam-scan'
import { resolveDuplicate } from '@/apis/mark/image-ledger'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTypographyText from '@/components/ui-guide/ui/UiTypographyText.vue'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'DuplicateResolveModal' })

const props = withDefaults(
  defineProps<{
  open: boolean
  examId: string
  resolution: ExamPaperDuplicateResolutionVO | null
  /**
   * MVR-372：与 BE canManageOwnerLedgerWrites（主考∧ACTIVE）同源。
   * 仅认 true；禁止缺声明默认放行。
   */
  canManageOwnerLedgerWrites?: boolean // MVR-940: optional BE 能力位写路径仅认 === true
}>(),
  {
  canManageOwnerLedgerWrites: false,
  },
)
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

interface EvidenceSideView extends DuplicatePageEvidenceVO {
  tone: BadgeTone
  previewUrl: string
  previewLoading: boolean
  previewFailed: boolean
}

const { isExamConfidential, examConfidentialLabel, watermarkLines }
  = useWorkspaceConfidentialContext()

const submitting = ref(false)
const selectedPageId = ref('')
const selectedPaperInstanceId = ref('')
const resolutionReason = ref('')
const submitError = ref('')
const firstPreviewUrl = ref('')
const secondPreviewUrl = ref('')
const firstPreviewLoading = ref(false)
const secondPreviewLoading = ref(false)
const firstPreviewFailed = ref(false)
const secondPreviewFailed = ref(false)
let previewGeneration = 0
let writeGeneration = 0

const evidencePreviewsLoading = computed(
  () => firstPreviewLoading.value === true || secondPreviewLoading.value === true,
)
const evidencePreviewsReady = computed(
  () =>
    Boolean(firstPreviewUrl.value)
    && Boolean(secondPreviewUrl.value)
    && evidencePreviewsLoading.value !== true
    && firstPreviewFailed.value !== true
    && secondPreviewFailed.value !== true,
)

const evidenceSides = computed((): EvidenceSideView[] => {
  const resolution = props.resolution
  if (!resolution?.firstPageEvidence || !resolution.secondPageEvidence) {
    return []
  }
  return [
    {
      ...resolution.firstPageEvidence,
      tone: 'blue',
      previewUrl: firstPreviewUrl.value,
      previewLoading: firstPreviewLoading.value,
      previewFailed: firstPreviewFailed.value,
    },
    {
      ...resolution.secondPageEvidence,
      tone: 'orange',
      previewUrl: secondPreviewUrl.value,
      previewLoading: secondPreviewLoading.value,
      previewFailed: secondPreviewFailed.value,
    },
  ]
})

const discardConsequence = computed(() => {
  const resolution = props.resolution
  if (!resolution || !selectedPageId.value) {
    return '请先点击一侧「保留此影像」；未选择前不会提交。'
  }
  const discardSide
    = selectedPageId.value === resolution.firstPageEvidence?.pageId
      ? resolution.secondPageEvidence
      : resolution.firstPageEvidence
  const discardLabel = discardSide?.paperDisplay?.primaryText || '未选侧答卷'
  const samePaper
    = Boolean(resolution.firstPaperInstanceId)
      && resolution.firstPaperInstanceId === resolution.secondPaperInstanceId
  if (samePaper) {
    return `同卷重复：将仅废弃未保留侧扫描页（${discardLabel}）；保留侧页继续进入阅卷成绩证据。`
  }
  return `异卷重复：将废弃「${discardLabel}」答卷的全部 ACTIVE 扫描页；保留侧进入阅卷成绩证据。`
})

function releasePreview(urlRef: typeof firstPreviewUrl): void {
  if (urlRef.value) {
    URL.revokeObjectURL(urlRef.value)
    urlRef.value = ''
  }
}

function releaseAllPreviews(): void {
  releasePreview(firstPreviewUrl)
  releasePreview(secondPreviewUrl)
  firstPreviewLoading.value = false
  secondPreviewLoading.value = false
  firstPreviewFailed.value = false
  secondPreviewFailed.value = false
}

/** 加载一侧原始影像，并拒绝关闭、切考试或切重复记录后的过期对象 URL。 */
async function loadSidePreview(
  pageId: string | undefined,
  urlRef: typeof firstPreviewUrl,
  loadingRef: typeof firstPreviewLoading,
  failedRef: typeof firstPreviewFailed,
  expectedGeneration: number,
  examId: string,
  resolutionId: string,
): Promise<void> {
  releasePreview(urlRef)
  failedRef.value = false
  if (!examId || !pageId) {
    return
  }
  loadingRef.value = true
  try {
    const previewPath = `/api/mark/exams/scanner-batches/pages/original-image?examId=${examId}&pageId=${pageId}`
    const blobUrl = await fetchStoragePreviewBlobUrl(previewPath)
    if (
      expectedGeneration !== previewGeneration
      || props.open !== true
      || props.examId !== examId
      || props.resolution?.id !== resolutionId
    ) {
      URL.revokeObjectURL(blobUrl)
      return
    }
    urlRef.value = blobUrl
  } catch (error) {
    if (
      expectedGeneration !== previewGeneration
      || props.open !== true
      || props.examId !== examId
      || props.resolution?.id !== resolutionId
    ) {
      return
    }
    failedRef.value = true
    showUserError(error, '重复影像预览加载失败')
  } finally {
    if (
      expectedGeneration === previewGeneration
      && props.open === true
      && props.examId === examId
      && props.resolution?.id === resolutionId
    ) {
      loadingRef.value = false
    }
  }
}

/** 并行加载当前重复记录双侧证据，两侧均成功才开放破坏性处置。 */
async function loadEvidencePreviews(expectedGeneration: number): Promise<void> {
  const resolution = props.resolution
  if (!resolution?.firstPageEvidence || !resolution.secondPageEvidence) {
    return
  }
  const examId = props.examId
  const resolutionId = resolution.id
  await Promise.all([
    loadSidePreview(
      resolution.firstPageEvidence.pageId,
      firstPreviewUrl,
      firstPreviewLoading,
      firstPreviewFailed,
      expectedGeneration,
      examId,
      resolutionId,
    ),
    loadSidePreview(
      resolution.secondPageEvidence.pageId,
      secondPreviewUrl,
      secondPreviewLoading,
      secondPreviewFailed,
      expectedGeneration,
      examId,
      resolutionId,
    ),
  ])
}

/** 仅在双侧证据可见时记录同一侧的扫描页与答卷实例锚点。 */
function selectKeepSide(side: EvidenceSideView): void {
  if (!props.canManageOwnerLedgerWrites || submitting.value) {
    return
  }
  if (evidencePreviewsReady.value !== true) {
    submitError.value = '双侧原始影像均加载成功后才能选择保留侧'
    showFormValidationMessage('双侧原始影像均加载成功后才能选择保留侧')
    return
  }
  if (!side.pageId || !side.paperInstanceId) {
    submitError.value = '保留侧缺少扫描页或答卷实例锚点'
    showFormValidationMessage('保留侧缺少扫描页或答卷实例锚点')
    return
  }
  selectedPageId.value = side.pageId
  selectedPaperInstanceId.value = side.paperInstanceId
  submitError.value = ''
}

watch(
  () => [props.open, props.examId, props.resolution?.id] as const,
  ([open]) => {
    const generation = ++previewGeneration
    writeGeneration += 1
    releaseAllPreviews()
    selectedPageId.value = ''
    selectedPaperInstanceId.value = ''
    resolutionReason.value = ''
    submitError.value = ''
    if (!open) {
      return
    }
    // 初始不默认选中任一侧，强制教师核验影像后再选
    void loadEvidencePreviews(generation)
  },
)

onBeforeUnmount(() => {
  previewGeneration += 1
  writeGeneration += 1
  releaseAllPreviews()
})

/** 校验双侧证据与所选页卷配对后提交处置，并隔离过期对象的写后 UI。 */
async function handleOk(): Promise<void> {
  if (submitting.value === true) {
    return
  }
  // MVR-372：写 handler 二次拦截；父页仅隐藏入口不能替代
  if (props.canManageOwnerLedgerWrites !== true) {
    void message.warning('仅考试主考可处置重复影像')
    return
  }
  if (evidencePreviewsReady.value !== true) {
    submitError.value = '双侧原始影像证据未完整加载，不能提交处置'
    showFormValidationMessage('双侧原始影像证据未完整加载，不能提交处置')
    return
  }
  const reason = resolutionReason.value.trim()
  if (!selectedPageId.value || !selectedPaperInstanceId.value) {
    submitError.value = '请先选择要保留的影像侧'
    showFormValidationMessage('请先选择要保留的影像侧')
    return
  }
  if (!reason) {
    submitError.value = '请填写处置原因'
    showFormValidationMessage('请填写处置原因')
    return
  }
  if (!props.resolution) {
    submitError.value = '重复影像记录未加载'
    void message.warning('重复影像记录未加载')
    return
  }
  if (!props.resolution.firstPageEvidence || !props.resolution.secondPageEvidence) {
    submitError.value = '重复影像证据未就绪，属于前后端合同错误'
    void message.error('重复影像证据未就绪，属于前后端合同错误')
    return
  }
  const allowedPageIds = [
    props.resolution.firstPageEvidence.pageId,
    props.resolution.secondPageEvidence.pageId,
  ]
  if (!allowedPageIds.includes(selectedPageId.value)) {
    submitError.value = '保留的扫描页必须来自当前重复影像记录'
    void message.warning('保留的扫描页必须来自当前重复影像记录')
    return
  }
  const selectedEvidence = [
    props.resolution.firstPageEvidence,
    props.resolution.secondPageEvidence,
  ].find((item) => item.pageId === selectedPageId.value)
  if (!selectedEvidence || selectedEvidence.paperInstanceId !== selectedPaperInstanceId.value) {
    submitError.value = '所选扫描页与答卷实例不匹配，不能提交处置'
    void message.error('所选扫描页与答卷实例不匹配，不能提交处置')
    return
  }
  const examId = props.examId
  const resolutionId = props.resolution.id
  const selectedPageIdForWrite = selectedPageId.value
  const selectedPaperIdForWrite = selectedPaperInstanceId.value
  const expectedWriteGeneration = writeGeneration
  submitting.value = true
  submitError.value = ''
  try {
    await resolveDuplicate({
      examId,
      resolutionId,
      selectedPageId: selectedPageIdForWrite,
      selectedPaperInstanceId: selectedPaperIdForWrite,
      resolutionReason: reason,
    })
    if (
      expectedWriteGeneration !== writeGeneration
      || props.open !== true
      || props.examId !== examId
      || props.resolution?.id !== resolutionId
    ) {
      void message.success('上一条重复影像处置已提交')
      return
    }
    void message.success('重复影像处置已提交')
    emit('update:open', false)
    emit('submitted')
  } catch (e) {
    const isCurrentWrite
      = expectedWriteGeneration === writeGeneration
        && props.examId === examId
        && props.resolution?.id === resolutionId
    if (isCurrentWrite) {
      submitError.value = getUserErrorMessage(e, '重复影像处置提交失败')
    }
    showUserError(e, isCurrentWrite ? '重复影像处置提交失败' : '上一条重复影像处置失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.duplicate-resolve__alert {
  margin-bottom: var(--dp-space-component);
}

.duplicate-resolve__sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}

.duplicate-resolve__side {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.duplicate-resolve__side--selected {
  border-color: var(--dp-color-primary);
}

.duplicate-resolve__side-head {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
}

.duplicate-resolve__meta {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
}

@media (max-width: 900px) {
  .duplicate-resolve__sides {
    grid-template-columns: 1fr;
  }
}
</style>
