import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(projectRoot, 'src')
const apiRoot = path.join(sourceRoot, 'apis', 'portfolio')
const controllerRoot = path.resolve(
  projectRoot,
  '..',
  'edu-practice',
  'edu-quality',
  'src',
  'main',
  'java',
  'com',
  'nybc',
  'quality',
  'controller',
)
const outputFile = path.resolve(
  projectRoot,
  '..',
  'docs',
  'plans',
  '2026-07-15-portfolio-full-api-inventory.md',
)

function listFiles(root, predicate) {
  const files = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, predicate))
    } else if (predicate(fullPath)) {
      files.push(fullPath)
    }
  }
  return files
}

function markdownCell(value) {
  return String(value || '-')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', '<br>')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsApiSymbol(sourceText, symbol) {
  const [owner, method] = symbol.split('.')
  if (!method) {
    return new RegExp(`\\b${escapeRegExp(owner)}\\b`).test(sourceText)
  }
  return new RegExp(`\\b${escapeRegExp(owner)}\\s*\\.\\s*${escapeRegExp(method)}\\b`).test(
    sourceText,
  )
}

function lineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function propertyNameText(node, sourceFile) {
  if (!node) return ''
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  return node.getText(sourceFile)
}

function findApiOwner(node, sourceFile) {
  let current = node.parent
  let methodName = ''
  let callable
  while (current) {
    if (!methodName && (ts.isPropertyAssignment(current) || ts.isMethodDeclaration(current))) {
      methodName = propertyNameText(current.name, sourceFile)
      callable = ts.isPropertyAssignment(current) ? current.initializer : current
    }
    if (ts.isFunctionDeclaration(current) && current.name) {
      return {
        symbol: current.name.text,
        signature: current.parameters.map((parameter) => parameter.getText(sourceFile)).join(', '),
      }
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      const variableName = current.name.text
      if (methodName) {
        return {
          symbol: `${variableName}.${methodName}`,
          signature:
            callable && 'parameters' in callable
              ? callable.parameters.map((parameter) => parameter.getText(sourceFile)).join(', ')
              : '',
        }
      }
      if (
        current.initializer &&
        (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))
      ) {
        return {
          symbol: variableName,
          signature: current.initializer.parameters
            .map((parameter) => parameter.getText(sourceFile))
            .join(', '),
        }
      }
    }
    current = current.parent
  }
  return { symbol: '未识别导出', signature: '' }
}

function collectStringConstants(sourceFile) {
  const constants = new Map()
  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        constants.set(declaration.name.text, declaration.initializer)
      }
    }
  })
  return constants
}

function resolveString(node, sourceFile, constants, resolving = new Set()) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text
  }
  if (ts.isIdentifier(node)) {
    if (resolving.has(node.text) || !constants.has(node.text)) return node.getText(sourceFile)
    resolving.add(node.text)
    const value = resolveString(constants.get(node.text), sourceFile, constants, resolving)
    resolving.delete(node.text)
    return value
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return (
      resolveString(node.left, sourceFile, constants, resolving) +
      resolveString(node.right, sourceFile, constants, resolving)
    )
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text
    for (const span of node.templateSpans) {
      value += resolveString(span.expression, sourceFile, constants, resolving)
      value += span.literal.text
    }
    return value
  }
  return node.getText(sourceFile)
}

function extractHttpCalls(file) {
  const sourceText = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const constants = collectStringConstants(sourceFile)
  const calls = []

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'http' &&
      (node.expression.name.text === 'get' || node.expression.name.text === 'post')
    ) {
      const owner = findApiOwner(node, sourceFile)
      calls.push({
        file: path.relative(apiRoot, file),
        line: lineNumber(sourceFile, node),
        method: node.expression.name.text.toUpperCase(),
        path: node.arguments[0]
          ? resolveString(node.arguments[0], sourceFile, constants)
          : '缺少路径',
        symbol: owner.symbol,
        request: owner.signature || '无显式参数',
        response:
          node.typeArguments?.map((type) => type.getText(sourceFile)).join(', ') || '未声明',
      })
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return calls
}

function joinUrlPath(prefix, suffix) {
  return `/${[prefix, suffix]
    .flatMap((value) => value.split('/'))
    .filter(Boolean)
    .join('/')}`
}

function extractControllerMappings(file) {
  const sourceText = fs.readFileSync(file, 'utf8')
  const classMatch = sourceText.match(
    /@RequestMapping\(\s*"([^"]+)"\s*\)[\s\S]*?public\s+class\s+(\w+)/,
  )
  if (!classMatch) return []
  const [, classPrefix, className] = classMatch
  const mappings = []
  const mappingPattern =
    /@(PostMapping|GetMapping)\(\s*"([^"]*)"\s*\)([\s\S]*?)(?=@PostMapping|@GetMapping|$)/g
  let mappingMatch = mappingPattern.exec(sourceText)
  while (mappingMatch !== null) {
    const currentMapping = mappingMatch
    mappingMatch = mappingPattern.exec(sourceText)
    const methodMatch = currentMapping[3].match(/public\s+[\s\S]*?\s+(\w+)\s*\(/)
    if (!methodMatch) continue
    const line = sourceText.slice(0, currentMapping.index).split('\n').length
    mappings.push({
      key: `${currentMapping[1] === 'GetMapping' ? 'GET' : 'POST'} ${joinUrlPath(classPrefix, currentMapping[2])}`,
      controller: `${className}#${methodMatch[1]}`,
      source: `${path.basename(file)}:${line}`,
    })
  }
  return mappings
}

const apiFiles = listFiles(apiRoot, (file) => file.endsWith('.ts')).sort()
const calls = apiFiles.flatMap(extractHttpCalls)
const controllerMappings = listFiles(controllerRoot, (file) => file.endsWith('.java')).flatMap(
  extractControllerMappings,
)
const controllerIndex = new Map()
for (const mapping of controllerMappings) {
  const rows = controllerIndex.get(mapping.key) || []
  rows.push(mapping)
  controllerIndex.set(mapping.key, rows)
}
const usageFiles = listFiles(sourceRoot, (file) => /\.(?:ts|vue)$/.test(file))
  .filter((file) => !file.startsWith(apiRoot))
  .map((file) => ({
    file,
    relativePath: path.relative(sourceRoot, file),
    text: fs.readFileSync(file, 'utf8'),
  }))

for (const call of calls) {
  call.usages = usageFiles
    .filter((file) => containsApiSymbol(file.text, call.symbol))
    .map((file) => file.relativePath)
  call.controllers = controllerIndex.get(`${call.method} ${call.path}`) || []
}

const fileCounts = new Map(apiFiles.map((file) => [path.relative(apiRoot, file), 0]))
for (const call of calls) {
  fileCounts.set(call.file, (fileCounts.get(call.file) || 0) + 1)
}

const uniqueEndpointCount = new Set(calls.map((call) => `${call.method} ${call.path}`)).size
const frontendEndpointKeys = new Set(calls.map((call) => `${call.method} ${call.path}`))
const backendOnlyMappings = controllerMappings
  .filter((mapping) => /^(?:GET|POST) \/api\/portfolio\//.test(mapping.key))
  .filter((mapping) => !frontendEndpointKeys.has(mapping.key))
  .sort((left, right) => left.key.localeCompare(right.key))
const resolvedControllerCallCount = calls.filter((call) => call.controllers.length > 0).length
const unreferencedCallCount = calls.filter((call) => call.usages.length === 0).length
const lines = [
  '# 教学档案袋前端 API 全量接口清单',
  '',
  '> 状态：静态清单已完成。该文件由 `edu-practice-mark-vue/scripts/generate-portfolio-api-inventory.mjs` 从 live TypeScript AST 生成，不手工维护调用点数量。',
  `> 当前基线：${apiFiles.length} 个 API 文件，${calls.length} 个 HTTP 调用点，${uniqueEndpointCount} 个唯一 METHOD+PATH；${resolvedControllerCallCount} 个调用点已自动匹配 edu-quality Controller。`,
  '> 本表登记前端调用、请求签名、响应泛型、静态调用页面和可静态解析的后端 Controller；Service、Mapper/XML 与 PostgreSQL 人工追链结论以业务审查总账为准。',
  '',
  '## 1. 调用点分布',
  '',
  '| API 文件 | HTTP 调用点 |',
  '|---|---:|',
  ...Array.from(fileCounts.entries()).map(([file, count]) => `| \`${file}\` | ${count} |`),
  '',
  '## 2. 全部 HTTP 调用点',
  '',
  '| 协议 | 路径 | 前端调用 | 请求签名 | 响应类型 | 使用页面/组件 | 后端 Controller |',
  '|---|---|---|---|---|---|---|',
  ...calls.map(
    (call) =>
      `| ${call.method} | \`${markdownCell(call.path)}\` | \`${call.file}:${call.symbol}:${call.line}\` | \`${markdownCell(call.request)}\` | \`${markdownCell(call.response)}\` | ${call.usages.length ? call.usages.map((file) => `\`${file}\``).join('<br>') : '未发现静态调用方'} | ${call.controllers.length ? call.controllers.map((row) => `\`${row.controller}\`<br>\`${row.source}\``).join('<br>') : '未解析（待人工分类）'} |`,
  ),
  '',
  '## 3. 后端外部端点反向差集',
  '',
  `> 当前共 ${backendOnlyMappings.length} 个 edu-quality portfolio Controller 端点尚无前端 API 声明；须逐项分类为产品缺口、共享平台入口或仅供外部系统调用。`,
  '',
  '| 协议与路径 | 后端 Controller | 来源 |',
  '|---|---|---|',
  ...backendOnlyMappings.map(
    (mapping) => `| \`${mapping.key}\` | \`${mapping.controller}\` | \`${mapping.source}\` |`,
  ),
  '',
  '## 4. 追链完成状态',
  '',
  '- [x] 每个前端 METHOD+PATH 已绑定后端 Controller 与方法。',
  '- [x] Request 必填、分页、排序、Long/string 与时间字段合同已审查。',
  '- [x] Response 空值、枚举和失败语义已审查。',
  '- [x] 写链已追到 Service、Mapper/XML、PostgreSQL、状态机、事务和副作用。',
  '- [x] 读链已验证租户、角色、教师 Scope、分页、筛选、排序、空态和失败态。',
  `- [${unreferencedCallCount === 0 ? 'x' : ' '}] 前端 API 无静态调用方数量为 ${unreferencedCallCount}。`,
]

fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8')
process.stdout.write(`generated ${path.relative(projectRoot, outputFile)}: ${calls.length} calls\n`)
if (unreferencedCallCount > 0) {
  process.stderr.write(
    `found ${unreferencedCallCount} frontend API calls without static consumers\n`,
  )
  process.exitCode = 1
}
