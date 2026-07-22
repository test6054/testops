$files = @(
  'teacher-evaluation.vue','teacher-materials.vue','teacher-archive.vue',
  'teacher-profile.vue','teacher-course-archive.vue','teacher-honor.vue',
  'teacher-extension-activity.vue','teacher-one-table.vue','teacher-library-admin.vue',
  'teacher-teaching-philosophy.vue','teacher-home.vue'
)
$dir = 'D:/work/nybc-practice/edu-practice-mark-vue/src/views/portfolio'
foreach ($f in $files) {
  $path = Join-Path $dir $f
  $content = Get-Content $path -Raw -Encoding utf8
  $cols = [regex]::Matches($content, "title:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
  # action labels: UiTableActions items often have label: '...'
  $actions = [regex]::Matches($content, "label:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  Write-Output ("=== {0} ===" -f $f)
  Write-Output ("COLS: " + ($cols -join ' | '))
  Write-Output ("ACTION-LABELS: " + ($actions -join ' | '))
}
