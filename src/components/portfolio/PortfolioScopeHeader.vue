<script lang="ts" setup>
/**
 * 教学档案袋域统一教师范围选择器：写入 portfolioStore 并同步 URL query。
 */
import type { PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { showUserError } from '@/utils/error-handler'
import { resolvePortfolioTeacherDisplayName } from '@/utils/portfolio-teacher-display'
import { readPageList } from '@/utils/page-result'

defineOptions({ name: 'PortfolioScopeHeader' })

const emit = defineEmits<{
  change: []
}>()

const route = useRoute()
const router = useRouter()
const portfolioStore = usePortfolioStore()
const { canPickTeachers, currentUserId, resolveDefaultTeacherId } = usePortfolioTeacherAccess()

const teacherOptions = ref<PortfolioTeacherSummaryVO[]>([])
const loading = ref(false)

const selectedTeacherId = computed({
  get: () => portfolioStore.currentTeacherId || resolveDefaultTeacherId(),
  set: (value: string) => {
    portfolioStore.setTeacher(value)
    syncRouteQuery(value)
    emit('change')
  },
})

const selfTeacherLabel = computed(() => {
  if (canPickTeachers.value) {
    return ''
  }
  return '当前教师：本人'
})

async function loadTeacherOptions(keyword?: string) {
  if (!canPickTeachers.value) {
    return
  }
  loading.value = true
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: 50,
      searchText: keyword || undefined,
    })
    teacherOptions.value = readPageList(page, '加载教师名册失败')
  }
  catch (error) {
    showUserError(error, '加载教师名册失败')
  }
  finally {
    loading.value = false
  }
}

function syncRouteQuery(teacherId: string) {
  const query = { ...route.query }
  if (teacherId) {
    query.teacherId = teacherId
  }
  else {
    delete query.teacherId
  }
  void router.replace({ path: route.path, query })
}

function bootstrapFromRoute() {
  const queryId = typeof route.query.teacherId === 'string' ? route.query.teacherId : ''
  if (queryId) {
    portfolioStore.currentTeacherId = queryId
    return
  }
  if (!canPickTeachers.value && currentUserId.value) {
    portfolioStore.currentTeacherId = currentUserId.value
  }
}

watch(
  () => route.query.teacherId,
  (teacherId) => {
    const id = typeof teacherId === 'string' ? teacherId : ''
    if (id && id !== portfolioStore.currentTeacherId) {
      portfolioStore.currentTeacherId = id
      portfolioStore.bumpScopeChangeEpoch()
    }
  },
)

onMounted(() => {
  bootstrapFromRoute()
  void loadTeacherOptions()
})
</script>

<template>
  <div class="portfolio-scope-header">
    <span class="portfolio-scope-header__label">教师范围</span>
    <template v-if="canPickTeachers">
      <a-select
        v-model:value="selectedTeacherId"
        class="portfolio-scope-header__select"
        show-search
        allow-clear
        :loading="loading"
        placeholder="请选择目标教师"
        :filter-option="false"
        @search="(val: string) => loadTeacherOptions(val)"
        @focus="() => loadTeacherOptions()"
      >
        <a-select-option
          v-for="item in teacherOptions"
          :key="item.userId"
          :value="item.userId"
        >
          {{ resolvePortfolioTeacherDisplayName(item) ?? item.userId }}
          <template v-if="item.departmentName">
            · {{ item.departmentName }}
          </template>
        </a-select-option>
      </a-select>
    </template>
    <UiTag v-else tone="blue">
      {{ selfTeacherLabel }}
    </UiTag>
  </div>
</template>

<style lang="scss" scoped>
.portfolio-scope-header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3);
}

.portfolio-scope-header__label {
  font-size: var(--dp-font-size-md);
  font-weight: var(--dp-font-weight-emphasis);
  color: var(--dp-text-secondary);
  white-space: nowrap;
}

.portfolio-scope-header__select {
  min-width: 260px;
  max-width: 360px;
}
</style>
