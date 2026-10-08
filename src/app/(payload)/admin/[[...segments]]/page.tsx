import type { Metadata } from 'next'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

const getPayloadConfig = async () => (await import('@payload-config')).default

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  const config = await getPayloadConfig()
  return generatePageMetadata({ config: config as any, params, searchParams })
}

const Page = async ({ params, searchParams }: Args) => {
  const config = await getPayloadConfig()
  return RootPage({ config: config as any, params, searchParams, importMap })
}

export default Page
