'use client'

import { useState, useEffect, useCallback } from 'react'
import { graphql, LANGUAGES_QUERY, SEARCH_WORDS_QUERY, COMPARE_WORD_QUERY } from '@/lib/graphql'
import type { Language, Word, Translation } from '@/lib/types'

export default function HomePage() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [query, setQuery] = useState('')
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [results, setResults] = useState<WordWithLang[]>([])
  const [translations, setTranslations] = useState<Map<string, Translation[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  type WordWithLang = Word & { langName?: string; langCode?: string }

  // Load languages on mount
  useEffect(() => {
    graphql<{ languages: Language[] }>(LANGUAGES_QUERY)
      .then((data) => setLanguages(data.languages))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Search handler
  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSearching(true)
    setError(null)
    setTranslations(new Map())

    try {
      const data = await graphql<{ searchWords: Word[] }>(SEARCH_WORDS_QUERY, {
        query: trimmed,
        langCode: selectedLang || null,
      })

      // Attach language info
      const langMap = new Map(languages.map((l) => [l.id, l]))
      const enriched = data.searchWords.map((w) => ({
        ...w,
        langName: langMap.get(w.languageId)?.name,
        langCode: langMap.get(w.languageId)?.code,
      }))

      setResults(enriched)

      // Fetch translations for each result (compare against all other languages)
      if (enriched.length > 0) {
        const allCodes = languages.filter((l) => l.code !== enriched[0]?.langCode).map((l) => l.code)
        const tMap = new Map<string, Translation[]>()

        // Limit to first 10 results to avoid hammering the API
        const batch = enriched.slice(0, 10)
        const tResults = await Promise.allSettled(
          batch.map((w) =>
            graphql<{ compareWord: Translation[] }>(COMPARE_WORD_QUERY, {
              wordId: w.id,
              targetLangs: allCodes,
            }).then((d) => ({ wordId: w.id, translations: d.compareWord }))
          )
        )

        for (const r of tResults) {
          if (r.status === 'fulfilled') {
            tMap.set(r.value.wordId, r.value.translations)
          }
        }
        setTranslations(tMap)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }, [query, selectedLang, languages])

  // Search on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // Group translations by target language
  const groupedTranslations = (wordId: string): Map<string, Translation[]> => {
    const tList = translations.get(wordId) || []
    const grouped = new Map<string, Translation[]>()
    for (const t of tList) {
      const key = t.targetWordId
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(t)
    }
    return grouped
  }

  const langByCode = (code: string) => languages.find((l) => l.code === code)

  return (
    <div className="container">
      <header className="header">
        <h1>OziTuma Dictionary</h1>
        <p>Search and compare words across 18+ African indigenous languages</p>
      </header>

      <div className="search-section">
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            placeholder="Search any word…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="btn" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Language filter chips */}
        <div className="lang-chips">
          <span
            className={`lang-chip ${selectedLang === null ? 'active' : ''}`}
            onClick={() => setSelectedLang(null)}
          >
            All Languages
          </span>
          {languages.map((lang) => (
            <span
              key={lang.code}
              className={`lang-chip ${selectedLang === lang.code ? 'active' : ''}`}
              onClick={() => setSelectedLang(selectedLang === lang.code ? null : lang.code)}
            >
              {lang.name}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="results">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}

      {!loading && !searching && results.length === 0 && !error && (
        <div className="no-results">
          <p>Type a word above and press Search to find translations</p>
        </div>
      )}

      {searching && (
        <div className="results">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      )}

      {results.length > 0 && !searching && (
        <div className="results">
          {results.map((word) => {
            const grouped = groupedTranslations(word.id)

            return (
              <a
                key={word.id}
                href={`/word/${word.id}`}
                className="word-card"
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div className="word-card-header">
                  <span className="word-text">{word.text}</span>
                  <span className="word-language">
                    {word.langName || word.langCode}
                  </span>
                </div>

                {grouped.size > 0 && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {Array.from(grouped.entries()).slice(0, 5).map(([, tList]) => {
                      const target = tList[0]
                      return (
                        <div key={target.id} style={{ marginBottom: '0.25rem' }}>
                          {target.meaning && <span> — {target.meaning}</span>}
                        </div>
                      )
                    })}
                    {grouped.size > 5 && (
                      <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                        +{grouped.size - 5} more translations
                      </div>
                    )}
                  </div>
                )}

                {/* Target language chips */}
                {grouped.size > 0 && (
                  <div className="lang-chips" style={{ marginTop: '0.5rem' }}>
                    {Array.from(grouped.entries()).slice(0, 5).map(([, tList]) => {
                      const t = tList[0]
                      // Find the target word's language - we don't have it directly
                      // but we got translations with target_word_id
                      return (
                        <span key={t.id} className="lang-chip">
                          translation available
                        </span>
                      )
                    })}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}

      <footer className="footer">
        OziTuma Dictionary · {languages.length} African languages · {results.length > 0 ? `${results.length} results` : ''}
      </footer>
    </div>
  )
}
