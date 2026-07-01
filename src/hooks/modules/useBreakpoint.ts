import type { ColProps } from 'ant-design-vue'
import type { ComputedRef } from 'vue'
import { computed } from 'vue'
import { useBreakpoints } from '@vueuse/core'
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

  const arr = breakpoints.current() as ComputedRef<Breakpoint[]>
  const breakpoint = computed(() => {
    return arr.value.length ? arr.value[arr.value.length - 1] : 'xs'
  })

  return { breakpoint }
}
