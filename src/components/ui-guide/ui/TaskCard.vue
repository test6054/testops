<template>
  <div
    class="ui-task-card"
    :class="[
      statusClass ? `ui-task-card--${statusClass}` : '',
      { 'ui-task-card--clickable': clickable },
      { 'ui-task-card--selected': selected },
      { 'ui-task-card--warning': warning },
    ]"
  >
    <!-- 头部区域 -->
    <div class="ui-task-card__header">
      <div class="ui-task-card__title-row">
        <slot name="checkbox" />
        <h3 class="ui-task-card__title">
          <slot name="title" />
        </h3>
        <slot name="badge" />
        <div class="ui-task-card__actions" @click.stop>
          <slot name="actions" />
        </div>
      </div>
      <div v-if="$slots.tags" class="ui-task-card__tags">
        <slot name="tags" />
      </div>
    </div>

    <!-- 统计数据区域 -->
    <div v-if="$slots.stats" class="ui-task-card__stats">
      <slot name="stats" />
    </div>

    <!-- 底部元信息区域 -->
    <div v-if="$slots.footer || $slots.meta" class="ui-task-card__footer">
      <div class="ui-task-card__meta">
        <slot name="meta" />
      </div>
      <div v-if="$slots['footer-extra']" class="ui-task-card__footer-extra">
        <slot name="footer-extra" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTaskCard' })

withDefaults(defineProps<{
  statusClass?: StatusType
  clickable?: boolean
  selected?: boolean
  warning?: boolean
}>(), {
  statusClass: '',
  clickable: true,
  selected: false,
  warning: false,
})

type StatusType = 'gray' | 'blue' | 'orange' | 'yellow' | 'green' | 'red' | string
</script>

<style lang="scss">
@use '@/styles/breakpoints' as bp;
.ui-task-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--dp-surface);
  border: 1.5px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  padding: 16px 20px;
  transition: all 0.2s ease;
  box-shadow: var(--dp-shadow-card);

  // 可点击状态
  &--clickable {
    cursor: pointer;

    &:hover {
      border-color: var(--dp-border-strong);
    }
  }

  // 选中状态
  &--selected {
    border-color: var(--dp-blue-500);
    background: var(--dp-blue-50);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  }

  // 警告状态（如逾期）
  &--warning {
    border-color: var(--dp-red-300);
    background: #fef2f2;

    &:hover {
      border-color: var(--dp-red-400);
    }
  }

  // 灰色 - 草稿/未开始
  &--gray {
    border-color: var(--dp-gray-200);
    &:hover { border-color: var(--dp-gray-300); }
    &.ui-task-card--selected {
      border-color: var(--dp-gray-400);
      background: var(--dp-gray-50);
    }
  }

  // 蓝色 - 进行中
  &--blue {
    border-color: var(--dp-blue-200);
    &:hover { border-color: var(--dp-blue-400); }
    &.ui-task-card--selected {
      border-color: var(--dp-blue-500);
      background: var(--dp-blue-50);
    }
  }

  // 橙色 - 待审核
  &--orange {
    border-color: var(--dp-orange-200);
    &:hover { border-color: var(--dp-orange-400); }
    &.ui-task-card--selected {
      border-color: var(--dp-orange-500);
      background: var(--dp-orange-50);
    }
  }

  // 黄色 - 待修订
  &--yellow {
    border-color: var(--dp-yellow-200);
    &:hover { border-color: var(--dp-yellow-400); }
    &.ui-task-card--selected {
      border-color: var(--dp-yellow-500);
      background: var(--dp-yellow-50);
    }
  }

  // 绿色 - 已完成
  &--green {
    border-color: var(--dp-green-200);
    &:hover { border-color: var(--dp-green-400); }
    &.ui-task-card--selected {
      border-color: var(--dp-green-500);
      background: var(--dp-green-50);
    }
  }

  // 红色 - 已关闭/逾期
  &--red {
    border-color: var(--dp-red-200);
    &:hover { border-color: var(--dp-red-400); }
    &.ui-task-card--selected {
      border-color: var(--dp-red-500);
      background: var(--dp-red-50);
    }
  }
}

.ui-task-card__header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ui-task-card__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-task-card__title {
  flex: 0 1 auto;
  font-size: 18px;
  font-weight: 700;
  color: var(--dp-text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 480px);
}

.ui-task-card__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.ui-task-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ui-task-card__stats {
  display: flex;
  gap: 12px;

  // 确保子组件正确布局
  > * {
    flex: 1;
    min-width: 0;
  }
}

.ui-task-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--dp-border);
}

.ui-task-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  flex: 1;
}

.ui-task-card__footer-extra {
  flex-shrink: 0;
}

@media (max-width: 1400px) {
  .ui-task-card__title {
    max-width: calc(100% - 400px);
  }
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .ui-task-card__title-row {
    flex-wrap: wrap;
  }

  .ui-task-card__title {
    max-width: 100%;
    flex-basis: calc(100% - 120px);
  }

  .ui-task-card__actions {
    margin-left: 0;
    flex-wrap: wrap;
    flex-basis: 100%;
    margin-top: 8px;
  }

  .ui-task-card__stats {
    flex-wrap: wrap;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-task-card {
    padding: 12px 16px;
  }

  .ui-task-card__footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
