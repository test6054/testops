<template>
  <div class="stage-workbench-shell">
    <!-- ContextBar 区域：上下文选择器 / 面包屑 -->
    <header v-if="$slots.context" class="stage-workbench-shell__context">
      <slot name="context" />
    </header>

    <!-- StageRail 区域：阶段箭头轨 -->
    <section v-if="$slots.rail" class="stage-workbench-shell__rail">
      <slot name="rail" />
    </section>

    <!-- SignalBand 区域：KPI 指标带 -->
    <section v-if="$slots.signal" class="stage-workbench-shell__signal">
      <slot name="signal" />
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
  gap: 12px;
  min-height: 100%;
  padding: 12px;
  background: var(--dp-page-bg, #f5f7fb);
}

.stage-workbench-shell__context {
  padding: 12px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.stage-workbench-shell__rail {
  padding: 8px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.stage-workbench-shell__signal {
  padding: 10px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.stage-workbench-shell__surface {
  flex: 1;
  min-height: 0;
}
</style>
