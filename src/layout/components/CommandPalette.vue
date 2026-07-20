<template>
  <UiDialog
    v-model:open="visible"
    :footer="null"
    :closable="false"
    :width="560"
    :body-style="{ padding: 0 }"
    :mask-style="{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }"
    class="command-palette"
    @after-open-change="handleAfterOpenChange"
  >
    <div class="command-palette__input-wrap">
      <SearchOutlined class="command-palette__search-icon" />
      <input
        ref="inputRef"
        v-model="query"
        class="command-palette__input"
        placeholder="搜索考试、页面或操作…"
        type="text"
        @input="handleInput"
        @keydown.esc="visible = false"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.enter.prevent="selectActive"
      />
      <kbd class="command-palette__esc">ESC</kbd>
    </div>

    <div class="command-palette__results">
      <template v-if="!query.trim()">
        <div class="command-palette__group-label">快捷导航</div>
        <button
          v-for="(item, idx) in quickNavItems"
          :key="item.path"
          type="button"
          class="command-palette__item"
          :class="{ 'command-palette__item--active': idx === activeIndex }"
          @click="navigate(item.path)"
          @mouseenter="activeIndex = idx"
        >
          <span class="command-palette__item-label">{{ item.label }}</span>
          <span class="command-palette__item-hint">{{ item.hint }}</span>
        </button>
      </template>

      <template v-else>
        <div v-if="searchLoading" class="command-palette__loading">
          <UiSpin size="sm" />
        </div>
        <template v-else-if="searchResults.length > 0">
          <div class="command-palette__group-label">考试</div>
          <button
            v-for="(item, idx) in searchResults"
            :key="item.id"
            type="button"
            class="command-palette__item"
            :class="{ 'command-palette__item--active': idx === activeIndex }"
            @click="navigate(`/teacher/exam-workspace/${item.id}/overview`)"
            @mouseenter="activeIndex = idx"
          >
            <span class="command-palette__item-label">{{ item.name }}</span>
            <span class="command-palette__item-hint">{{ item.academicYear }} {{ item.semesterLabel }}</span>
          </button>
        </template>
        <div v-else class="command-palette__empty">
          无匹配结果
        </div>
      </template>
    </div>
  </UiDialog>
</template>

<script lang="ts" setup>
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { pageExams } from '@/apis/mark/exam'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'

defineOptions({ name: 'CommandPalette' })

const visible = defineModel<boolean>('open', { default: false })

const router = useRouter()
const inputRef = ref<HTMLInputElement>()
const query = ref('')
const activeIndex = ref(0)
const searchLoading = ref(false)

interface ExamResult {
  id: string
  name: string
  academicYear?: string
  semesterLabel?: string
}

const searchResults = ref<ExamResult[]>([])

const quickNavItems = [
  { label: '阅卷概览', path: '/teacher/dashboard', hint: 'Dashboard' },
  { label: '考试列表', path: '/teacher/exam-list', hint: '列表' },
  { label: '课程考核归档卷', path: '/teacher/archive-volumes', hint: '归档' },
  { label: 'AI 分析中心', path: '/teacher/ai-analysis-center', hint: 'AI' },
  { label: '质量驾驶舱', path: '/quality/dashboard', hint: 'OBE' },
  { label: '我的档案袋', path: '/portfolio/teacher-home', hint: '档案' },
]

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleInput() {
  activeIndex.value = 0
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = query.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  debounceTimer = setTimeout(() => {
    void searchExams(q)
  }, 300)
}

async function searchExams(keyword: string) {
  searchLoading.value = true
  try {
    const res = await pageExams({
      pageNum: 1,
      pageSize: 8,
      keyword,
    })
    searchResults.value = res.list.map((item) => ({
      id: item.examId,
      name: item.examName,
      academicYear: item.academicYear,
      semesterLabel: item.semester ? String(item.semester) : undefined,
    }))
  }
  catch {
    searchResults.value = []
  }
  finally {
    searchLoading.value = false
  }
}

function moveActive(delta: number) {
  const max = query.value.trim() ? searchResults.value.length : quickNavItems.length
  if (max === 0) return
  activeIndex.value = (activeIndex.value + delta + max) % max
}

function selectActive() {
  if (!query.value.trim()) {
    const item = quickNavItems[activeIndex.value]
    if (item) navigate(item.path)
  }
  else {
    const item = searchResults.value[activeIndex.value]
    if (item) navigate(`/teacher/exam-workspace/${item.id}/overview`)
  }
}

function navigate(path: string) {
  visible.value = false
  void router.push(path)
}

function handleAfterOpenChange(open: boolean) {
  if (open) {
    query.value = ''
    searchResults.value = []
    activeIndex.value = 0
    void nextTick(() => inputRef.value?.focus())
  }
}
</script>

<style lang="scss" scoped>
.command-palette {
  :deep(.ant-modal) {
    top: 120px;
  }

  :deep(.ant-modal-content) {
    padding: 0;
    border-radius: var(--dp-radius-panel, 8px);
    overflow: hidden;
    box-shadow: var(--dp-shadow-modal);
  }
}

.command-palette__input-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-4, 16px) var(--dp-space-5, 20px);
  border-bottom: 1px solid var(--dp-border-subtle);
}

.command-palette__search-icon {
  font-size: 16px;
  color: var(--dp-text-muted);
  flex-shrink: 0;
}

.command-palette__input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--dp-font-size-lg, 16px);
  color: var(--dp-text-primary);
  background: transparent;
  font-family: var(--dp-font-family);

  &::placeholder {
    color: var(--dp-text-quaternary);
  }
}

.command-palette__esc {
  padding: 2px 6px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs, 4px);
  font-size: 11px;
  color: var(--dp-text-muted);
  background: var(--dp-surface-elevated);
  font-family: var(--dp-font-family-code);
  line-height: 1.4;
}

.command-palette__results {
  max-height: 360px;
  overflow-y: auto;
  padding: var(--dp-space-2, 8px);
}

.command-palette__group-label {
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px) var(--dp-space-1, 4px);
  font-size: var(--dp-font-size-xs, 12px);
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.command-palette__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border: none;
  border-radius: var(--dp-radius-control, 4px);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background var(--dp-duration-fast, 150ms) ease;

  &:hover,
  &--active {
    background: var(--dp-fill-quaternary);
  }

  &--active {
    background: var(--dp-blue-50);
  }
}

.command-palette__item-label {
  font-size: var(--dp-font-size-md, 14px);
  color: var(--dp-text-primary);
  font-weight: var(--dp-font-weight-emphasis, 500);
}

.command-palette__item-hint {
  font-size: var(--dp-font-size-xs, 12px);
  color: var(--dp-text-muted);
}

.command-palette__loading {
  display: flex;
  justify-content: center;
  padding: var(--dp-space-6, 24px) 0;
}

.command-palette__empty {
  padding: var(--dp-space-6, 24px) 0;
  text-align: center;
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-md, 14px);
}
</style>
