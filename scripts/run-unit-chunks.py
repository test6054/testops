#!/usr/bin/env python3
"""Reliable chunked vitest runner with per-chunk timeout and summary JSON."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path('/Users/qingzhi/Documents/work/nybc-practice/edu-practice-mark-vue')
VITEST = ROOT / 'node_modules' / '.bin' / 'vitest'
OUT_DIR = Path('/tmp/markvue-chunks')
SUMMARY = Path('/tmp/markvue-chunks-summary.json')
MASTER = Path('/tmp/markvue-chunks-master.log')
CHUNK = 25
MAX_WORKERS = '1'
TIMEOUT_S = 480

MODULES = [
    ('enums', 'tests/unit/types/enums'),
    ('utils', 'tests/unit/utils'),
    ('constants', 'tests/unit/constants'),
    ('apis', 'tests/unit/apis'),
    ('stores', 'tests/unit/stores'),
    ('composables', 'tests/unit/composables'),
    ('hooks', 'tests/unit/hooks'),
    ('wire', 'tests/unit/wire'),
    ('config', 'tests/unit/config'),
    ('router', 'tests/unit/router'),
    ('layout', 'tests/unit/layout'),
    ('plugins', 'tests/unit/plugins'),
    ('components', 'tests/unit/components'),
    ('views', 'tests/unit/views'),
]

env = os.environ.copy()
env['PATH'] = '/Users/qingzhi/Library/pnpm:/usr/local/bin:' + env.get('PATH', '')


def log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with MASTER.open('a', encoding='utf-8') as f:
        f.write(line + '\n')


def collect_specs(target: str) -> list[str]:
    p = ROOT / target
    if p.is_file():
        return [str(p.relative_to(ROOT))]
    if not p.exists():
        return []
    return sorted(str(x.relative_to(ROOT)) for x in p.rglob('*.spec.ts'))


def collect_types_other() -> list[str]:
    base = ROOT / 'tests/unit/types'
    if not base.exists():
        return []
    return sorted(
        str(x.relative_to(ROOT))
        for x in base.rglob('*.spec.ts')
        if '/enums/' not in str(x)
    )


def run_chunk(name: str, files: list[str]) -> dict:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUT_DIR / f'{name}.json'
    log_path = OUT_DIR / f'{name}.log'
    if json_path.exists():
        json_path.unlink()
    cmd = [
        str(VITEST), 'run', *files,
        '--maxWorkers', MAX_WORKERS,
        '--reporter', 'default',
        '--reporter', 'json',
        '--outputFile', str(json_path),
    ]
    log(f'start {name} files={len(files)}')
    t0 = time.time()
    try:
        with log_path.open('w', encoding='utf-8') as lf:
            proc = subprocess.run(
                cmd, cwd=str(ROOT), env=env,
                stdout=lf, stderr=subprocess.STDOUT,
                timeout=TIMEOUT_S,
            )
        code = proc.returncode
    except subprocess.TimeoutExpired:
        code = 124
        with log_path.open('a', encoding='utf-8') as lf:
            lf.write(f'\nTIMEOUT after {TIMEOUT_S}s\n')
        log(f'TIMEOUT {name}')
    row = {
        'name': name,
        'exit': code,
        'files': len(files),
        'durationSec': round(time.time() - t0, 1),
    }
    if json_path.exists() and json_path.stat().st_size > 20:
        try:
            data = json.loads(json_path.read_text(encoding='utf-8'))
            row.update({
                'success': data.get('success'),
                'pass': data.get('numPassedTests'),
                'fail': data.get('numFailedTests'),
                'total': data.get('numTotalTests'),
                'failedSuites': data.get('numFailedTestSuites'),
            })
            fails = []
            for s in data.get('testResults', []):
                if s.get('status') == 'failed':
                    n = s.get('name', '')
                    fails.append(n.split('tests/unit/')[-1] if 'tests/unit/' in n else n)
            row['failedFiles'] = fails[:80]
        except Exception as e:
            row['parseError'] = str(e)
            row['success'] = False
    else:
        row['success'] = False
        row['parseError'] = 'missing json'
    log(f'done {name} {row}')
    return row


def main() -> int:
    MASTER.write_text('', encoding='utf-8')
    summary: list[dict] = []
    SUMMARY.write_text('[]', encoding='utf-8')

    for name, target in MODULES:
        specs = collect_specs(target)
        if not specs:
            log(f'skip empty {name}')
            continue
        for i in range(0, len(specs), CHUNK):
            chunk_files = specs[i:i + CHUNK]
            chunk_name = f'{name}_{i // CHUNK:03d}'
            row = run_chunk(chunk_name, chunk_files)
            summary.append(row)
            SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

    other = collect_types_other()
    if other:
        for i in range(0, len(other), CHUNK):
            row = run_chunk(f'types_other_{i // CHUNK:03d}', other[i:i + CHUNK])
            summary.append(row)
            SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

    top = sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'tests/unit').glob('*.spec.ts'))
    if top:
        row = run_chunk('top_level', top)
        summary.append(row)
        SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

    failed = [r for r in summary if not r.get('success')]
    log(f'ALL_DONE chunks={len(summary)} failed_chunks={len(failed)}')
    Path('/tmp/markvue-chunks.exit').write_text('0' if not failed else '1', encoding='utf-8')
    return 0 if not failed else 1


if __name__ == '__main__':
    sys.exit(main())
