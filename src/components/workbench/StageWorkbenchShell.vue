<template>
  <div class="stage-workbench-shell">
    <!-- 页面级操作区：勿重复顶栏面包屑标题，按钮应并入 ContextBar #actions -->
    <header v-if="$slots.context" class="stage-workbench-shell__context">
      <slot name="context" />
    </header>

    <!-- SignalBand 区域：KPI 指标带（运营控制台：摘要先于旅程轨） -->
    <section v-if="$slots.signal" class="stage-workbench-shell__signal">
      <slot name="signal" />
    </section>

    <!-- StageRail 区域：阶段箭头轨 -->
    <section v-if="$slots.rail" class="stage-workbench-shell__rail">
      <slot name="rail" />
    </section>

    <!-- WorkSurface 区域：主工作面 -->
    <main class="stage-workbench-shell__surface">
      <slot />
    </main>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'StageWorkbenchShell',
})
</script>

<style scoped>
.stage-workbench-shell {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
  width: 100%;
  padding: 0;
  background: transparent;
}

.stage-workbench-shell:has(.ui-data-table--fill-remaining) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.stage-workbench-shell__context {
  display: flex;
  align-items: center;
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  /* 克制分层：白底 + 细边框 + 微阴影；禁止默认品牌色左竖条 */
  box-shadow: var(--dp-shadow-card);
}

.stage-workbench-shell__context > :deep(.context-bar) {
  width: 100%;
}

.stage-workbench-shell__rail {
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-panel-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: var(--dp-shadow-card);
}

.stage-workbench-shell__signal {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;

  /* panel 贴齐工作台内容列左右缘（抵消常见 page/block 内边距由父级承担时的视觉浮卡感） */
  :deep(.signal-band--panel) {
    margin-bottom: 0;
  }
}

.stage-workbench-shell__surface {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
  width: 100%;
}

.stage-workbench-shell__surface:has(.ui-data-table--fill-remaining) {
  overflow: hidden;
}

.stage-workbench-shell__surface > :deep(.ui-data-table--fill-remaining),
.stage-workbench-shell__surface > :deep(*:has(.ui-data-table--fill-remaining)) {
  flex: 1 1 auto;
  min-height: 0;
}

.stage-workbench-shell__surface > :deep(*) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.stage-workbench-shell__signal,
.stage-workbench-shell__rail,
.stage-workbench-shell__context {
  box-sizing: border-box;
}
</style>
