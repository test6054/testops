<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="线下纯归档建卷">
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="ac.handleGoBack">
            返回列表
          </UiButton>
          <UiButton
            variant="primary"
            :loading="ac.submitting.value"
            :disabled="ac.submitting.value"
            @click="handleSubmit"
          >
            {{ ac.submitting.value ? '创建中…' : '创建归档卷' }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <div class="create-layout">
      <aside class="create-layout__aside">
        <div class="create-layout__aside-sticky">
          <UiSidebarNav
            :items="ac.navItems.value"
            :active-key="ac.activeSection.value"
            @select="(item) => void scrollToSection(String(item.key))"
          />
        </div>
      </aside>

      <div class="create-layout__main">
        <a-spin :spinning="ac.submitting.value" tip="正在创建…">
          <BasicInfoStep
            :basic-rules="ac.basicRules"
            @course-change="ac.setCourseSelection"
            @department-change="ac.setDepartmentSelection"
            @teaching-class-change="ac.setTeachingClassSelection"
            @update:basic-form-ref="ac.basicFormRef.value = $event"
          />
          <ArchiveConfigStep
            :config-rules="ac.configRules"
            :template-set-options="ac.templateSetOptions.value"
            :template-loading="ac.templateLoading.value"
            @template-change="ac.setTemplateSet"
            @responsible-change="ac.setResponsibleUser"
            @update:config-form-ref="ac.configFormRef.value = $event"
          />
          <ConfirmStep />
        </a-spin>
      </div>
    </div>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiSidebarNav from '@/components/ui-guide/ui/UiSidebarNav.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  archiveVolumeCreateBasicFormKey,
  archiveVolumeCreateConfigFormKey,
  isArchiveVolumeCreateSectionKey,
} from './archive-volume-create-context'
import ArchiveConfigStep from './ArchiveConfigStep.vue'
import BasicInfoStep from './BasicInfoStep.vue'
import ConfirmStep from './ConfirmStep.vue'
import { useArchiveVolumeCreateOffline } from './useArchiveVolumeCreateOffline'

defineOptions({ name: 'TeacherArchiveVolumeCreateOffline' })

const ac = useArchiveVolumeCreateOffline()
provide(archiveVolumeCreateBasicFormKey, ac.basicForm)
provide(archiveVolumeCreateConfigFormKey, ac.configForm)
const scrollContainerRef = ref<HTMLElement | null>(null)

function findScrollContainer(): HTMLElement | null {
  return document.querySelector('.main-scroll-wrapper')
}

async function scrollToSection(sectionId: string): Promise<void> {
  if (!isArchiveVolumeCreateSectionKey(sectionId)) return
  if (!(await ac.validateStepsBeforeSection(sectionId))) return
  ac.activeSection.value = sectionId
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
  const sections = ac.navItems.value.map(item => String(item.key))
  for (let i = sections.length - 1; i >= 0; i--) {
    const el = document.getElementById(sections[i])
    if (el && el.getBoundingClientRect().top <= threshold) {
      const sectionKey = sections[i]
      if (isArchiveVolumeCreateSectionKey(sectionKey)) {
        ac.activeSection.value = sectionKey
      }
      return
    }
  }
  const firstSectionKey = sections[0]
  if (isArchiveVolumeCreateSectionKey(firstSectionKey)) {
    ac.activeSection.value = firstSectionKey
  }
}

async function handleSubmit(): Promise<void> {
  await ac.handleCreateVolume()
}

onMounted(() => {
  scrollContainerRef.value = findScrollContainer()
  scrollContainerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  scrollContainerRef.value?.removeEventListener('scroll', handleScroll)
})
</script>

<style lang="scss" scoped>
.create-layout {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  padding: 0 0 60px;

  &__aside {
    position: relative;
    border-right: 1px solid var(--dp-border, #e5e7eb);
    padding-right: 16px;
  }

  &__aside-sticky {
    position: sticky;
    top: 16px;
  }

  &__main {
    min-width: 0;
    width: 100%;
    max-width: 920px;
    padding: 0 16px;
    background: transparent;

    :deep(.archive-create-form:first-of-type) {
      padding-bottom: 32px;
      border-bottom: 1px solid var(--dp-border, #e5e7eb);
    }
  }
}

:deep(.form-section) {
  padding: 40px 0 32px;
  border-bottom: 1px solid var(--dp-border, #e5e7eb);
  scroll-margin-top: 16px;

  &:last-child {
    border-bottom: none;
  }
}

:deep(.section-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 8px;
}

:deep(.section-desc) {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dp-text-secondary, #64748b);
}

:deep(.section-title) {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--ant-color-text);
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 18px;
    background: var(--ant-color-primary, #1677ff);
    border-radius: 2px;
    flex-shrink: 0;
  }
}

:deep(.archive-create-form__body) {
  max-width: 880px;
}

:deep(.archive-create-form__grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 0;
}

:deep(.archive-create-form__full) {
  grid-column: 1 / -1;
}

@media (max-width: 767px) {
  .create-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;

    &__aside {
      border-right: none;
      border-bottom: 1px solid var(--dp-border, #e5e7eb);
      padding-right: 0;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }

    &__aside-sticky {
      position: static;
    }

    &__main {
      max-width: none;
      padding: 0;
    }
  }

  :deep(.archive-create-form__grid) {
    grid-template-columns: minmax(0, 1fr);
  }
}

:deep(.ui-sidebar-nav) {
  border: none;
  border-radius: 0;
  background: transparent;
}

:deep(.ui-sidebar-nav__item) {
  border-radius: 0;
  border-right: 2px solid transparent;
}

:deep(.ui-sidebar-nav__item--active) {
  background: transparent;
  border-right-color: var(--ant-color-primary, #1677ff);
  color: var(--ant-color-primary, #1677ff);
  font-weight: 600;
}
</style>
