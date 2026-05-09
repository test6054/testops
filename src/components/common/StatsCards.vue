<template>
  <OverviewStatCards :items="mappedItems" />
</template>

<script lang="ts" setup>
import type {Component} from 'vue'
import type {StatItem, Tone} from './types';
import {computed} from 'vue'
import OverviewStatCards from './OverviewStatCards.vue'

interface StatsCard {
  label: string
  value: string | number | undefined
  unit?: string
  subInfo?: string
  icon?: Component
  type?: string
  format?: 'percentage' | 'decimal'
  urgent?: boolean
  clickAction?: () => void
}

const props = defineProps<{
  statsData: StatsCard[]
}>()

const toneMap: Record<string, Tone> = {
  "student": 'blue',
  "active": 'cyan',
  "grade": 'orange',
  "completion": 'green',
  "teacher": 'purple',
  'course-design': 'pink',
  "practice": 'blue',
  "default": 'blue',
}

const formatValue = (item: StatsCard) => {
  const val = item.value

  if (item.format === 'percentage' && typeof val === 'number') {
    return val
  }

  if (item.format === 'decimal' && typeof val === 'number') {
    return Number.isFinite(val) ? val.toFixed(1) : 0
  }

  return val ?? 0
}

const resolveUnit = (item: StatsCard) => {
  if (item.format === 'percentage' && typeof item.value === 'number') {
    return '%'
  }
  return item.unit
}

const mappedItems = computed<StatItem[]>(() =>
  props.statsData.map((item) => ({
    key: item.label,
    label: item.label,
    value: formatValue(item),
    unit: resolveUnit(item),
    subText: item.subInfo,
    tone: item.urgent ? 'red' : (toneMap[item.type || 'default'] || 'blue'),
    icon: item.icon,
    onClick: item.clickAction,
  })),
)
</script>
