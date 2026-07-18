import type { ColProps } from 'ant-design-vue/es/grid'
import { useBreakpoints } from '@vueuse/core'
import { computed } from 'vue'
import { ANT_GRID_MIN } from '@/constants/breakpoints'

type ColBreakpoint = Pick<ColProps, 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'>
type Breakpoint = keyof ColBreakpoint

export function useBreakpoint() {
  const breakpoints = useBreakpoints({
    xs: 0,
    sm: ANT_GRID_MIN.sm,
    md: ANT_GRID_MIN.md,
    lg: ANT_GRID_MIN.lg,
    xl: ANT_GRID_MIN.xl,
    xxl: ANT_GRID_MIN.xxl,
  })

  const activeBreakpoints = computed<Breakpoint[]>(() =>
    breakpoints.current().value.filter(isBreakpoint),
  )
  const breakpoint = computed(() => {
    return activeBreakpoints.value.length
      ? activeBreakpoints.value[activeBreakpoints.value.length - 1]
      : 'xs'
  })

  return { breakpoint }
}

function isBreakpoint(value: string): value is Breakpoint {
  return value === 'xs'
    || value === 'sm'
    || value === 'md'
    || value === 'lg'
    || value === 'xl'
    || value === 'xxl'
}
