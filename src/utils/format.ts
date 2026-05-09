/**
 * 格式化工具函数
 * 确保数据显示的准确性和一致性
 */

/**
 * 格式化进度值，确保在0-100范围内
 * 修复Bug #3: 统计图表数据计算错误 - 进度百分比超过100%
 */
export const formatProgress = (progress: number | undefined | null): number => {
  if (progress === undefined || progress === null || Number.isNaN(progress) || !Number.isFinite(progress)) {
    return 0;
  }
  // 确保进度在0-100范围内，四舍五入
  return Math.min(Math.max(Math.round(progress), 0), 100);
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number | undefined | null): string => {
  if (!bytes || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string | Date | undefined | null): string => {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
};

/**
 * 格式化日期（仅日期部分）
 */
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
/**
 * 格式化百分比
 */
export const formatPercent = (value: number | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0%';
  }
  const formatted = formatProgress(value);
  return `${formatted.toFixed(decimals)}%`;
};

/**
 * 安全地解析数字
 */
export const safeParseNumber = (value: string | number | boolean | undefined | null, defaultValue: number = 0): number => {
  const parsed = Number(value);
  return Number.isNaN(parsed) || !Number.isFinite(parsed) ? defaultValue : parsed;
};

























