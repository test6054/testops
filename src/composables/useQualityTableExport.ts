import type { ExportBusinessType } from '@/apis/edu/export'
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { createExportJob } from '@/apis/edu/export'
import { useExportTaskStore } from '@/stores/exportTask'
import { ExportFormatEnum } from '@/types/enums'
import { showUserError } from '@/utils/error-handler'

interface QualityTableExportParams {
  businessType: ExportBusinessType
  bizName: string
  queryParams: Record<string, unknown>
}

/** 质量评价列表导出：创建异步导出任务并打开 ExportTaskCenter */
export function useQualityTableExport() {
  const exporting = ref(false)
  const exportTaskStore = useExportTaskStore()

  async function exportExcel(params: QualityTableExportParams): Promise<void> {
    exporting.value = true
    try {
      await createExportJob({
        businessType: params.businessType,
        exportFormat: ExportFormatEnum.EXCEL,
        queryParams: JSON.stringify(params.queryParams),
        bizName: params.bizName,
      })
      void message.success('导出任务已创建，请在导出任务中心查看进度')
      exportTaskStore.openCenter()
    } catch (error) {
      showUserError(error, '创建导出任务失败')
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    exportExcel,
  }
}
