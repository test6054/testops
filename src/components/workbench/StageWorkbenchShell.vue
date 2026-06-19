<template>
  <div class="stage-workbench-shell">
    <!-- 页面级操作区：勿重复顶栏面包屑标题，按钮应并入 ContextBar #actions -->
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
  gap: 16px;
  width: 100%;
  padding: 0;
  background: var(--ant-color-bg-container);
}

.stage-workbench-shell__context {
  padding: 0 0 4px;
  border: none;
  border-radius: 0;
  background: transparent;
}

.stage-workbench-shell__rail {
  padding: 0 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.stage-workbench-shell__signal {
  padding: 0 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
}

.stage-workbench-shell__surface {
  flex: 1;
  min-height: 0;
}
</style>
