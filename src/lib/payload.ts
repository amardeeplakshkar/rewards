import { getPayload, type Payload } from 'payload'

async function loadPayloadConfig() {
  const mod = await import('@payload-config')
  return mod.default
}

/** Default Payload instance for admin and non-user system-level operations. */
export const getPayloadClient = async (): Promise<Payload> => {
  const config = await loadPayloadConfig()
  return getPayload({ config: config as any })
}

/** Separate cookie namespace for the public app auth session so it does not overwrite the admin cookie. */
export const getUserPayloadClient = async (): Promise<Payload> => {
  const config = await loadPayloadConfig()
  const userConfig = { ...(config as any), cookiePrefix: 'rw-user' }
  return getPayload({ config: userConfig as any })
}
