export function resolveAppPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const segment = path.startsWith('/') ? path.slice(1) : path
  return `${base}${segment}`.replace(/\/{2,}/g, '/')
}

export function isLoginPath(pathname: string): boolean {
  return pathname.endsWith('/login') || pathname.endsWith('/login/')
}
