export function createPublicAssetUrl(path: string, basePath: string | undefined = import.meta.env.BASE_URL): string {
  const normalizedBase = basePath && basePath !== '/' ? basePath.replace(/\/?$/, '/') : '/'
  const normalizedPath = path.replace(/^\/+/, '')

  return `${normalizedBase}${normalizedPath}`
}
