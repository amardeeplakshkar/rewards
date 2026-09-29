export interface RequestMeta {
  ip: string
  userAgent: string
  device: string
}

export function getClientIp(headers: Headers): string {
  // NOTE: your reverse proxy / load balancer MUST overwrite x-forwarded-for, otherwise clients can spoof it.
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? '0.0.0.0'
}

function deviceFromUa(ua: string): string {
  const u = ua.toLowerCase()
  if (!u) return 'unknown'
  const os = /android/.test(u) ? 'Android' : /iphone|ipad|ios/.test(u) ? 'iOS' : /windows/.test(u) ? 'Windows' : /mac os/.test(u) ? 'macOS' : /linux/.test(u) ? 'Linux' : 'Other'
  const browser = /edg\//.test(u) ? 'Edge' : /chrome\//.test(u) ? 'Chrome' : /firefox\//.test(u) ? 'Firefox' : /safari\//.test(u) ? 'Safari' : 'Other'
  const kind = /mobile|android|iphone/.test(u) ? 'mobile' : 'desktop'
  return `${os}/${browser}/${kind}`
}

export function getRequestMeta(headers: Headers): RequestMeta {
  const userAgent = (headers.get('user-agent') ?? '').slice(0, 300)
  return { ip: getClientIp(headers), userAgent, device: deviceFromUa(userAgent) }
}
