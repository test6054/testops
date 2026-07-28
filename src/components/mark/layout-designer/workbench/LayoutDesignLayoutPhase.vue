<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutQuestionDto,
} from '@/apis/mark/exam-layout-design'
import { computed, defineAsyncComponent } from 'vue'
import LayoutBlockLayerPanel from '@/components/mark/layout-designer/LayoutBlockLayerPanel.vue'
import LayoutPropertyDrawer from '@/components/mark/layout-designer/LayoutPropertyDrawer.vue'
import LayoutQuestionCropStrip from '@/components/mark/layout-designer/LayoutQuestionCropStrip.vue'
import LayoutQuestionOutlinePanel from '@/components/mark/layout-designer/LayoutQuestionOutlinePanel.vue'
import LayoutQuestionPropertyPanel from '@/components/mark/layout-designer/LayoutQuestionPropertyPanel.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import { isFullPaperWorkspace } from '@/utils/layout-design-workspace'

const props = withDefaults(
  defineProps<{
  document: ExamLayoutDocument | null
  materialLayoutMode?: ExamMaterialLayoutModeCode
  pageNo: number
  focusedBlockId: string | null
  focusedQuestionId: string | null
  readonly?: boolean
}>(),
  {
    readonly: true,
  },
)

const emit = defineEmits<{
  'update:page-no': [pageNo: number]
  'focus-block': [block: ExamLayoutBlockDto | null]
  'focus-question': [question: ExamLayoutQuestionDto | null]
  'focus-block-from-outline': [block: ExamLayoutBlockDto | null, pageNo: number]
  "patch": [document: ExamLayoutDocument]
}>()

const LayoutCanvas = defineAsyncComponent(() => import('@/components/mark/layout-designer/LayoutCanvas.vue'))

const fullPaperMode = computed(() => isFullPaperWorkspace(props.materialLayoutMode))

const pageTabItems = computed(() =>
  (props.document?.pages ?? []).map((page) => ({
    key: String(page.pageNo),
    label: `第 ${page.pageNo} 页`,
  })),
)

const currentPageTabKey = computed({
  get: () => String(props.pageNo),
  set: (value) => {
    emit('update:page-no', Number(value))
  },
})

const focusedQuestion = computed(
  () => props.document?.questions.find((item) => item.id === props.focusedQuestionId) ?? null,
)

const focusedBlock = computed(
  () => props.document?.blocks.find((item) => item.id === props.focusedBlockId) ?? null,
)
</script>

<template>
  <UiAlertStrip
    v-if="!document?.pages?.length"
    tone="info"
    size="sm"
    dense
    inline
    :show-icon="false"
    class="layout-design-layout-phase__gate"
  >
    <template #default>
      <span class="layout-design-layout-phase__gate-row">
        <UiTag tone="blue" size="sm">待同步页底图</UiTag>
        <span class="layout-design-layout-phase__gate-text">请先完成资料入口并同步页底图</span>
      </span>
    </template>
  </UiAlertStrip>
  <div v-else class="layout-design-layout-phase">
    <aside class="layout-design-layout-phase__left">
      <LayoutQuestionOutlinePanel
        v-if="fullPaperMode"
        :document="document"
        :focused-question-id="focusedQuestionId"
        :focused-block-id="focusedBlockId"
        @focus-question="emit('focus-question', $event)"
        @focus-block="(...args) => emit('focus-block-from-outline', ...args)"
      />
      <LayoutBlockLayerPanel
        :document="document"
        :page-no="pageNo"
        :focused-block-id="focusedBlockId"
        :readonly="readonly"
        @focus-block="emit('focus-block', $event)"
        @patch="emit('patch', $event)"
      />
    </aside>
    <main class="layout-design-layout-phase__canvas">
      <UiSectionTabs
        v-if="pageTabItems.length > 0"
        v-model="currentPageTabKey"
        :items="pageTabItems"
        compact
      />
      <LayoutQuestionCropStrip
        v-if="fullPaperMode && focusedQuestion"
        :document="document"
        :question="focusedQuestion"
        @focus-block="emit('focus-block', $event)"
      />
      <LayoutCanvas
        :document="document"
        :page-no="pageNo"
        :focused-block-id="focusedBlockId"
        :focused-question-id="focusedQuestionId"
        :read-only="readonly"
        @focus-block="emit('focus-block', $event)"
        @patch="emit('patch', $event)"
      />
    </main>
    <aside class="layout-design-layout-phase__right">
      <LayoutQuestionPropertyPanel
        v-if="fullPaperMode && focusedQuestion"
        :document="document"
        :question="focusedQuestion"
        :readonly="readonly"
        @patch="emit('patch', $event)"
      />
      <LayoutPropertyDrawer
        v-else
        :document="document"
        :block="focusedBlock"
        :readonly="readonly"
        @patch="emit('patch', $event)"
      />
    </aside>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/breakpoints' as bp;

.layout-design-layout-phase__gate {
  margin: var(--dp-space-component) 0;
  max-width: 100%;
}

.layout-design-layout-phase__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}

.layout-design-layout-phase__gate-text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.layout-design-layout-phase {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: var(--dp-space-component);
  min-height: calc(100vh - 280px);

  &__left,
  &__right {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
    min-height: 0;
  }

  &__left > :last-child,
  &__left > :first-child {
    flex: 1;
    min-height: 200px;
  }

  &__canvas {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
  }

  @media (max-width: #{bp.$ant-grid-xl - 1px}) {
    grid-template-columns: 1fr;
  }
}
</style>
