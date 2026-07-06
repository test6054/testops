<script setup lang="ts">
defineOptions({ name: 'AiClusterTile' })

defineProps<{
  label: string
  proportionText: string
  description?: string
  questionNos?: string
  suggestion?: string
}>()
</script>

<template>
  <article class="ai-cluster-tile">
    <header class="ai-cluster-tile__head">
      <h5 class="ai-cluster-tile__title">{{ label }}</h5>
      <span class="ai-cluster-tile__pct">{{ proportionText }}</span>
    </header>
    <p v-if="description" class="ai-cluster-tile__desc">{{ description }}</p>
    <p v-if="questionNos" class="ai-cluster-tile__meta">涉及题号：{{ questionNos }}</p>
    <div v-if="suggestion" class="ai-cluster-tile__advice">
      <strong>建议：</strong>{{ suggestion }}
    </div>
  </article>
</template>
