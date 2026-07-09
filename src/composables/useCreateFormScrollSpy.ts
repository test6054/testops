import type { Ref } from 'vue'
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { createFormScrollContainerKey } from '@/components/create-form/create-form-context'

export interface CreateFormNavItem {
  key: string
  label: string
}

/**
 * 创建页锚点滚动：优先绑定 CreateFormPageShell 内部滚动区，侧栏高亮随滚动更新。
 */
export function useCreateFormScrollSpy(
  navItems: Ref<CreateFormNavItem[]>,
  activeSection: Ref<string>,
) {
  const injectedScrollContainer = inject(createFormScrollContainerKey, null)
  const scrollContainerRef = ref<HTMLElement | null>(null)

  function findScrollContainer(): HTMLElement | null {
    if (injectedScrollContainer?.value) {
      return injectedScrollContainer.value
    }
    return (
      document.querySelector('.create-form-page__scroll')
      ?? document.querySelector('.main-scroll-wrapper')
    )
  }

  function scrollToSection(sectionId: string): void {
    activeSection.value = sectionId
    const el = document.getElementById(sectionId)
    const container = scrollContainerRef.value
    if (!el || !container) return
    const containerTop = container.getBoundingClientRect().top
    const elTop = el.getBoundingClientRect().top
    const offset = elTop - containerTop + container.scrollTop - 24
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }

  function handleScroll(): void {
    const container = scrollContainerRef.value
    if (!container) return
    const threshold = container.getBoundingClientRect().top + 80
    const sections = navItems.value.map((item) => item.key)
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i])
      if (el && el.getBoundingClientRect().top <= threshold) {
        activeSection.value = sections[i]
        return
      }
    }
    if (sections[0]) {
      activeSection.value = sections[0]
    }
  }

  onMounted(() => {
    scrollContainerRef.value = findScrollContainer()
    scrollContainerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    scrollContainerRef.value?.removeEventListener('scroll', handleScroll)
  })

  return {
    scrollToSection,
  }
}
