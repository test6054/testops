<script lang="ts" setup>
/**
 * 批阅沉浸式布局：左侧影像/材料区 + 右侧 sticky 给分面板 + 可选顶部队列与底部操作条。
 * 配合路由 meta.layoutWide 使用，对标行业「左卷右分」批阅工作台。
 */
defineOptions({ name: 'GradingWorkspaceLayout' })
</script>

<template>
  <div class="grading-workspace">
    <div v-if="$slots.queue" class="grading-workspace__queue">
      <slot name="queue" />
    </div>
    <div class="grading-workspace__grid">
      <section class="grading-workspace__main">
        <slot name="main" />
      </section>
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
</template>

<style lang="scss" scoped>
.grading-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;

  &__queue {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;

    @media (min-width: 992px) {
      grid-template-columns: minmax(0, 1fr) 380px;
    }
  }

  &__main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__aside-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;

    @media (min-width: 992px) {
      position: sticky;
      top: 0;
      max-height: calc(100vh - 96px);
      overflow-y: auto;
    }
  }

  &__footer {
    position: sticky;
    bottom: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    margin: 0 -4px;
    background: var(--dp-surface, #fff);
    border-top: 1px solid var(--dp-border, #e2e8f0);
    box-shadow: var(--dp-shadow-sm);
    flex-wrap: wrap;
  }
}
</style>
