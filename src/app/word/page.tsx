'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { graphql, LANGUAGES_QUERY, WORD_QUERY, COMPARE_WORD_QUERY } from '@/lib/graphql'
import type { Language, Word, Translation } from '@/lib/types'

interface TranslationWithMeta extends Translation {
  targetText?: string
  targetLanguageName?: string
  targetLanguageCode?: string
}

function WordDetailContent() {
  const searchParams = useSearchParams()
  const wordId = searchParams.get('id') as string

  const [word, setWord] = useState<Word | null>(null)
  const [language, setLanguage] = useState<Language | null>(null)
  const [allTranslations, setAllTranslations] = useState<TranslationWithMeta[]>([])
  const [allLanguages, setAllLanguages] = useState<Language[]>([])
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wordId) return

    const fetchData = async () => {
      try {
        setLoading(true)

        const langData = await graphql<{ languages: Language[] }>(LANGUAGES_QUERY)
        const langMap = new Map(langData.languages.map((l) => [l.id, l]))
        setAllLanguages(langData.languages)

        const wordData = await graphql<{ word: Word | null }>(WORD_QUERY, { id: wordId })
        if (!wordData.word) {
          setError('Word not found')
          return
        }

        setWord(wordData.word)
        setLanguage(langMap.get(wordData.word.languageId) || null)

        const allCodes = langData.languages
          .filter((l) => l.id !== wordData.word!.languageId)
          .map((l) => l.code)

        const tData = await graphql<{ compareWord: Translation[] }>(COMPARE_WORD_QUERY, {
          wordId: wordId,
          targetLangs: allCodes.length > 0 ? allCodes : ['xx'],
        })

        const targetWordIds = [...new Set(tData.compareWord.map((t) => t.targetWordId))]
        const tWordTexts = new Map<string, string>()
        const tWordLangs = new Map<string, { name: string; code: string }>()

        await Promise.allSettled(
          targetWordIds.map(async (twId) => {
            const twData = await graphql<{ word: Word | null }>(WORD_QUERY, { id: twId })
            if (twData.word) {
              tWordTexts.set(twId, twData.word.text)
              const lang = langMap.get(twData.word.languageId)
              if (lang) {
                tWordLangs.set(twId, { name: lang.name, code: lang.code })
              }
            }
          })
        )

        const enriched = tData.compareWord.map((t) => ({
          ...t,
          targetText: tWordTexts.get(t.targetWordId) || undefined,
          targetLanguageName: tWordLangs.get(t.targetWordId)?.name || undefined,
          targetLanguageCode: tWordLangs.get(t.targetWordId)?.code || undefined,
        }))

        setAllTranslations(enriched)

        // Pre-select all languages that have translations
        const codesWithTranslations = new Set(
          enriched.map((t) => t.targetLanguageCode).filter(Boolean) as string[]
        )
        setSelectedCodes(codesWithTranslations)

        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load word')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [wordId])

  // Get unique languages that have translations
  const availableLangs = allLanguages.filter((l) =>
    l.id !== word?.languageId &&
    allTranslations.some((t) => t.targetLanguageCode === l.code)
  )

  // Filter translations by selected languages
  const filtered = allTranslations.filter((t) => selectedCodes.has(t.targetLanguageCode || ''))

  const toggleLang = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectAll = () => {
    setSelectedCodes(new Set(availableLangs.map((l) => l.code)))
  }

  const selectNone = () => {
    setSelectedCodes(new Set())
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ padding: '0 1rem' }}>
          <div className="skeleton" style={{ height: '1.3rem', width: '8rem', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '2.5rem', width: '16rem', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '1.2rem', width: '10rem', marginBottom: '2rem' }} />
          <div className="skeleton" style={{ height: '5rem', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '5rem', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '5rem' }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <div style={{ padding: '0 1rem' }}>
          <Link href="/" className="detail-back">← Back to search</Link>
          <div className="error-banner">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ padding: '0 1rem' }}>
        <Link href="/" className="detail-back">← Back to search</Link>
      </div>

      <div className="detail-header">
        <h2 className="detail-word">{word?.text || 'Word'}</h2>
        {language && (
          <span className="detail-lang-badge">{language.name} ({language.code})</span>
        )}
      </div>

      {/* ── Multi-language picker ── */}
      {availableLangs.length > 0 && (
        <div className="lang-section">
          <div className="lang-label">
            Languages
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {' · '}
              <button className="picker-btn" onClick={selectAll}>All</button>
              {' / '}
              <button className="picker-btn" onClick={selectNone}>None</button>
              {' · '} {filtered.length} of {allTranslations.length} translations
            </span>
          </div>
          <div className="lang-chips">
            {availableLangs.map((lang) => (
              <button
                key={lang.code}
                className={`lang-chip ${selectedCodes.has(lang.code) ? 'active' : ''}`}
                onClick={() => toggleLang(lang.code)}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <p>No translations match your language selection.</p>
          {availableLangs.length > 0 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              Try selecting a language above
            </p>
          )}
        </div>
      ) : (
        <div className="translations-list">
          {filtered.map((t, idx) => (
            <div key={`${t.id}-${idx}`} className="translation-item">
              <div className="translation-target-word">{t.targetText || 'Word'}</div>
              {t.targetLanguageName && (
                <div className="translation-target-lang">{t.targetLanguageName}</div>
              )}
              {t.meaning && (
                <div className="translation-meaning">{t.meaning}</div>
              )}
              {t.exampleUsage && (
                <div className="translation-example">&ldquo;{t.exampleUsage}&rdquo;</div>
              )}
              {!t.meaning && !t.exampleUsage && (
                <div className="translation-empty">No meaning or example</div>
              )}
            </div>
          ))}
        </div>
      )}

      <footer className="footer">
        <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to search
        </Link>
      </footer>
    </div>
  )
}

export default function WordDetailPage() {
  return (
    <Suspense fallback={<div className="container">Loading...</div>}>
      <WordDetailContent />
    </Suspense>
  )
}
