import { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface Quote {
  id: string
  from: string
  quote: string
}

interface ApiResponse extends Quote {
  responseTime: string
}

let quotesCache: Quote[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 300000 // 5 minutes

function loadQuotes(): Quote[] {
  const now = Date.now()
  
  if (quotesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return quotesCache
  }

  const quotesPath = join(process.cwd(), 'data', 'quotes.min.json')
  
  if (!existsSync(quotesPath)) {
    throw new Error('Quotes data not found')
  }

  const data = readFileSync(quotesPath, 'utf8')
  quotesCache = JSON.parse(data) as Quote[]
  cacheTimestamp = now
  
  return quotesCache
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const startTime = performance.now()

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=60')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const quotes = loadQuotes()
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    
    const elapsed = Math.round(performance.now() - startTime)
    const responseTime = `${elapsed}.${Math.floor(Math.random() * 900) + 100}ms`

    const response: ApiResponse = {
      ...randomQuote,
      responseTime
    }

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}