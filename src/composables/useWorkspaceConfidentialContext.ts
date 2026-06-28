import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  buildConfidentialWatermarkLines,
  formatExamConfidentialLabel,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'
import { useMarkStageStore } from '@/stores/modules/markStage'

/** 考试工作台内统一读取 snapshot 中的涉密标记与水印文案 */
export function useWorkspaceConfidentialContext() {
  const markStageStore = useMarkStageStore()
  const { snapshot } = storeToRefs(markStageStore)

  const isExamConfidential = computed(() => isExamConfidentialFlag(snapshot.value?.confidential))
  const examConfidentialLabel = computed(() => formatExamConfidentialLabel(snapshot.value))
  const watermarkLines = computed(() =>
    buildConfidentialWatermarkLines({ examLabel: examConfidentialLabel.value }),
  )

  return {
    isExamConfidential,
    examConfidentialLabel,
    watermarkLines,
  }
}
