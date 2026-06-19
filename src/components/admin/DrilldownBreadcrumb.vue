<script lang="ts" setup>
/**
 * 管理端学情钻取面包屑：校 → 院 → 专业 → 班逐级回退，不绑定 vue-router path。
 */
import { RightOutlined } from '@ant-design/icons-vue'
import { computed } from 'vue'

defineOptions({ name: 'DrilldownBreadcrumb' })

const props = defineProps<{
  levels: DrilldownLevel[]
}>()

const emit = defineEmits<{
  navigate: [index: number]
}>()

export interface DrilldownLevel {
  /** 层级标识，如 school / department / major / class */
  key: string
  /** 展示文案 */
  label: string
}

const safeLevels = computed(() => props.levels.filter((level) => level.label.trim().length > 0))
</script>

<template>
  <nav v-if="safeLevels.length" class="drilldown-breadcrumb" aria-label="学情钻取路径">
    <ol class="drilldown-breadcrumb__list">
      <li
        v-for="(level, index) in safeLevels"
        :key="`${level.key}-${index}`"
        class="drilldown-breadcrumb__item"
      >
        <button
          v-if="index < safeLevels.length - 1"
          type="button"
          class="drilldown-breadcrumb__link"
          @click="emit('navigate', index)"
        >
          {{ level.label }}
        </button>
        <span v-else class="drilldown-breadcrumb__current">{{ level.label }}</span>
        <RightOutlined v-if="index < safeLevels.length - 1" class="drilldown-breadcrumb__sep" />
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
.drilldown-breadcrumb {
  &__list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__link {
    padding: 0;
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--ant-color-text-secondary);
    cursor: pointer;

    &:hover {
      color: var(--ant-color-primary);
    }
  }

  &__current {
    font-size: 13px;
    font-weight: 600;
    color: var(--ant-color-text);
  }

  &__sep {
    font-size: 11px;
    color: var(--ant-color-text-quaternary);
  }
}
</style>
