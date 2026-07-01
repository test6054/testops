import { useWindowSize } from '@vueuse/core'
import { computed } from 'vue'
import { LAYOUT_DESKTOP_MIN } from '@/constants/breakpoints'

/**
 * 响应式 layout shell：移动 TabBar vs 桌面 Asider。
 * 断点与 Ant Design md(768) 对齐，见 constants/breakpoints.ts。
 */
export function useDevice() {
    const {width} = useWindowSize()
    const isDesktop = computed(() => width.value >= LAYOUT_DESKTOP_MIN)
    const isMobile = computed(() => !isDesktop.value)

    return {isMobile, isDesktop}
}
