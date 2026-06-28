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

      const langMap = new Map(languages.map((l) => [l.id, l]))
      const enriched = data.searchWords.map((w) => ({
        ...w,
        langName: langMap.get(w.languageId)?.name,
        langCode: langMap.get(w.languageId)?.code,
      }))

      setResults(enriched)

      // Fetch translations for each result
      if (enriched.length > 0) {
        const allCodes = languages.filter((l) => l.code !== enriched[0]?.langCode).map((l) => l.code)
        const tMap = new Map<string, Translation[]>()

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

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

  return (
    <div className="container">
      <header className="hero">
        <h1>OziTuma Dictionary</h1>
        <p>Search and compare words across 18+ African indigenous languages</p>
      </header>

      <div className="search-section">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search any word…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="search-btn" onClick={handleSearch} disabled={searching || !query.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      <div className="lang-section">
        <div className="lang-label">Filter by language</div>
        <div className="lang-chips">
          <button
            className={`lang-chip ${selectedLang === null ? 'active' : ''}`}
            onClick={() => setSelectedLang(null)}
          >
            All Languages
          </button>
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`lang-chip ${selectedLang === lang.code ? 'active' : ''}`}
              onClick={() => setSelectedLang(selectedLang === lang.code ? null : lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="results">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '4.5rem' }} />
          ))}
        </div>
      )}

      {!loading && !searching && results.length === 0 && !error && (
        <div className="no-results">
          <div className="no-results-icon">📖</div>
          <p>Type a word above and press <strong>Search</strong><br />to look up translations across African languages</p>
        </div>
      )}

      {searching && (
        <div className="results">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '4.5rem' }} />
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
              >
                <div className="word-card-header">
                  <span className="word-text">{word.text}</span>
                  <span className="word-lang-badge">
                    {word.langName || word.langCode}
                  </span>
                </div>

                {grouped.size > 0 && (
                  <div className="translation-preview">
                    {Array.from(grouped.entries()).slice(0, 4).map(([, tList]) => {
                      const t = tList[0]
                      return (
                        <div key={t.id} className="translation-preview-item">
                          <span className="translation-preview-lang">↗ </span>
                          {t.meaning || 'Translation available'}
                        </div>
                      )
                    })}
                    {grouped.size > 4 && (
                      <div style={{ marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        +{grouped.size - 4} more translation{grouped.size - 4 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}

      <footer className="footer">
        {languages.length} African languages · {results.length > 0 ? `${results.length} result${results.length > 1 ? 's' : ''}` : 'OziTuma Dictionary'}
      </footer>
    </div>
  )
}
