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
  gap: var(--dp-space-4);
  width: 100%;
  padding: 0;
  background: transparent;
}

.stage-workbench-shell__context {
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  /* 品牌主色左侧内嵌条：与 QualityScopeChrome 同级强调，非营销装饰 */
  box-shadow:
    var(--dp-shadow-xs),
    inset 3px 0 0 color-mix(in srgb, var(--dp-blue-500) 55%, transparent);
}

.stage-workbench-shell__rail {
  padding: var(--dp-space-3) var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: var(--dp-shadow-xs);
}

.stage-workbench-shell__signal {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

.stage-workbench-shell__surface {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}
</style>
