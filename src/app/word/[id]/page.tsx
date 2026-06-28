'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { graphql, LANGUAGES_QUERY, WORD_QUERY, COMPARE_WORD_QUERY } from '@/lib/graphql'
import type { Language, Word, Translation } from '@/lib/types'

interface TranslationWithMeta extends Translation {
  targetText?: string
  targetLanguageName?: string
}

export default function WordDetailPage() {
  const params = useParams()
  const wordId = params.id as string

  const [word, setWord] = useState<Word | null>(null)
  const [language, setLanguage] = useState<Language | null>(null)
  const [translations, setTranslations] = useState<TranslationWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wordId) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // 1. Fetch all languages
        const langData = await graphql<{ languages: Language[] }>(LANGUAGES_QUERY)
        const langMap = new Map(langData.languages.map((l) => [l.id, l]))

        // 2. Fetch the source word
        const wordData = await graphql<{ word: Word | null }>(WORD_QUERY, { id: wordId })
        if (!wordData.word) {
          setError('Word not found')
          return
        }

        setWord(wordData.word)
        setLanguage(langMap.get(wordData.word.languageId) || null)

        // 3. Fetch translations
        const allCodes = langData.languages
          .filter((l) => l.id !== wordData.word!.languageId)
          .map((l) => l.code)

        const tData = await graphql<{ compareWord: Translation[] }>(COMPARE_WORD_QUERY, {
          wordId: wordId,
          targetLangs: allCodes.length > 0 ? allCodes : ['xx'],
        })

        // 4. Fetch target word texts
        const targetWordIds = [...new Set(tData.compareWord.map((t) => t.targetWordId))]
        const tWordTexts = new Map<string, string>()
        const tWordLangs = new Map<string, string>()

        await Promise.allSettled(
          targetWordIds.map(async (twId) => {
            const twData = await graphql<{ word: Word | null }>(WORD_QUERY, { id: twId })
            if (twData.word) {
              tWordTexts.set(twId, twData.word.text)
              const lang = langMap.get(twData.word.languageId)
              if (lang) {
                tWordLangs.set(twId, `${lang.name} (${lang.code})`)
              }
            }
          })
        )

        const enriched = tData.compareWord.map((t) => ({
          ...t,
          targetText: tWordTexts.get(t.targetWordId) || undefined,
          targetLanguageName: tWordLangs.get(t.targetWordId) || undefined,
        }))

        setTranslations(enriched)
        setError(null)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load word')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [wordId])

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

      {translations.length > 0 && (
        <div className="detail-count">
          {translations.length} translation{translations.length !== 1 ? 's' : ''}
        </div>
      )}

      {translations.length === 0 ? (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <p>No translations found for this word.</p>
        </div>
      ) : (
        <div className="translations-list">
          {translations.map((t, idx) => (
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
