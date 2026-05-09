<template>
  <a-row :class="getClass" :gutter="rowGutter" align="stretch" class="gi-page-layout">
    <a-col
      v-if="slots.left"
      v-show="!isCollapsed"
      :lg="6"
      :md="7"
      :sm="10"
      :xl="5"
      :xxl="4"
      class="gi-page-col"
      v-bind="props.leftColProps"
    >
      <div :style="props.leftStyle" class="gi-page-layout__left">
        <slot name="left"></slot>
      </div>
    </a-col>
    <div
      v-if="slots.left"
      :class="{ none: isCollapsed || !isDesktop }"
      class="gi-page-layout__divider"
    >
      <div
        v-if="defaultCollapsed"
        :class="{ none: isCollapsed || !isDesktop }"
        :style="isCollapsed ? 'left:0px' : 'left:-12px'"
        class="gi-split-button"
        @click="toggleCollapsed"
      >
        <RightOutlined v-if="isCollapsed" />
        <LeftOutlined v-else />
      </div>
    </div>

    <a-col
      :lg="slots.left ? 18 : 24"
      :md="slots.left ? 17 : 24"
      :sm="slots.left ? 16 : 24"
      :xl="slots.left ? 19 : 24"
      :xxl="slots.left ? 20 : 24"
      class="gi-page-col"
      flex="1"
      v-bind="props.rightColProps"
    >
      <div
        v-if="slots.header"
        :style="{ ...props.headerStyle, display: !isDesktop && !isCollapsed ? 'none' : '' }"
        class="gi-page-layout__header"
      >
        <slot name="header"></slot>
      </div>

      <div :style="props.bodyStyle" class="gi-page-layout__body">
        <div v-if="!isDesktop && !isCollapsed" class="gi-page-layout__mask"></div>
        <slot></slot>
      </div>
    </a-col>
  </a-row>
</template>

<script lang="ts" setup>
import type { ColProps } from 'ant-design-vue/es/grid'
import type { CSSProperties } from 'vue'
import LeftOutlined from '@ant-design/icons-vue/LeftOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import { computed, ref, watch } from 'vue'
import { useBreakpoint, useDevice } from '@/hooks'

defineOptions({ name: 'GiPageLayout' })

const props = withDefaults(defineProps<Props>(), {
  margin: true,
  padding: true,
  gutter: false,
  defaultCollapsed: true,
  leftColProps: () => ({}),
  rightColProps: () => ({}),
  leftStyle: () => ({}),
  headerStyle: () => ({}),
  bodyStyle: () => ({}),
})

/** 组件插槽定义 */
const slots = defineSlots<{
  header?: (props: Record<string, never>) => unknown
  left?: (props: Record<string, never>) => unknown
  default?: (props: Record<string, never>) => unknown
}>()

const { isDesktop } = useDevice()
const getClass = computed(() => {
  return {
    'gi-page-layout--margin': props.margin,
    'gi-page-layout--padding': props.padding,
    'gi-page-layout--gutter': !!props.gutter,
  }
})

const rowGutter = computed(() => {
  if (typeof props.gutter === 'boolean') {
    return props.gutter ? 14 : undefined
  }
  return props.gutter
})

/** 组件属性定义 */
interface Props {
  margin?: boolean
  padding?: boolean
  gutter?: boolean | number
  defaultCollapsed?: boolean
  leftColProps?: ColProps
  rightColProps?: ColProps
  leftStyle?: CSSProperties
  headerStyle?: CSSProperties
  bodyStyle?: CSSProperties
}

const isCollapsed = ref(false)
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

const { breakpoint } = useBreakpoint()
watch(
  () => breakpoint.value,
  (val) => {
    isCollapsed.value = ['xs'].includes(val)
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.gi-page-layout {
  width: 100%; // 确保继承父元素的 max-width 限制
  flex: 1 0 auto; // flex-basis: auto 让高度基于内容；flex-shrink: 0 防止缩小；配合 min-height 保证至少视口高度
  min-height: 100%;
  display: flex;
  flex-wrap: nowrap; // 覆盖 ant-row 的 flex-wrap: wrap，左右布局永不换行
  overflow: visible; // 不在此层处理溢出，由外层 Main.vue 统一控制
  box-sizing: border-box;
  background-color: var(--ant-color-bg-container);
  position: relative;

  &--margin {
    margin: 16px;
  }

  &--padding {
    .gi-page-layout__left,
    .gi-page-layout__header,
    .gi-page-layout__body {
      padding: 16px;
    }

    .gi-page-layout__header {
      padding-bottom: 0;
    }
  }

  &--gutter {
    .gi-page-layout__body-left {
      border-right: none;
    }
  }

  .gi-page-col {
    width: 100%; // 确保继承宽度限制
    min-width: 0; // flex 子元素标准防溢出：允许缩小到内容宽度以下
    min-height: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: clip; // 仅裁切水平溢出（ant-table、UiFilterBar），垂直方向允许内容撑开外层滚动
  }
}

.gi-page-layout__left {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.gi-page-layout__header {
  border-bottom: 1px solid var(--ant-color-border);
  box-sizing: border-box;
}

.gi-page-layout__body {
  width: 100%; // 确保继承宽度限制
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: visible; // 不在此层滚动，由外层 Main.vue 统一控制
  box-sizing: border-box;
}

.gi-page-layout__divider {
  position: relative;
  width: 1px;
  background-color: var(--ant-color-border);
}

.gi-page-layout__divider.none {
  width: 0;
}

.gi-split-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  border: 1px solid var(--ant-color-border-secondary);
  box-sizing: border-box;
  background-color: var(--ant-color-bg-container);
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: var(--dp-radius-full);
  left: -12px;
  overflow: hidden;
  box-shadow: var(--dp-shadow-sm);
}

.gi-page-layout__mask {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  backdrop-filter: blur(20px);
  z-index: 20;
}

.gi-split-button.none {
  left: -12px;
}
</style>
