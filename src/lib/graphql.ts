const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || '/api/graphql'

export async function graphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
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
