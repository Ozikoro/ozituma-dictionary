const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || '/api/graphql'

const CACHE_KEY = 'ozituma_languages_cache'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

export async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  // Check if this is the languages query and we are on the client side
  const isLanguagesQuery = query.includes('query Languages {')
  
  if (isLanguagesQuery && typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed.data as T
        }
      } catch (e) {
        // Ignore parsing errors and proceed to fetch
      }
    }
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.statusText}`)
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'GraphQL error')
  }

  // Cache the result for the languages query
  if (isLanguagesQuery && typeof window !== 'undefined') {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: json.data,
    }))
  }

  return json.data as T
}

export const LANGUAGES_QUERY = `
  query Languages {
    languages {
      id
      code
      name
    }
  }
`

export const SEARCH_WORDS_QUERY = `
  query SearchWords($query: String!, $langCode: String) {
    searchWords(query: $query, langCode: $langCode) {
      id
      languageId
      text
    }
  }
`

export const WORD_QUERY = `
  query Word($id: UUID!) {
    word(id: $id) {
      id
      languageId
      text
    }
  }
`

export const WORDS_QUERY = `
  query Words($langCode: String!, $offset: Int, $limit: Int) {
    words(langCode: $langCode, offset: $offset, limit: $limit) {
      id
      text
    }
    wordCount(langCode: $langCode)
  }
`

export const COMPARE_WORD_QUERY = `
  query CompareWord($wordId: UUID!, $targetLangs: [String!]!) {
    compareWord(wordId: $wordId, targetLangs: $targetLangs) {
      id
      sourceWordId
      targetWordId
      meaning
      exampleUsage
    }
  }
`
