import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'

const getPayloadConfig = async () => (await import('@payload-config')).default

export const GET = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_GET(config as any)(request, args)
}
export const POST = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_POST(config as any)(request, args)
}
export const DELETE = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_DELETE(config as any)(request, args)
}
export const PATCH = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_PATCH(config as any)(request, args)
}
export const PUT = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_PUT(config as any)(request, args)
}
export const OPTIONS = async (request: Request, args: { params: Promise<{ slug?: string[] }> }) => {
  const config = await getPayloadConfig()
  return REST_OPTIONS(config as any)(request, args)
}
