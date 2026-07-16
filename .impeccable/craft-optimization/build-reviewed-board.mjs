import fs from 'node:fs'
import path from 'node:path'

const root = import.meta.dirname
const registry = JSON.parse(
  fs.readFileSync(path.join(root, 'VUE_FILE_CRAFT_REGISTRY.json'), 'utf8'),
)
const components = JSON.parse(
  fs.readFileSync(path.join(root, 'COMPONENT_CRAFT_AUDIT.json'), 'utf8'),
)
const template = fs.readFileSync(path.join(root, 'reviewed-board.template.html'), 'utf8')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function statusClass(value) {
  if (value === 'P0' || value === 'REWORK') return 'danger'
  if (value === 'P1' || value === 'TUNE') return 'warning'
  if (value === 'HOLD') return 'hold'
  return ''
}

function renderFileRows() {
  return registry.files
    .map((item) => {
      const query = [
        item.path,
        item.domain,
        item.surface,
        item.responsibility,
        item.action,
        item.avoid,
      ]
        .concat(item.evidence)
        .join(' ')
      return (
        '<tr data-level="'
        + item.priority
        + '" data-domain="'
        + escapeHtml(item.domain)
        + '" data-query="'
        + escapeHtml(query)
        + '">'
        + '<td><span class="status '
        + statusClass(item.priority)
        + '">'
        + item.priority
        + '</span></td>'
        + '<td><code>'
        + escapeHtml(item.path)
        + '</code></td>'
        + '<td>'
        + escapeHtml(item.evidence.join('；'))
        + '</td>'
        + '<td><strong>'
        + escapeHtml(item.responsibility)
        + '</strong><br>'
        + escapeHtml(item.action)
        + '<br><span class="avoid">禁止：'
        + escapeHtml(item.avoid)
        + '</span></td>'
        + '</tr>'
      )
    })
    .join('\n')
}

function renderComponentRows() {
  return components.all
    .map((item) => {
      const review = item.review
      const query = [
        item.path,
        item.name,
        item.package,
        review.responsibility,
        review.action,
        review.avoid,
      ]
        .concat(review.evidence)
        .join(' ')
      return (
        '<tr data-level="'
        + item.status
        + '" data-domain="'
        + escapeHtml(item.package)
        + '" data-query="'
        + escapeHtml(query)
        + '">'
        + '<td><span class="status '
        + statusClass(item.status)
        + '">'
        + item.status
        + '</span></td>'
        + '<td><strong>'
        + escapeHtml(item.name)
        + '</strong><br><code>'
        + escapeHtml(item.path)
        + '</code></td>'
        + '<td class="number">'
        + item.ref_total
        + '</td>'
        + '<td>'
        + escapeHtml(review.evidence.join('；'))
        + '</td>'
        + '<td><strong>'
        + escapeHtml(review.responsibility)
        + '</strong><br>'
        + escapeHtml(review.action)
        + '<br><span class="avoid">禁止：'
        + escapeHtml(review.avoid)
        + '</span></td>'
        + '</tr>'
      )
    })
    .join('\n')
}

const fileCounts = registry.summary.byPriority
const componentCounts = components.summary.byStatus
const replacements = {
  __FILE_TOTAL__: registry.summary.total,
  __COMPONENT_TOTAL__: components.summary.totalComponents,
  __FILE_P0__: fileCounts.P0 || 0,
  __FILE_P1__: fileCounts.P1 || 0,
  __COMP_REWORK__: componentCounts.REWORK || 0,
  __COMP_TUNE__: componentCounts.TUNE || 0,
  __COMP_DEAD__: componentCounts.DEAD || 0,
  __COMP_HOLD__: componentCounts.HOLD || 0,
  __FILE_ROWS__: renderFileRows(),
  __COMPONENT_ROWS__: renderComponentRows(),
}

let board = template
for (const [placeholder, value] of Object.entries(replacements)) {
  board = board.replaceAll(placeholder, String(value))
}
fs.writeFileSync(path.join(root, 'craft-board-hi-fi.html'), board)
console.warn(
  JSON.stringify(
    { files: registry.summary.total, components: components.summary.totalComponents },
    null,
    2,
  ),
)
