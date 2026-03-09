import { NextRequest, NextResponse } from 'next/server'
import { put, list, getDownloadUrl } from '@vercel/blob'

const BLOB_PATH = 'portfolio/state.json'
const EMPTY = { portfolios: [], holdings: [] }

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'portfolio/state' })
    const blob = blobs[0]
    if (!blob) return NextResponse.json(EMPTY)

    // Private blob — use getDownloadUrl for a temporary signed URL
    const downloadUrl = await getDownloadUrl(blob.url)
    const res = await fetch(downloadUrl, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json(EMPTY)
    return NextResponse.json(await res.json())
  } catch (e) {
    console.error('GET /api/data error:', e)
    return NextResponse.json(EMPTY, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const blob = await put(BLOB_PATH, JSON.stringify(body), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
    })
    return NextResponse.json({ ok: true, url: blob.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('POST /api/data error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
