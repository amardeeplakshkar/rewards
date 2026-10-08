import type { ServerFunctionClient } from 'payload'

import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'

type Args = {
  children: React.ReactNode
}

const getPayloadConfig = async () => (await import('@payload-config')).default

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  const config = await getPayloadConfig()
  return handleServerFunctions({
    ...args,
    config: config as any,
    importMap,
  })
}

const Layout = async ({ children }: Args) => {
  const config = await getPayloadConfig()
  return (
    <RootLayout config={config as any} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  )
}

export default Layout
