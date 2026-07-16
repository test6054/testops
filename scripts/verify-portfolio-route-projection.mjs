import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(projectRoot, '..')
const routeFile = path.join(projectRoot, 'src', 'router', 'routes', 'portfolio.ts')
const portfolioTypesFile = path.join(projectRoot, 'src', 'apis', 'portfolio', 'types.ts')
const reviewAccessFile = path.join(projectRoot, 'src', 'composables', 'usePortfolioReviewAccess.ts')
const routeStoreFile = path.join(projectRoot, 'src', 'stores', 'modules', 'route.ts')
const backendEnumFile = path.join(
  workspaceRoot,
  'edu-practice',
  'edu-quality',
  'src',
  'main',
  'java',
  'com',
  'nybc',
  'quality',
  'enums',
  'PortfolioWorkShellEnum.java',
)
const outputFile = path.join(
  workspaceRoot,
  'docs',
  'plans',
  '2026-07-15-portfolio-route-menu-projection-verification.md',
)

function invariant(condition, message) {
  if (!condition) throw new Error(message)
}

function propertyName(node, sourceFile) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  return node.getText(sourceFile)
}

function createStaticEvaluator(file, seeds = {}) {
  const sourceText = fs.readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const declarations = new Map()
  const cache = new Map(Object.entries(seeds))

  sourceFile.forEachChild((node) => {
    if (!ts.isVariableStatement(node)) return
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        declarations.set(declaration.name.text, declaration.initializer)
      }
    }
  })

  function evaluate(node, resolving = new Set()) {
    if (!node) return undefined
    if (
      ts.isParenthesizedExpression(node)
      || ts.isAsExpression(node)
      || ts.isTypeAssertionExpression(node)
      || ts.isNonNullExpression(node)
      || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node))
    ) {
      return evaluate(node.expression, resolving)
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (node.kind === ts.SyntaxKind.NullKeyword) return null
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (ts.isIdentifier(node)) {
      if (node.text === 'undefined') return undefined
      if (cache.has(node.text)) return cache.get(node.text)
      invariant(!resolving.has(node.text), `静态常量存在循环引用：${node.text}`)
      const initializer = declarations.get(node.text)
      if (!initializer) return node.text
      resolving.add(node.text)
      const value = evaluate(initializer, resolving)
      resolving.delete(node.text)
      cache.set(node.text, value)
      return value
    }
    if (ts.isArrayLiteralExpression(node)) {
      const values = []
      for (const element of node.elements) {
        if (ts.isSpreadElement(element)) {
          const spread = evaluate(element.expression, resolving)
          invariant(Array.isArray(spread), `数组展开项无法静态解析：${element.getText(sourceFile)}`)
          values.push(...spread)
        } else {
          values.push(evaluate(element, resolving))
        }
      }
      return values
    }
    if (ts.isObjectLiteralExpression(node)) {
      const value = {}
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) {
          const spread = evaluate(property.expression, resolving)
          invariant(
            spread && typeof spread === 'object' && !Array.isArray(spread),
            `对象展开项无法静态解析：${property.getText(sourceFile)}`,
          )
          Object.assign(value, spread)
        } else if (ts.isPropertyAssignment(property)) {
          value[propertyName(property.name, sourceFile)] = evaluate(property.initializer, resolving)
        } else if (ts.isShorthandPropertyAssignment(property)) {
          value[property.name.text] = evaluate(property.name, resolving)
        }
      }
      return value
    }
    if (ts.isTemplateExpression(node)) {
      let value = node.head.text
      for (const span of node.templateSpans) {
        value += String(evaluate(span.expression, resolving))
        value += span.literal.text
      }
      return value
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      return String(evaluate(node.left, resolving)) + String(evaluate(node.right, resolving))
    }
    if (ts.isPropertyAccessExpression(node)) {
      const owner = evaluate(node.expression, resolving)
      return owner && typeof owner === 'object' ? owner[node.name.text] : node.getText(sourceFile)
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return '[function]'
    return node.getText(sourceFile)
  }

  return { sourceFile, sourceText, evaluate: (name) => evaluate(ts.factory.createIdentifier(name)) }
}

function joinRoutePath(parentPath, routePath) {
  if (routePath.startsWith('/')) return routePath
  return `/${[parentPath, routePath]
    .flatMap((value) => value.split('/'))
    .filter(Boolean)
    .join('/')}`
}

function flattenRoutes(routes, parentPath = '') {
  const rows = []
  for (const route of routes) {
    invariant(route && typeof route === 'object', 'portfolioRoutes 包含无法静态解析的路由项')
    invariant(typeof route.path === 'string', `路由缺少静态 path：${JSON.stringify(route)}`)
    const fullPath = joinRoutePath(parentPath, route.path)
    rows.push({ ...route, fullPath })
    if (Array.isArray(route.children)) rows.push(...flattenRoutes(route.children, fullPath))
  }
  return rows
}

function parseBackendShells() {
  const source = fs.readFileSync(backendEnumFile, 'utf8')
  const shells = []
  const pattern = /^\s*([A-Z_]+)\("([A-Z_]+)",\s*"([^"]+)",\s*"([^"]+)"\)[,;]/gm
  let match = pattern.exec(source)
  while (match) {
    shells.push({ enumName: match[1], code: match[2], label: match[3], defaultRoute: match[4] })
    match = pattern.exec(source)
  }
  invariant(shells.length > 0, '未从 PortfolioWorkShellEnum 解析到工作壳')
  return shells
}

function parseFrontendShellUnion() {
  const source = fs.readFileSync(portfolioTypesFile, 'utf8')
  const match = source.match(
    /export type PortfolioWorkShellCode([\s\S]*?)(?=export interface PortfolioReviewAccessScopeVO)/,
  )
  invariant(match, '未找到 PortfolioWorkShellCode 类型合同')
  return [...match[1].matchAll(/'([A-Z_]+)'/g)].map((item) => item[1])
}

function parseAcceptedSessionShells() {
  const source = fs.readFileSync(reviewAccessFile, 'utf8')
  const sourceFile = ts.createSourceFile(
    reviewAccessFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const accepted = new Set()
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'isPortfolioWorkShellCode') {
      function collect(child) {
        if (ts.isStringLiteral(child) && /^[A-Z_]+$/.test(child.text)) accepted.add(child.text)
        ts.forEachChild(child, collect)
      }
      collect(node)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return [...accepted]
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\|').replaceAll('\n', '<br>')
}

const backendShells = parseBackendShells()
const backendShellCodes = backendShells.map((shell) => shell.code)
const frontendShellCodes = parseFrontendShellUnion()
const acceptedSessionShells = parseAcceptedSessionShells()
const routeEvaluator = createStaticEvaluator(routeFile, { PORTFOLIO_ROUTE_PREFIX: '/portfolio' })
const routeTree = routeEvaluator.evaluate('portfolioRoutes')
invariant(Array.isArray(routeTree), 'portfolioRoutes 未解析为数组')
const routes = flattenRoutes(routeTree)
const namedRoutes = routes.filter((route) => typeof route.name === 'string')
const visibleMenuRoutes = routes.filter((route) => route.meta?.hideInMenu === false)

invariant(
  sameSet(backendShellCodes, frontendShellCodes),
  `前后端工作壳编码不一致：backend=${backendShellCodes.join(',')} frontend=${frontendShellCodes.join(',')}`,
)
invariant(
  sameSet(backendShellCodes, acceptedSessionShells),
  `会话工作壳白名单不一致：backend=${backendShellCodes.join(',')} session=${acceptedSessionShells.join(',')}`,
)
invariant(
  new Set(namedRoutes.map((route) => route.name)).size === namedRoutes.length,
  'portfolio 路由 name 存在重复',
)
invariant(
  new Set(namedRoutes.map((route) => route.fullPath)).size === namedRoutes.length,
  'portfolio 命名路由 path 存在重复',
)

for (const shell of backendShells) {
  const defaultRoute = namedRoutes.find((route) => route.fullPath === shell.defaultRoute)
  invariant(defaultRoute, `工作壳 ${shell.code} 默认路由不存在：${shell.defaultRoute}`)
  invariant(
    defaultRoute.meta?.hideInMenu === false,
    `工作壳 ${shell.code} 默认路由不是可见菜单：${shell.defaultRoute}`,
  )
  invariant(
    Array.isArray(defaultRoute.meta?.portfolioWorkShells)
    && defaultRoute.meta.portfolioWorkShells.length === 1
    && defaultRoute.meta.portfolioWorkShells[0] === shell.code,
    `工作壳 ${shell.code} 默认路由归属错误：${shell.defaultRoute}`,
  )
}

for (const route of visibleMenuRoutes) {
  const owners = route.meta?.portfolioWorkShells
  invariant(
    Array.isArray(owners) && owners.length === 1,
    `可见菜单必须且只能归属一个工作壳：${route.fullPath}`,
  )
  invariant(
    backendShellCodes.includes(owners[0]),
    `可见菜单使用未知工作壳 ${owners[0]}：${route.fullPath}`,
  )
  invariant(typeof route.name === 'string', `可见菜单缺少命名路由：${route.fullPath}`)
}

const shellRows = backendShells.map((shell) => {
  const shellRoutes = visibleMenuRoutes.filter(
    (route) => route.meta.portfolioWorkShells[0] === shell.code,
  )
  invariant(shellRoutes.length > 0, `工作壳没有可见菜单：${shell.code}`)
  return { ...shell, routes: shellRoutes }
})

const reviewAccessSource = fs.readFileSync(reviewAccessFile, 'utf8')
const routeStoreSource = fs.readFileSync(routeStoreFile, 'utf8')
invariant(
  reviewAccessSource.includes('scope?.workShellRoutes?.[workShell]'),
  '切壳逻辑未从服务端 workShellRoutes 读取目标路由',
)
invariant(
  reviewAccessSource.includes('scope?.availableWorkShells?.includes(workShell)'),
  '切壳逻辑未校验服务端 availableWorkShells',
)
invariant(
  reviewAccessSource.includes('sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_STORAGE_KEY)'),
  '权限投影重置未清理工作壳编码',
)
invariant(
  reviewAccessSource.includes('sessionStorage.removeItem(PORTFOLIO_WORK_SHELL_ROUTE_STORAGE_KEY)'),
  '权限投影重置未清理工作壳路由',
)
invariant(
  routeStoreSource.includes('userStore.userInfo.permissionVersion'),
  '菜单 Store 未监听服务端 permissionVersion',
)
invariant(routeStoreSource.includes('void generateMenus()'), '权限版本变化未触发整表菜单重建')

const lines = [
  '# 教学档案袋路由与菜单投影自动验证',
  '',
  '> 状态：已通过。该文件由 `edu-practice-mark-vue/scripts/verify-portfolio-route-projection.mjs` 从 live TypeScript 路由、前端工作壳合同与后端 Java 枚举生成。',
  `> 当前基线：${namedRoutes.length} 个命名路由，${visibleMenuRoutes.length} 个可见菜单，${backendShells.length} 个服务端工作壳。`,
  '> 范围：静态合同、菜单归属、默认入口、会话白名单、撤权缓存清理与 permissionVersion 重建；真实角色页面渲染和浏览器交互由真机验收负责。',
  '',
  '## 1. 工作壳投影',
  '',
  '| 服务端编码 | 名称 | 默认路由 | 可见菜单数 | 菜单分组 |',
  '|---|---|---|---:|---|',
  ...shellRows.map((shell) => {
    const groups = [
      ...new Set(shell.routes.map((route) => route.meta?.menuGroupTitle).filter(Boolean)),
    ]
    return `| \`${shell.code}\` | ${markdownCell(shell.label)} | \`${shell.defaultRoute}\` | ${shell.routes.length} | ${markdownCell(groups.join('、') || '未分组')} |`
  }),
  '',
  '## 2. 自动门禁',
  '',
  '- [x] 后端 `PortfolioWorkShellEnum`、前端 `PortfolioWorkShellCode` 与会话白名单编码完全一致。',
  '- [x] 每个服务端默认路由均存在、可见，且只归属于对应工作壳。',
  '- [x] 每个可见菜单均有且只有一个服务端工作壳归属。',
  '- [x] 命名路由的 name 与 path 均无重复。',
  '- [x] 切壳目标只从服务端 `availableWorkShells + workShellRoutes` 读取。',
  '- [x] 权限投影重置会清理旧工作壳编码和路由。',
  '- [x] `permissionVersion` 变化触发完整菜单重建。',
  '',
  '## 3. 真机验收边界',
  '',
  '- [ ] 四角色实际登录后的菜单可见性、切壳跳转、刷新恢复与撤权后重建。',
  '- [ ] 1440 / 1280 / 1024 / 768 分辨率、键盘焦点和关键业务交互。',
]

fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8')
process.stdout.write(
  `verified ${path.relative(projectRoot, outputFile)}: ${namedRoutes.length} routes, ${visibleMenuRoutes.length} menus, ${backendShells.length} shells\n`,
)
