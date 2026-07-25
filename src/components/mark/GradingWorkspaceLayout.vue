<script lang="ts" setup>
/**

 * 批阅沉浸式布局：左侧影像/材料区 + 右侧 sticky 给分面板 + 可选顶部队列与底部操作条。

 * 配合路由 meta.layoutImmersive 使用，对标行业「左卷右分」批阅工作台。

 * 涉密场次：强制平铺水印；密级状态条由 exam-workspace-layout 统一展示。

 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ConfidentialWatermarkLayer from '@/components/mark/ConfidentialWatermarkLayer.vue'

import {
  buildConfidentialWatermarkLines,
  isExamConfidentialFlag,
} from '@/composables/useConfidentialWatermark'

defineOptions({ name: 'GradingWorkspaceLayout' })

const props = withDefaults(
  defineProps<{
    /** 涉密统考场次；为 true 时启用强制水印 */

    confidential?: boolean

    /** 水印中的考试标识，如「2024 期末（EXAM-001）」 */

    examLabel?: string

    /** 自定义水印行；缺省时按当前登录教师信息自动生成 */

    watermarkLines?: string[]
  }>(),
  {
    confidential: false,

    examLabel: '',

    watermarkLines: undefined,
  },
)

const ASIDE_WIDTH_STORAGE_KEY = 'mark:grading-aside-width'

const ASIDE_MIN = 280

const ASIDE_MAX = 520

const ASIDE_DEFAULT = 380

const isConfidential = computed(() => isExamConfidentialFlag(props.confidential))

const resolvedWatermarkLines = computed(() => {
  if (!isConfidential.value) {
    return []
  }

  if (props.watermarkLines?.length) {
    return props.watermarkLines
  }

  return buildConfidentialWatermarkLines({ examLabel: props.examLabel })
})

const asideWidth = ref(readStoredAsideWidth())

const gridRef = ref<HTMLElement | null>(null)

const isDragging = ref(false)

function readStoredAsideWidth(): number {
  const raw = localStorage.getItem(ASIDE_WIDTH_STORAGE_KEY)

  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN

  if (Number.isFinite(parsed)) {
    return clampAsideWidth(parsed)
  }

  return ASIDE_DEFAULT
}

function clampAsideWidth(width: number): number {
  return Math.min(ASIDE_MAX, Math.max(ASIDE_MIN, width))
}

function resolveDefaultAsideWidth(): number {
  if (typeof window === 'undefined') return ASIDE_DEFAULT

  const viewport = window.innerWidth

  if (viewport <= 1366) return 320

  if (viewport >= 1920) return 420

  return ASIDE_DEFAULT
}

const gridStyle = computed(() => ({
  '--grading-aside-width-user': `${asideWidth.value}px`,

  '--grading-aside-width-default': `${resolveDefaultAsideWidth()}px`,
}))

function persistAsideWidth(width: number): void {
  localStorage.setItem(ASIDE_WIDTH_STORAGE_KEY, String(width))
}

function onSeparatorPointerDown(event: PointerEvent): void {
  if (!gridRef.value) return

  isDragging.value = true

  const startX = event.clientX

  const startWidth = asideWidth.value

  function onPointerMove(moveEvent: PointerEvent): void {
    const delta = startX - moveEvent.clientX
    asideWidth.value = clampAsideWidth(startWidth + delta)
  }

  function onPointerUp(): void {
    isDragging.value = false

    persistAsideWidth(asideWidth.value)

    window.removeEventListener('pointermove', onPointerMove)

    window.removeEventListener('pointerup', onPointerUp)
  }

  window.addEventListener('pointermove', onPointerMove)

  window.addEventListener('pointerup', onPointerUp)

  event.preventDefault()
}

onMounted(() => {
  if (!localStorage.getItem(ASIDE_WIDTH_STORAGE_KEY)) {
    asideWidth.value = resolveDefaultAsideWidth()
  }
})

onBeforeUnmount(() => {
  if (isDragging.value) {
    persistAsideWidth(asideWidth.value)
  }
})
</script>

<template>
  <div
    class="grading-workspace"
    :class="{
      'grading-workspace--confidential': isConfidential,
      'grading-workspace--dragging': isDragging,
    }"
  >
    <div
      class="grading-workspace__shielded"
      :class="{ 'grading-workspace__shielded--active': isConfidential }"
    >
      <ConfidentialWatermarkLayer
        v-if="isConfidential"
        :lines="resolvedWatermarkLines"
        density="dense"
      />

      <div v-if="$slots.queue" class="grading-workspace__queue">
        <slot name="queue" />
      </div>

      <div ref="gridRef" class="grading-workspace__grid" :style="gridStyle">
        <section class="grading-workspace__main">
          <slot name="main" />
        </section>

        <div
          v-if="$slots.aside"
          class="grading-workspace__separator"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整给分面板宽度"
          @pointerdown="onSeparatorPointerDown"
        />

        <aside v-if="$slots.aside" class="grading-workspace__aside">
          <div class="grading-workspace__aside-inner">
            <slot name="aside" />
          </div>
        </aside>
      </div>

      <footer v-if="$slots.footer" class="grading-workspace__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>
