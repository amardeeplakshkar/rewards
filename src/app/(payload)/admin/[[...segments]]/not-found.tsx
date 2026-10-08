import { NotFoundPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

const getPayloadConfig = async () => (await import('@payload-config')).default

const NotFound = async ({ params, searchParams }: Args) => {
  const config = await getPayloadConfig()
  return NotFoundPage({ config: config as any, params, searchParams, importMap })
}

export default NotFound
