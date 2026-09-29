import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

/** Extracts plain text from a Lexical richText JSON tree (best-effort, headings/paragraphs/lists only). */
function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { type?: string; text?: string; children?: unknown[] }
  if (typeof n.text === 'string') return n.text
  const childText = (n.children ?? []).map(extractText).join('')
  if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'listitem') return childText + '\n\n'
  return childText
}

export async function GET() {
  const payload = await getPayloadClient()
  const legal = await payload.findGlobal({ slug: 'legal-settings', overrideAccess: true, depth: 0 })
  const toText = (rt: unknown) => {
    const root = (rt as { root?: { children?: unknown[] } } | null | undefined)?.root
    if (!root?.children?.length) return ''
    return root.children.map(extractText).join('').trim()
  }
  return NextResponse.json({
    ok: true,
    data: {
      terms: toText(legal.terms),
      privacyPolicy: toText(legal.privacyPolicy),
      refundPolicy: toText(legal.refundPolicy),
      responsibleUse: toText(legal.responsibleUse),
    },
  })
}