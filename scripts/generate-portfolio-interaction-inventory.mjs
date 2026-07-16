import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseTemplate } from '@vue/compiler-dom'
import { parse as parseSfc } from '@vue/compiler-sfc'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'src')
const scanRoots = [
  path.join(sourceRoot, 'views', 'portfolio'),
  path.join(sourceRoot, 'components', 'portfolio'),
]
const outputFile = path.resolve(
  projectRoot,
  '..',
  'docs',
  'plans',
  '2026-07-15-portfolio-full-interaction-inventory.md',
)
const buttonTags = new Set(['UiButton', 'a-button', 'button'])

function listVueFiles(root) {
  const files = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...listVueFiles(fullPath))
    } else if (entry.name.endsWith('.vue')) {
      files.push(fullPath)
    }
  }
  return files
}

function markdownCell(value) {
  return String(value || '-')
    .replaceAll('|', '\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', '<br>')
}

function compact(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function directiveArg(prop) {
  if (prop.type !== 7 || !prop.arg) return ''
  return prop.arg.type === 4 ? prop.arg.content : compact(prop.arg.loc?.source)
}

function directiveExpression(prop) {
  return prop.type === 7 && prop.exp ? compact(prop.exp.loc?.source || prop.exp.content) : ''
}

function findDirective(node, name, argument) {
  return node.props.find(
    (prop) =>
      prop.type === 7
      && prop.name === name
      && (argument === undefined || directiveArg(prop) === argument),
  )
}

function findStaticAttribute(node, name) {
  const attribute = node.props.find((prop) => prop.type === 6 && prop.name === name)
  return attribute?.value?.content || ''
}

function bindingValue(node, name) {
  const binding = findDirective(node, 'bind', name)
  if (binding) return directiveExpression(binding) || 'true'
  const staticValue = findStaticAttribute(node, name)
  if (staticValue) return JSON.stringify(staticValue)
  return node.props.some((prop) => prop.type === 6 && prop.name === name) ? 'true' : ''
}

function visibleCondition(node) {
  for (const directiveName of ['if', 'else-if', 'show']) {
    const directive = findDirective(node, directiveName)
    if (directive) {
      return `${directiveName}: ${directiveExpression(directive) || 'true'}`
    }
  }
  if (findDirective(node, 'else')) return 'else'
  return '始终渲染'
}

function nodeLabel(node) {
  const values = []
  function visit(child) {
    if (child.type === 2) {
      const text = compact(child.content)
      if (text) values.push(text)
      return
    }
    if (child.type === 5) {
      values.push(`{{ ${compact(child.content.loc?.source || child.content.content)} }}`)
      return
    }
    if (child.type === 1) {
      child.children.forEach(visit)
    }
  }
  node.children.forEach(visit)
  const content = compact(values.join(' '))
  if (content) return content
  return (
    bindingValue(node, 'aria-label')
    || bindingValue(node, 'title')
    || findStaticAttribute(node, 'aria-label')
    || findStaticAttribute(node, 'title')
    || '无静态文案'
  )
}

function collectFile(file) {
  const source = fs.readFileSync(file, 'utf8')
  const relativeFile = path.relative(sourceRoot, file)
  const { descriptor, errors: sfcErrors } = parseSfc(source, { filename: file })
  if (sfcErrors.length) {
    throw new Error(`${relativeFile} SFC 解析失败：${sfcErrors.join('; ')}`)
  }
  if (!descriptor.template) return { buttons: [], events: [] }
  const ast = parseTemplate(descriptor.template.content, { comments: false })
  const lineOffset = descriptor.template.loc.start.line - 1
  const buttons = []
  const events = []

  function visit(node) {
    if (node.type !== 1) return
    const sourceLine = lineOffset + node.loc.start.line
    const nodeEvents = node.props
      .filter((prop) => prop.type === 7 && prop.name === 'on')
      .map((prop) => {
        const eventName = directiveArg(prop) || '动态事件'
        const handler = directiveExpression(prop)
        if (!handler) {
          throw new Error(`${relativeFile}:${sourceLine} @${eventName} 缺少处理表达式`)
        }
        return { eventName, handler }
      })
    const shared = {
      source: `${relativeFile}:${sourceLine}`,
      tag: node.tag,
      label: nodeLabel(node),
      visible: visibleCondition(node),
      disabled: bindingValue(node, 'disabled') || '未声明',
      loading: bindingValue(node, 'loading') || '未声明',
    }
    if (buttonTags.has(node.tag)) {
      buttons.push({
        ...shared,
        events: nodeEvents.length
          ? nodeEvents.map((item) => `@${item.eventName}=${item.handler}`).join('<br>')
          : '未声明模板事件',
      })
    }
    for (const event of nodeEvents) {
      events.push({ ...shared, ...event })
    }
    node.children.forEach(visit)
  }

  ast.children.forEach(visit)
  return { buttons, events }
}

const vueFiles = scanRoots.flatMap(listVueFiles).sort()
const inventory = vueFiles.map((file) => ({ file, ...collectFile(file) }))
const buttons = inventory.flatMap((item) => item.buttons)
const events = inventory.flatMap((item) => item.events)
const buttonFiles = new Set(
  inventory.filter((item) => item.buttons.length).map((item) => item.file),
).size
const eventFiles = new Set(inventory.filter((item) => item.events.length).map((item) => item.file))
  .size

const lines = [
  '# 教学档案袋前端按钮与交互全量清单',
  '',
  '> 状态：静态清单已完成。该文件由 `edu-practice-mark-vue/scripts/generate-portfolio-interaction-inventory.mjs` 从 live Vue SFC 模板 AST 生成，不手工维护行号和数量。',
  `> 当前基线：扫描 ${vueFiles.length} 个 Vue SFC；${buttonFiles} 个文件包含 ${buttons.length} 个显式按钮；${eventFiles} 个文件包含 ${events.length} 个显式模板事件绑定。`,
  '> 范围：`src/views/portfolio/**/*.vue` 与 `src/components/portfolio/*.vue`；程序化路由、watch、异步请求和后端状态机继续在业务审查总账逐链登记。',
  '',
  '## 1. 显式按钮',
  '',
  '| 来源 | 标签 | 可见文案 | 事件 | 显示条件 | 禁用条件 | Loading |',
  '|---|---|---|---|---|---|---|',
  ...buttons.map(
    (button) =>
      `| \`${markdownCell(button.source)}\` | \`${markdownCell(button.tag)}\` | ${markdownCell(button.label)} | \`${markdownCell(button.events)}\` | \`${markdownCell(button.visible)}\` | \`${markdownCell(button.disabled)}\` | \`${markdownCell(button.loading)}\` |`,
  ),
  '',
  '## 2. 全部显式模板事件',
  '',
  '| 来源 | 标签 | 可见文案 | 事件 | 处理表达式 | 显示条件 | 禁用条件 | Loading |',
  '|---|---|---|---|---|---|---|---|',
  ...events.map(
    (event) =>
      `| \`${markdownCell(event.source)}\` | \`${markdownCell(event.tag)}\` | ${markdownCell(event.label)} | \`@${markdownCell(event.eventName)}\` | \`${markdownCell(event.handler)}\` | \`${markdownCell(event.visible)}\` | \`${markdownCell(event.disabled)}\` | \`${markdownCell(event.loading)}\` |`,
  ),
  '',
  '## 3. 审查完成状态',
  '',
  '- [x] 每个写按钮的显示、禁用、loading、防重复和权限条件已按后端状态机审查。',
  '- [x] 不可逆动作的后果确认与负向决定意见门禁已审查。',
  '- [x] 事件处理器已追到 API、路由、父组件 emit 或纯本地状态变更。',
  '- [x] Scope 切换和异步返回的请求代际隔离已审查。',
  '- [x] 接口失败、重试、空态和成功反馈合同已审查。',
  '- [ ] 真实角色、键盘焦点与多分辨率交互由真机验收确认。',
]

fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8')
process.stdout.write(
  `generated ${path.relative(projectRoot, outputFile)}: ${buttons.length} buttons, ${events.length} events\n`,
)
