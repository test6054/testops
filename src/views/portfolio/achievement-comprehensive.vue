<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAchievementStatsVO,
  PortfolioDevelopmentRecordVO,
} from '@/apis/portfolio/teacher-platform'
import { onMounted, reactive, ref } from 'vue'
import {
  PortfolioDevelopmentRecordTypeCode,
  PortfolioDevelopmentRecordTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioDevelopmentRecordApi } from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioTeacherSearch } from '@/composables/usePortfolioTeacherSearch'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const recordTypeKeys: PortfolioDevelopmentRecordTypeCode[] = [
  PortfolioDevelopmentRecordTypeCode.ACHIEVEMENT,
  PortfolioDevelopmentRecordTypeCode.HONOR,
  PortfolioDevelopmentRecordTypeCode.POLICY,
]

function recordTypeLabel(type: PortfolioDevelopmentRecordTypeCode): string {
  return strictEnumLabel(PortfolioDevelopmentRecordTypeDescription, type, '发展档案条目类型')
}

const loading = ref(false)
/** 列表+统计共用请求 token，防止筛选连点串写 */
const pageRequestToken = ref(0)
const rows = ref<PortfolioDevelopmentRecordVO[]>([])
const stats = ref<PortfolioAchievementStatsVO | null>(null)
const { hydrateTeacherLabels, teacherLabel } = usePortfolioTeacherSearch()
const query = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  searchText: '',
  levelCode: '',
  nationalOnly: false,
  recordTypes: recordTypeKeys,
})

const columns: ColumnsType = [
  { title: '类型', dataIndex: 'recordType', key: 'recordType', width: 88 },
  { title: '标题', dataIndex: 'recordTitle', key: 'recordTitle' },
  { title: '级别', dataIndex: 'levelCode', key: 'levelCode', width: 88 },
  { title: '日期', dataIndex: 'recordDate', key: 'recordDate', width: 110 },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 160 },
]

async function loadPage() {
  const currentToken = ++pageRequestToken.value
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    searchText: query.searchText || undefined,
    levelCode: query.nationalOnly ? 'NATIONAL' : query.levelCode || undefined,
    nationalOnly: query.nationalOnly || undefined,
    recordTypes: [...query.recordTypes],
  }
  loading.value = true
  try {
    const page = await portfolioDevelopmentRecordApi.comprehensivePage(request)
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = page.list ?? []
    await hydrateTeacherLabels(
      rows.value.map((row) => row.teacherUserId).filter((id): id is string => Boolean(id)),
    )
    if (currentToken !== pageRequestToken.value) {
      return
    }
    const nextStats = await portfolioDevelopmentRecordApi.achievementStats({
      levelCode: request.levelCode,
      nationalOnly: request.nationalOnly,
    })
    if (currentToken !== pageRequestToken.value) {
      return
    }
    stats.value = nextStats
  } catch (error) {
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = []
    stats.value = null
    showUserError(error, '加载成果综合查询失败')
  } finally {
    if (currentToken === pageRequestToken.value) {
      loading.value = false
    }
  }
}

onMounted(loadPage)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="成果综合查询" />
    </template>
    <UiCard v-if="stats" title="成果统计">
      <p>成果总数 {{ stats.totalCount }} · 国家级 {{ stats.nationalCount }}</p>
    </UiCard>
    <UiCard style="margin-top: 16px">
      <div class="toolbar">
        <UiInput
          size="sm"
          v-model="query.searchText"
          placeholder="标题关键词"
          style="width: 180px"
          @press-enter="loadPage"
        />
        <UiInput
          size="sm"
          v-model="query.levelCode"
          placeholder="级别编码"
          style="width: 120px"
          :disabled="query.nationalOnly"
          @press-enter="loadPage"
        />
        <UiCheckbox v-model="query.nationalOnly"> 仅国家级 </UiCheckbox>
        <UiButton size="sm" variant="primary" @click="loadPage"> 查询 </UiButton>
      </div>
      <UiEmpty size="sm" v-if="!loading && rows.length === 0" description="当前筛选无综合成果" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'recordType'">
            {{ recordTypeLabel(record.recordType) }}
          </template>
          <template v-else-if="column.key === 'teacherUserId'">
            {{ teacherLabel(record.teacherUserId) }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
</style>
