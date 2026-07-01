<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title title="OCR 全文检索">
        <template #status>
          <UiTag tone="blue" size="sm">OCR 全文检索</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goList">返回列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiFilterBar
      v-model="filterModel"
      :fields="filterFields"
      variant="panel"
      show-labels
      search-text="检索"
      @search="handleSearch"
      @reset="handleReset"
    />

    <UiDataTable
      v-model:current="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :columns="columns"
      :data-source="hits"
      :loading="loading"
      :total="pagination.total"
      flat
      row-key="materialId"
      size="middle"
      empty-kind="first-run"
      empty-description="输入关键词检索 OCR 识别后的归档材料"
      class="student-detail-table__data-table"
      @page-change="loadHits"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'archive'">
          <button type="button" class="link-cell" @click="goDetail(record.volumeId)">
            {{ record.archiveNo }}
          </button>
          <div class="link-cell__sub">{{ record.archiveTitle }}</div>
        </template>
        <template v-else-if="column.key === 'materialType'">
          {{ materialTypeLabel(record.materialType) }}
        </template>
        <template v-else-if="column.key === 'snippet'">
          <span class="snippet">{{ record.snippet || '-' }}</span>
        </template>
      </template>
    </UiDataTable>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode, ArchiveVolumeSearchHitVO } from '@/apis/mark/archive-volume'
import { ARCHIVE_MATERIAL_TYPE_LABEL, searchArchiveVolumes } from '@/apis/mark/archive-volume'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeSearch' })

const router = useRouter()
const loading = ref(false)
const hits = ref<ArchiveVolumeSearchHitVO[]>([])
const filterForm = reactive({ keyword: '' })
const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})
const pagination = reactive({ pageNum: 1, pageSize: 20, total: 0 })

const filterFields: FilterField[] = [
  {
    key: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: 'OCR 全文关键词',
  },
]

const columns: ColumnsType<ArchiveVolumeSearchHitVO> = [
  { title: '归档卷', key: 'archive', dataIndex: 'archiveNo', width: 220 },
  { title: '材料类型', key: 'materialType', dataIndex: 'materialType', width: 140 },
  { title: '文件名', key: 'fileName', dataIndex: 'fileName', width: 180 },
  { title: '命中摘要', key: 'snippet', dataIndex: 'snippet' },
]

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

async function loadHits() {
  const keyword = filterForm.keyword.trim()
  if (!keyword) {
    hits.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const result = await searchArchiveVolumes({
      keyword,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    hits.value = readPageList(result, 'OCR 检索结果异常，请刷新后重试')
    pagination.total = readPageTotal(result)
  } catch (error) {
    showUserError(error, 'OCR 检索失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (!filterForm.keyword.trim()) {
    message.warning('请输入检索关键词')
    return
  }
  pagination.pageNum = 1
  loadHits()
}

function handleReset() {
  filterForm.keyword = ''
  hits.value = []
  pagination.pageNum = 1
  pagination.total = 0
}

function goDetail(volumeId: string) {
  void router.push({ name: 'TeacherArchiveVolumeDetail', params: { volumeId } })
}

function goList() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

onMounted(() => {
  // 首次进入不自动检索，等待用户输入关键词
})
</script>

<style scoped>
.snippet {
  color: var(--text-secondary, #595959);
  line-height: 1.5;
}
.link-cell__sub {
  color: var(--text-secondary, #8c8c8c);
  font-size: 12px;
}
</style>
