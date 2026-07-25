<template>
  <UiDrawer v-model:open="open" :title="drawerTitle" :width="720" hide-footer>
    <UiSkeletonState v-if="loading" variant="card" :card-count="2" compact />
    <UiEmpty size="sm" v-else-if="!pages.length" description="该考生尚无 ACTIVE 扫描页" />
    <div v-else class="candidate-paper-images">
      <div v-for="page in pages" :key="page.pageId" class="candidate-paper-images__item">
        <div class="candidate-paper-images__meta">
          <span class="candidate-paper-images__page-no">第 {{ page.templatePageNo }} 页</span>
          <UiTag :tone="qualityTone(page.qualityStatus)" size="sm">
            {{ qualityLabel(page.qualityStatus) }}
          </UiTag>
        </div>
        <UiButton size="sm" variant="outline" @click="previewPage(page)"> 查看影像 </UiButton>
      </div>
    </div>
    <FilePreviewDialog v-if="filePreview.filePreviewOpen.value" :api="filePreview" />
  </UiDrawer>
</template>

<script lang="ts" setup>
import type {
  ExamCandidateRosterPaperScannedPageItemResponse,
  ExamCandidateRosterWorkbenchItemResponse,
} from '@/apis/mark/exam-candidate-roster'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { listCandidateRosterPaperScannedPages } from '@/apis/mark/exam-candidate-roster'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useFilePreview } from '@/composables/useFilePreview'
import {
  QualityDecisionCode,
  QualityDecisionDescription,
} from '@/types/enums/quality-decision-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ExamCandidatePaperImagesDrawer' })

const FilePreviewDialog = defineAsyncComponent(() => import('@/components/FilePreviewDialog.vue'))

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  examId?: string
  candidate?: ExamCandidateRosterWorkbenchItemResponse | null
}>()

const loading = ref(false)
const pages = ref<ExamCandidateRosterPaperScannedPageItemResponse[]>([])
const filePreview = useFilePreview()

const drawerTitle = computed(() => {
  const candidate = props.candidate
  if (!candidate) {
    return '查看影像'
  }
  return `${candidate.studentName}（${candidate.studentNo}）扫描页`
})

async function loadPages(): Promise<void> {
  const examId = props.examId
  const paperInstanceId = props.candidate?.paperInstanceId
  if (!examId || !paperInstanceId) {
    pages.value = []
    return
  }
  loading.value = true
  try {
    const response = await listCandidateRosterPaperScannedPages({ examId, paperInstanceId })
    pages.value = response.pages ?? []
  } catch (error) {
    pages.value = []
    showUserError(error, '扫描页加载失败')
  } finally {
    loading.value = false
  }
}

function previewPage(page: ExamCandidateRosterPaperScannedPageItemResponse): void {
  void filePreview.openPreview({
    fileId: page.fileId,
    fileName: `扫描页-${page.templatePageNo}`,
    mimeType: 'image/jpeg',
  })
}

function qualityLabel(code: QualityDecisionCode): string {
  return strictEnumLabel(QualityDecisionDescription, code, '影像质检结论')
}

function qualityTone(code: QualityDecisionCode): 'gray' | 'orange' {
  return code === QualityDecisionCode.BLOCKED ? 'orange' : 'gray'
}

watch(
  () => [open.value, props.examId, props.candidate?.paperInstanceId] as const,
  ([visible]) => {
    if (visible) {
      void loadPages()
    } else {
      pages.value = []
    }
  },
)
</script>

<style lang="scss" scoped>
.candidate-paper-images {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component) var(--dp-space-block);
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-width: 0;
  }

  &__page-no {
    font-size: var(--dp-font-size-md);
    font-weight: 500;
    color: var(--dp-text-primary);
  }
}
</style>
