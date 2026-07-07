'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { graphql, LANGUAGES_QUERY, SEARCH_WORDS_QUERY, COMPARE_WORD_QUERY, WORD_QUERY, WORDS_QUERY } from '@/lib/graphql'
import type { Language, Word, Translation } from '@/lib/types'
import { useSearchStore, TransResult } from '@/store/useSearchStore'
import Loader from '@/components/Loader'

const PAGE_SIZE = 50

export default function HomePage() {
  const {
    languages, setLanguages, tab, setTab, loading, setLoading, error, setError,
    hasLoadedLangs, setHasLoadedLangs,
    query, setQuery, selectedLang, setSelectedLang, results, setResults, translations, setTranslations, searching, setSearching,
    transWord, setTransWord, transTargets, setTransTargets, transResults, setTransResults, translating, setTranslating,
    browseLang, setBrowseLang, browseWords, setBrowseWords, browseTotal, setBrowseTotal, browsePage, setBrowsePage, browseLoading, setBrowseLoading
  } = useSearchStore()

  const nonEnglishLangs = languages.filter((l) => l.code !== 'en')

  // Load languages on mount
  useEffect(() => {
    if (hasLoadedLangs) return
    graphql<{ languages: Language[] }>(LANGUAGES_QUERY)
      .then((data) => {
        setLanguages(data.languages)
        // Default: start with no languages selected
        setTransTargets(new Set())
        setHasLoadedLangs(true)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [hasLoadedLangs, setLanguages, setTransTargets, setHasLoadedLangs, setError, setLoading])

  // ── Browse: load words when language changes ──
  useEffect(() => {
    if (!browseLang || browseWords.length > 0 || browseTotal >= 0) return
    setBrowseLoading(true)
    graphql<{ words: Word[]; wordCount: number }>(WORDS_QUERY, {
      langCode: browseLang, offset: 0, limit: PAGE_SIZE
    }).then((data) => {
      setBrowseWords(data.words)
      setBrowseTotal(data.wordCount)
    }).catch(() => {}).finally(() => setBrowseLoading(false))
  }, [browseLang, browseWords.length, browseTotal, setBrowseLoading, setBrowseWords, setBrowseTotal])

  const langMapById = new Map(languages.map((l) => [l.id, l]))

  // ── Search handler ──
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

      const lMap = new Map(languages.map((l) => [l.id, l]))
      const enriched = data.searchWords.map((w) => ({
        ...w,
        langName: lMap.get(w.languageId)?.name,
        langCode: lMap.get(w.languageId)?.code,
      }))

      setResults(enriched)

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
  }, [query, selectedLang, languages, setSearching, setError, setTranslations, setResults])

  // ── Translate handler ──
  const handleTranslate = useCallback(async () => {
    const trimmed = transWord.trim()
    if (!trimmed || transTargets.size === 0) return

    setTranslating(true)
    setError(null)
    setTransResults([])

    try {
      const data = await graphql<{ searchWords: Word[] }>(SEARCH_WORDS_QUERY, {
        query: trimmed,
        langCode: 'en',
      })

      if (data.searchWords.length === 0) {
        setError(`"${trimmed}" was not found in the dictionary.`)
        return
      }

      const exactMatches = data.searchWords.filter(
        (w) => w.text.toLowerCase() === trimmed.toLowerCase()
      )

      if (exactMatches.length === 0) {
        setError(`"${trimmed}" was not found in the dictionary.`)
        return
      }

      const targetCodes = [...transTargets]
      const batch = exactMatches.slice(0, 5)
      const tResults: TransResult[] = []

      await Promise.allSettled(
        batch.map(async (w) => {
          const tData = await graphql<{ compareWord: Translation[] }>(COMPARE_WORD_QUERY, {
            wordId: w.id,
            targetLangs: targetCodes,
          })

          await Promise.allSettled(
            tData.compareWord.map(async (t) => {
              const twData = await graphql<{ word: Word | null }>(WORD_QUERY, { id: t.targetWordId })
              const targetLang = twData.word ? langMapById.get(twData.word.languageId) : null
              tResults.push({
                source: w.text,
                target: twData.word?.text || '—',
                lang: targetLang ? `${targetLang.name} (${targetLang.code})` : '—',
                meaning: t.meaning || undefined,
                example: t.exampleUsage || undefined,
              })
            })
          )
        })
      )

      // Sort by language name
      tResults.sort((a, b) => a.lang.localeCompare(b.lang))
      setTransResults(tResults)
      if (tResults.length === 0) {
        setError(`No translations found for "${trimmed}" in the selected languages.`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }, [transWord, transTargets, langMapById, setTranslating, setError, setTransResults])

  const toggleTransLang = (code: string) => {
    const next = new Set(transTargets)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setTransTargets(next)
  }

  const selectAllLangs = () => {
    setTransTargets(new Set(nonEnglishLangs.map((l) => l.code)))
  }

  const selectNoLangs = () => {
    setTransTargets(new Set())
  }

  // Group translate results by language
  const groupedByLang = (): Map<string, TransResult[]> => {
    const grouped = new Map<string, TransResult[]>()
    for (const r of transResults) {
      if (!grouped.has(r.lang)) grouped.set(r.lang, [])
      grouped.get(r.lang)!.push(r)
    }
    return grouped
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
        <Image src="/logo.jpg" alt="OziTuma Dictionary Logo" width={80} height={80} className="site-logo" style={{ borderRadius: '12px', marginBottom: '16px' }} />
        <h1>OziTuma Dictionary</h1>
        <p>Search and compare words across 18+ African indigenous languages</p>
      </header>

      {/* ── Tab switcher ── */}
      <div className="tabs">
        <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
          🔍 Search
        </button>
        <button className={`tab ${tab === 'translate' ? 'active' : ''}`} onClick={() => setTab('translate')}>
          🌐 Translate
        </button>
        <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          📖 Browse
        </button>
      </div>

      {/* ── SEARCH TAB ── */}
      {tab === 'search' && (
        <>
          <div className="search-section">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search any word…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

          {loading && <Loader type="card-skeleton" count={3} />}

          {!loading && !searching && results.length === 0 && !error && (
            <div className="no-results">
              <div className="no-results-icon">📖</div>
              <p>Type a word above and press <strong>Search</strong><br />to look up translations across African languages</p>
            </div>
          )}

          {searching && <Loader type="card-skeleton" count={3} />}

          {results.length > 0 && !searching && (
            <div className="results">
              {results.map((word) => {
                const grouped = groupedTranslations(word.id)
                return (
                  <Link key={word.id} href={`/word?id=${word.id}`} className="word-card">
                    <div className="word-card-header">
                      <span className="word-text">{word.text}</span>
                      <span className="word-lang-badge">{word.langName || word.langCode}</span>
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
                            +{grouped.size - 4} more
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TRANSLATE TAB ── */}
      {tab === 'translate' && (
        <>
          <div className="search-section">
            <div className="search-wrapper">
              <span className="search-icon">🌐</span>
              <input
                className="search-input"
                type="text"
                placeholder="English word…"
                value={transWord}
                onChange={(e) => setTransWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                autoFocus
              />
            </div>
            <div className="translate-btn-row">
              <button className="search-btn" onClick={handleTranslate} disabled={translating || !transWord.trim() || transTargets.size === 0} style={{ flex: 1 }}>
                {translating ? 'Translating…' : 'Translate'}
              </button>
            </div>
          </div>

          <div className="lang-section">
            <div className="lang-label">
              Translate to
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {' · '}
                <button className="picker-btn" onClick={selectAllLangs}>All</button>
                {' / '}
                <button className="picker-btn" onClick={selectNoLangs}>None</button>
                {' · '} {transTargets.size} selected
              </span>
            </div>
            <div className="lang-chips">
              {nonEnglishLangs.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-chip ${transTargets.has(lang.code) ? 'active' : ''}`}
                  onClick={() => toggleTransLang(lang.code)}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {translating && <Loader type="card-skeleton" count={3} />}

          {!translating && transResults.length === 0 && !error && (
            <div className="no-results">
              <div className="no-results-icon">🌐</div>
              <p>Type an English word, select target languages,<br />then press <strong>Translate</strong></p>
            </div>
          )}

          {transResults.length > 0 && !translating && (
            <div className="results">
              <div className="trans-header">
                <span className="trans-label-results">
                  Results for &ldquo;{transWord}&rdquo; ({transResults.length} translation{transResults.length > 1 ? 's' : ''})
                </span>
              </div>
              {Array.from(groupedByLang().entries()).map(([langName, entries]) => (
                <div key={langName}>
                  <div className="trans-lang-header">{langName}</div>
                  {entries.map((r, i) => (
                     <div key={i} className="trans-card">
                      <div className="trans-pair">
                        <span className="trans-source">{r.source}</span>
                        <span className="trans-arrow">→</span>
                        <span className="trans-target-word">{r.target}</span>
                      </div>
                      {r.meaning && <div className="trans-meaning">{r.meaning}</div>}
                      {r.example && <div className="trans-example">&ldquo;{r.example}&rdquo;</div>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        <>
          <div className="lang-section">
            <div className="lang-label">Dictionary</div>
            <select
              className="browse-select"
              value={browseLang}
              onChange={(e) => {
                setBrowseLang(e.target.value)
                setBrowsePage(0)
                setBrowseWords([])
                setBrowseTotal(-1)
              }}
            >
              <option value="">Select a language…</option>
              {nonEnglishLangs.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>

          {browseLang && browseLoading && <Loader type="card-skeleton" count={3} />}

          {browseLang && !browseLoading && browseWords.length === 0 && (
            <div className="no-results">
              <div className="no-results-icon">📖</div>
              <p>Select a language above to browse its dictionary.</p>
            </div>
          )}

          {browseLang && (
            <>
              <div style={{ padding: '0 1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {browseTotal > 0 ? `${browseTotal} words` : ''}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="pagination-btn"
                    disabled={browsePage === 0}
                    onClick={async () => {
                      const pg = browsePage - 1
                      setBrowsePage(pg)
                      setBrowseLoading(true)
                      const data = await graphql<{ words: Word[]; wordCount: number }>(WORDS_QUERY, {
                        langCode: browseLang, offset: pg * PAGE_SIZE, limit: PAGE_SIZE
                      })
                      setBrowseWords(data.words)
                      setBrowseTotal(data.wordCount)
                      setBrowseLoading(false)
                    }}
                  >← Prev</button>
                  <button
                    className="pagination-btn"
                    disabled={(browsePage + 1) * PAGE_SIZE >= browseTotal}
                    onClick={async () => {
                      const pg = browsePage + 1
                      setBrowsePage(pg)
                      setBrowseLoading(true)
                      const data = await graphql<{ words: Word[]; wordCount: number }>(WORDS_QUERY, {
                        langCode: browseLang, offset: pg * PAGE_SIZE, limit: PAGE_SIZE
                      })
                      setBrowseWords(data.words)
                      setBrowseTotal(data.wordCount)
                      setBrowseLoading(false)
                    }}
                  >Next →</button>
                </div>
              </div>

              {!browseLoading && (
                <div className="results">
                  {browseWords.map((w) => (
                    <Link key={w.id} href={`/word?id=${w.id}`} className="word-card" style={{ padding: '0.75rem 1rem' }}>
                      <div className="word-card-header">
                        <span className="word-text" style={{ fontSize: '0.95rem' }}>{w.text}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <footer className="footer">
        {languages.length} African languages · OziTuma Dictionary
      </footer>
    </div>
  )
}
