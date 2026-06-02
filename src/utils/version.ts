/**
 * 版本信息工具
 * 提供构建版本信息读取能力。
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
