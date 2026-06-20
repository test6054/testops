<template>
  <div v-if="selectedExamId" class="print-package-page__toolbar">
    <UiTag v-if="pagination.total > 0" tone="blue" size="sm">
      共 {{ pagination.total }} 个印刷包
    </UiTag>
    <UiButton size="sm" :loading="generating" @click="openGenerateModal">
      <template #icon><ThunderboltOutlined /></template>
      一键生成印刷包
    </UiButton>
  </div>

  <UiEmpty
    v-if="!selectedExamId"
    description="请选择考试"
    class="print-package-page__empty"
  />

  <UiCard v-else class="print-package-page__list-card">
    <UiDataTable
      v-model:current="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      class="student-detail-table__data-table"
      :columns="packageColumns"
      :data-source="packageList"
      :loading="loading"
      :total="pagination.total"
      row-key="printPackageId"
      size="middle"
      flat
      @page-change="handlePackagePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'packageName'">
          {{ record.packageName }}
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="statusTone(record.status)" size="sm">
            {{ statusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'sealRemark'">
          {{ record.sealRemark || '未填写封装备注' }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="operations-cell" @click.stop>
            <UiTextAction @click="viewDetail(record)">查看明细</UiTextAction>
            <UiTextAction
              v-if="record.packageFileId"
              tone="primary"
              @click="previewPackagePdf(record)"
            >
              预览
            </UiTextAction>
            <UiTextAction v-if="record.packageFileId" @click="downloadPackagePdf(record)">
              下载 PDF
            </UiTextAction>
          </div>
        </template>
      </template>
    </UiDataTable>
  </UiCard>

  <!-- 一键生成印刷包弹窗 -->
  <a-modal
    v-model:open="generateModalVisible"
    title="一键生成印刷包"
    :width="560"
    :confirm-loading="generating"
    ok-text="开始生成"
    cancel-text="取消"
    @ok="handleGenerate"
  >
    <a-form layout="vertical" style="margin-top: 8px">
      <a-form-item label="印刷包编号" required>
        <a-input
          v-model:value="generateForm.packageNo"
          placeholder="例如：PKG-2026-001"
          :maxlength="50"
        />
      </a-form-item>
      <a-form-item label="印刷包名称" required>
        <a-input
          v-model:value="generateForm.packageName"
          placeholder="例如：期末A卷-第一批次"
          :maxlength="100"
        />
      </a-form-item>
      <a-form-item label="封装备注">
        <a-textarea
          v-model:value="generateForm.sealRemark"
          :rows="2"
          :maxlength="500"
          placeholder="可选"
        />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- 印刷包明细弹窗 -->
  <a-modal
    v-model:open="detailModalVisible"
    :title="`印刷包明细 - ${detailPackage?.packageName ?? ''}`"
    :width="960"
    :footer="null"
  >
    <a-spin :spinning="detailLoading">
      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="detailColumns"
        :data-source="detailItems"
        :show-pagination="false"
        flat
        :total="detailItems.length"
        row-key="printPackageItemId"
        size="small"
        bordered
        :scroll="{ y: 400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <UiTag :tone="record.status === 'PRINTED' ? 'green' : 'gray'" size="sm">
              {{ record.status === 'PRINTED' ? '已印刷' : '待印刷' }}
            </UiTag>
          </template>
        </template>
      </UiDataTable>
    </a-spin>
  </a-modal>

  <!-- PDF 预览 Modal -->
  <a-modal
    v-model:open="previewModalOpen"
    title="印刷包 PDF 预览"
    width="900px"
    :footer="null"
    :destroy-on-close="true"
  >
    <a-spin :spinning="previewLoading">
      <iframe
        v-if="previewPdfUrl"
        :src="previewPdfUrl"
        style="width: 100%; height: 70vh; border: none"
      />
      <UiEmpty v-else-if="!previewLoading" description="暂无数据" />
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { PrintPackageItemVO, PrintPackageVO } from '@/apis/mark/paper-master'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import {
  generatePrintPackage,
  getPrintPackage,
  pagePrintPackages,
  PRINT_PACKAGE_STATUS_LABEL,
  PRINT_PACKAGE_STATUS_TONE,
} from '@/apis/mark/paper-master'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherPrintPackage' })

const { selectedExamId } = useMarkExamContext()

// ─── 印刷包分页列表 ─────────────────────────────────────────────────

const loading = ref(false)
const packageList = ref<PrintPackageVO[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })

const packageColumns: ColumnType<PrintPackageVO>[] = [
  { title: '名称', key: 'packageName', width: 200, ellipsis: true },
  { title: '编号', dataIndex: 'packageNo', key: 'packageNo', width: 140 },
  { title: '状态', key: 'status', width: 100 },
  { title: '人数', dataIndex: 'itemCount', key: 'itemCount', width: 80, align: 'right' },
  { title: '生成时间', dataIndex: 'generatedTime', key: 'generatedTime', width: 170 },
  { title: '封装备注', key: 'sealRemark', ellipsis: true },
  { title: '操作', key: 'actions', fixed: 'right', width: 220 },
]

async function loadPackageList() {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const res = await pagePrintPackages({
      examId: selectedExamId.value,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    packageList.value = readPageList(res, '印刷包列表加载失败，请稍后重试')
    pagination.pageNum = res.pageNum
    pagination.pageSize = res.pageSize
    pagination.total = readPageTotal(res, '印刷包列表加载失败，请稍后重试')
  } catch (e) {
    packageList.value = []
    pagination.total = 0
    showUserError(e, '印刷包列表加载失败')
  } finally {
    loading.value = false
  }
}

function handlePackagePageChange(pageEvent: { current: number, pageSize: number }): void {
  pagination.pageNum = pageEvent.current
  pagination.pageSize = pageEvent.pageSize
  loadPackageList()
}

// ─── 状态展示 ───────────────────────────────────────────────────────

function statusTone(status: PrintPackageVO['status']): BadgeTone {
  return strictEnumTone(PRINT_PACKAGE_STATUS_TONE, status, '印刷包状态')
}

function statusLabel(status: PrintPackageVO['status']): string {
  return strictEnumLabel(PRINT_PACKAGE_STATUS_LABEL, status, '印刷包状态')
}

// ─── 一键生成印刷包 ──────────────────────────────────────────────────

const generateModalVisible = ref(false)
const generating = ref(false)

const generateForm = reactive({
  packageNo: '',
  packageName: '',
  sealRemark: '',
})

function openGenerateModal() {
  generateForm.packageNo = ''
  generateForm.packageName = ''
  generateForm.sealRemark = ''
  generateModalVisible.value = true
}

async function handleGenerate() {
  if (!selectedExamId.value) return
  if (!generateForm.packageNo.trim()) {
    message.warning('请填写印刷包编号')
    return
  }
  if (!generateForm.packageName.trim()) {
    message.warning('请填写印刷包名称')
    return
  }

  generating.value = true
  try {
    await generatePrintPackage({
      examId: selectedExamId.value,
      packageNo: generateForm.packageNo.trim(),
      packageName: generateForm.packageName.trim(),
      sealRemark: generateForm.sealRemark?.trim() || undefined,
    })
    message.success('印刷包生成成功')
    generateModalVisible.value = false
    pagination.pageNum = 1
    await loadPackageList()
  } catch (error) {
    showUserError(error, '印刷包生成失败，请确认已上传母版 PDF 且考生名册不为空')
  } finally {
    generating.value = false
  }
}

// ─── 下载印刷包 PDF ──────────────────────────────────────────────────

async function downloadPackagePdf(pkg: PrintPackageVO) {
  try {
    await downloadFile({ nodeId: pkg.packageFileId })
  } catch (error) {
    showUserError(error, '印刷包文件下载失败，请稍后重试')
  }
}

// ─── PDF 预览 ──────────────────────────────────────────────────────

const previewModalOpen = ref(false)
const previewLoading = ref(false)
const previewPdfUrl = ref('')

async function previewPackagePdf(pkg: PrintPackageVO) {
  previewModalOpen.value = true
  previewLoading.value = true
  previewPdfUrl.value = ''
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      message.error('未登录或登录已过期')
      return
    }
    const requestUrl = new URL('/api/storage/filesystem/download', window.location.origin)
    requestUrl.searchParams.set('nodeId', pkg.packageFileId)
    const response = await fetch(requestUrl.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      message.error('印刷包文件加载失败')
      return
    }
    const blob = await response.blob()
    previewPdfUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    showUserError(error, '印刷包预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

// ─── 印刷包明细 ──────────────────────────────────────────────────────

const detailModalVisible = ref(false)
const detailLoading = ref(false)
const detailPackage = ref<PrintPackageVO | null>(null)
const detailItems = ref<PrintPackageItemVO[]>([])

async function viewDetail(pkg: PrintPackageVO) {
  detailPackage.value = pkg
  detailItems.value = []
  detailModalVisible.value = true
  detailLoading.value = true
  try {
    const res = await getPrintPackage({
      examId: pkg.examId,
      printPackageId: pkg.printPackageId,
    })
    detailItems.value = res.items
  } catch (error) {
    showUserError(error, '印刷包明细加载失败，请稍后重试')
  } finally {
    detailLoading.value = false
  }
}

const detailColumns: ColumnType[] = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 120 },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName', width: 100 },
  { title: '考场', dataIndex: 'examRoom', key: 'examRoom', width: 120 },
  { title: '座位号', dataIndex: 'seatNo', key: 'seatNo', width: 80 },
  { title: '二维码', dataIndex: 'qrCode', key: 'qrCode', ellipsis: true },
  { title: '条形码', dataIndex: 'barCode', key: 'barCode', ellipsis: true },
  { title: '防伪码', dataIndex: 'securityCode', key: 'securityCode', width: 120 },
  { title: '状态', key: 'status', width: 90 },
]

// ─── 初始化 ──────────────────────────────────────────────────────────

watch(
  selectedExamId,
  (val) => {
    pagination.pageNum = 1
    if (val) {
      loadPackageList()
    } else {
      packageList.value = []
      pagination.total = 0
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.print-package-page {
  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__empty {
    margin-top: 80px;
  }

  &__list-card {
    margin-top: 8px;
  }
}
</style>
