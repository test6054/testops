import type {BlobDownloadResponse} from '@/config/axios/types'
import message from 'ant-design-vue/es/message'
import notification from 'ant-design-vue/es/notification'

/**
 * 接收数据流生成 blob，创建链接，下载文件
 * @param api 导出表格的api方法（必传）
 * @param isNotify 是否有导出消息提示（默认 false）
 * @param tempName 导出的文件名（可选，优先使用 Content-Disposition）
 * @param fileType 导出的文件格式（默认 .xlsx）
 */

export const useDownload = async (api: () => Promise<BlobDownloadResponse>, isNotify = false, tempName = '', fileType = '.xlsx') => {
  const res = await api()
  if (res.headers['content-disposition']) {
    // 解析 Content-Disposition 头，支持 filename* 格式
    const contentDisposition = res.headers['content-disposition']
    let filename = ''

    // 尝试解析 filename*=UTF-8''filename 格式
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
    if (filenameStarMatch) {
      filename = decodeURIComponent(filenameStarMatch[1])
    } else {
      // 尝试解析传统的 filename=filename 格式
      const filenameMatch = contentDisposition.match(/filename=([^;]+)/)
      if (filenameMatch) {
        filename = filenameMatch[1].replace(/['"]/g, '') // 移除引号
        filename = decodeURIComponent(filename)
      }
    }

    if (filename) {
      tempName = filename
    } else {
      tempName = tempName || new Date().getTime() + fileType
    }
  } else {
    tempName = tempName || new Date().getTime() + fileType
  }
  if (isNotify && res.status === 200) {
    notification.warning({
      message: '温馨提示',
      description: '如果数据庞大会导致下载缓慢哦，请您耐心等待！',
    })
  }
  if (res.status !== 200 || res.data == null || !(res.data instanceof Blob)) {
    message.error('导出失败，请稍后再试！')
    return
  }
  const blob = new Blob([res.data])
  const blobUrl = window.URL.createObjectURL(blob)
  const exportFile = document.createElement('a')
  exportFile.style.display = 'none'
  exportFile.download = tempName
  exportFile.href = blobUrl
  document.body.appendChild(exportFile)
  exportFile.click()
  // 去除下载对 url 的影响
  document.body.removeChild(exportFile)
  window.URL.revokeObjectURL(blobUrl)
}
