<template>
  <div v-if="data && data.length" ref="containerRef" class="gi-cell-tags">
    <a-tag v-for="(item, index) in visibleData" :key="index">
      {{ item }}
    </a-tag>
    <a-popover v-if="overflowCount > 0" :overlay-style="{ maxWidth: '300px', padding: '8px 12px' }">
      <a-tag color="blue">+{{ overflowCount }}</a-tag>
      <template #content>
        <a-space wrap>
          <a-tag v-for="tag in overflowData" :key="tag">
            {{ tag }}
          </a-tag>
        </a-space>
      </template>
    </a-popover>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

defineOptions({name: 'GiCellTags'})

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
})

interface Props {
  data?: string[]
}

const containerRef = ref<HTMLElement>()
const maxVisible = ref(props.data.length)

const visibleData = computed(() => props.data.slice(0, maxVisible.value))
const overflowData = computed(() => props.data.slice(maxVisible.value))
const overflowCount = computed(() => props.data.length - maxVisible.value)

function calcMaxVisible() {
  const container = containerRef.value
  if (!container) return
  const containerWidth = container.clientWidth
  const tags = container.querySelectorAll<HTMLElement>('.ant-tag')
  let totalWidth = 0
  const overflowTagWidth = 50
  let count = 0
  for (const tag of Array.from(tags)) {
    totalWidth += tag.offsetWidth + 4
    if (totalWidth + overflowTagWidth > containerWidth && count < props.data.length) {
      break
    }
    count++
  }
  maxVisible.value = Math.max(1, count)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  if (containerRef.value) {
    observer = new ResizeObserver(() => {
      maxVisible.value = props.data.length
      requestAnimationFrame(calcMaxVisible)
    })
    observer.observe(containerRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(() => props.data, () => {
  maxVisible.value = props.data.length
  requestAnimationFrame(calcMaxVisible)
})
</script>

<style lang="scss" scoped>
.gi-cell-tags {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}
</style>
