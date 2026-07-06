#!/usr/bin/env node
/**
 * 考试工作台菜单与侧栏 icon 映射契约校验。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const menuPath = join(root, 'src/constants/exam-workspace-menu.ts')
const layoutPath = join(root, 'src/views/teacher/exam-workspace-layout.vue')

const menuSource = readFileSync(menuPath, 'utf8')
const layoutSource = readFileSync(layoutPath, 'utf8')

function extractMenuItemKeys(source) {
  const keys = []
  const re = /^\s+key: '([^']+)',\s*\n\s+label:/gm
  for (let match = re.exec(source); match !== null; match = re.exec(source)) {
    keys.push(match[1])
  }
  return keys
}

function extractMenuIconMapKeys(source) {
  const keys = []
  const blockMatch = /const menuIconMap[^=]*=\s*\{([\s\S]*?)\n\}/.exec(source)
  if (!blockMatch) {
    throw new Error('未找到 menuIconMap 定义')
  }
  const re = /["']([^"']+)["']\s*:/g
  for (let match = re.exec(blockMatch[1]); match !== null; match = re.exec(blockMatch[1])) {
    keys.push(match[1])
  }
  return keys
}

const menuItemKeys = extractMenuItemKeys(menuSource)
const iconKeys = extractMenuIconMapKeys(layoutSource)
const menuSet = new Set(menuItemKeys)
const iconSet = new Set(iconKeys)
const errors = []

if (menuSource.includes("key: 'mark-calibration'")) {
  errors.push('mark-calibration 组应已合并进 mark-formal，不得保留独立定标组')
}

const trialBlock = /key: 'mark-trial'[\s\S]*?items:\s*\[([\s\S]*?)\]\s*,\s*\}/.exec(menuSource)
if (!trialBlock || !trialBlock[1].includes("key: 'marking-experience-assist'")) {
  errors.push('mark-trial 组须包含 marking-experience-assist 菜单项（试评后、正评任务生成前完成定标）')
}

for (const key of menuItemKeys) {
  if (!iconSet.has(key)) {
    errors.push(`menuIconMap 缺少菜单项键: ${key}`)
  }
}

for (const key of iconKeys) {
  if (!menuSet.has(key)) {
    errors.push(`menuIconMap 存在孤儿键（菜单未声明）: ${key}`)
  }
}

if (menuItemKeys.length !== iconKeys.length) {
  errors.push(`菜单项数量 ${menuItemKeys.length} 与 icon 映射 ${iconKeys.length} 不一致`)
}

if (errors.length > 0) {
  console.error('[verify-exam-workspace-menu-contract] 失败:')
  for (const err of errors) {
    console.error(`  - ${err}`)
  }
  process.exit(1)
}

console.warn(`[verify-exam-workspace-menu-contract] OK (${menuItemKeys.length} menu items)`)
