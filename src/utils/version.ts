/**
 * 版本信息工具
 * 在控制台打印 Git 版本信息，便于调试和版本确认
 */

declare const __GIT_COMMIT_HASH__: string
declare const __GIT_COMMIT_HASH_SHORT__: string
declare const __GIT_COMMIT_TIME__: string
declare const __GIT_COMMIT_MESSAGE__: string
declare const __GIT_BRANCH__: string
declare const __GIT_AUTHOR__: string
declare const __BUILD_TIME__: string

export interface VersionInfo {
  commitHash: string
  commitHashShort: string
  commitTime: string
  commitMessage: string
  branch: string
  author: string
  buildTime: string
}

/**
 * 获取版本信息
 */
export function getVersionInfo(): VersionInfo {
  return {
    commitHash: typeof __GIT_COMMIT_HASH__ !== 'undefined' ? __GIT_COMMIT_HASH__ : 'unknown',
    commitHashShort: typeof __GIT_COMMIT_HASH_SHORT__ !== 'undefined' ? __GIT_COMMIT_HASH_SHORT__ : 'unknown',
    commitTime: typeof __GIT_COMMIT_TIME__ !== 'undefined' ? __GIT_COMMIT_TIME__ : 'unknown',
    commitMessage: typeof __GIT_COMMIT_MESSAGE__ !== 'undefined' ? __GIT_COMMIT_MESSAGE__ : 'unknown',
    branch: typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : 'unknown',
    author: typeof __GIT_AUTHOR__ !== 'undefined' ? __GIT_AUTHOR__ : 'unknown',
    buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown',
  }
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr: string): string {
  if (dateStr === 'unknown')
    return dateStr
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return dateStr
  }
}

function resolveConsoleColor(variableName: string): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()
  return value
}

/**
 * 在控制台打印版本信息
 */
export function printVersionInfo(): void {
  const info = getVersionInfo()
  const primaryColor = resolveConsoleColor('--ant-color-primary')
  const textColor = resolveConsoleColor('--ant-color-text')
  const textSecondaryColor = resolveConsoleColor('--ant-color-text-secondary')
  const textTertiaryColor = resolveConsoleColor('--ant-color-text-tertiary')
  const successColor = resolveConsoleColor('--ant-color-success')
  const accentColor = resolveConsoleColor('--ant-color-primary-hover')

  const styles = {
    title: `color: ${primaryColor}; font-size: 14px; font-weight: bold;`,
    label: `color: ${textSecondaryColor}; font-size: 12px;`,
    value: `color: ${textColor}; font-size: 12px; font-weight: bold;`,
    commit: `color: ${successColor}; font-size: 12px; font-weight: bold;`,
    message: `color: ${accentColor}; font-size: 12px;`,
  }

  /* eslint-disable no-console */
  console.log(
    '%c阅卷中心 · 版本信息',
    styles.title,
  )

  console.log(
    '%c┌───────────────────────────────────────────────────────────────',
    `color: ${primaryColor};`,
  )

  console.log(
    '%c│ %c提交哈希: %c%s',
    `color: ${primaryColor};`,
    styles.label,
    styles.commit,
    info.commitHashShort,
  )

  console.log(
    '%c│ %c提交时间: %c%s',
    `color: ${primaryColor};`,
    styles.label,
    styles.value,
    formatDateTime(info.commitTime),
  )

  console.log(
    '%c│ %c提交作者: %c%s',
    `color: ${primaryColor};`,
    styles.label,
    styles.value,
    info.author,
  )

  console.log(
    '%c│ %c当前分支: %c%s',
    `color: ${primaryColor};`,
    styles.label,
    styles.value,
    info.branch,
  )

  console.log(
    '%c│ %c构建时间: %c%s',
    `color: ${primaryColor};`,
    styles.label,
    styles.value,
    formatDateTime(info.buildTime),
  )

  console.log(
    '%c└───────────────────────────────────────────────────────────────',
    `color: ${primaryColor};`,
  )

  // 挂载到 window 对象，方便随时查看和重新打印
  if (typeof window !== 'undefined') {
    ;(window as Window & { __APP_VERSION__?: VersionInfo, __printVersion__?: () => void }).__APP_VERSION__ = info
    ;(window as Window & { __APP_VERSION__?: VersionInfo, __printVersion__?: () => void }).__printVersion__ = printVersionInfo
    console.log(
      '%c提示：%c__printVersion__()%c 可随时重新查看版本信息',
      `color: ${textTertiaryColor}; font-size: 11px;`,
      `color: ${primaryColor}; font-size: 11px; font-weight: bold;`,
      `color: ${textTertiaryColor}; font-size: 11px;`,
    )
  }
  /* eslint-enable no-console */
}
