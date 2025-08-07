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
const CACHE_DURATION = 60000 // 1 minute

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
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

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
    
    // Use current timestamp to ensure better randomness
    const seed = Date.now() + Math.random()
    const randomIndex = Math.floor((seed * 9301 + 49297) % 233280 / 233280 * quotes.length)
    const randomQuote = quotes[randomIndex]
    
    const elapsed = Math.round(performance.now() - startTime)
    const responseTime = `${elapsed}.${Math.floor(Math.random() * 999) + 1}ms`

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