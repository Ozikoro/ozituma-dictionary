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

        // 1. Fetch languages
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

        // 3. Fetch translations to all languages
        const allCodes = langData.languages
          .filter((l) => l.id !== wordData.word!.languageId)
          .map((l) => l.code)

        const tData = await graphql<{ compareWord: Translation[] }>(COMPARE_WORD_QUERY, {
          wordId: wordId,
          targetLangs: allCodes.length > 0 ? allCodes : ['xx'],
        })

        // 4. For each translation, fetch the target word's text
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

        // 5. Build enriched translations
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
        <div className="skeleton" style={{ height: '1.5rem', width: '8rem', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '2.5rem', marginBottom: '0.5rem' }} />
        <div className="skeleton" style={{ height: '1.2rem', width: '10rem', marginBottom: '2rem' }} />
        <div className="skeleton" style={{ height: '6rem' }} />
        <div className="skeleton" style={{ height: '6rem', marginTop: '0.75rem' }} />
        <div className="skeleton" style={{ height: '6rem', marginTop: '0.75rem' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <Link href="/" className="back-link">← Back to search</Link>
        <div className="error-banner">{error}</div>
      </div>
    )
  }

  if (translations.length === 0) {
    return (
      <div className="container">
        <Link href="/" className="back-link">← Back to search</Link>
        {word && (
          <div className="word-detail-header">
            <h2>{word.text}</h2>
            {language && <span className="word-language">{language.name} ({language.code})</span>}
          </div>
        )}
        <div className="no-results">
          <p>No translations found for this word.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <Link href="/" className="back-link">← Back to search</Link>

      <div className="word-detail-header">
        <h2>{word?.text || 'Word'}</h2>
        {language && (
          <span className="word-language">{language.name} ({language.code})</span>
        )}
      </div>

      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
        {translations.length} translation{translations.length !== 1 ? 's' : ''}
      </h3>

      <div className="translations-section">
        {translations.map((t, idx) => (
          <div key={`${t.id}-${idx}`} className="translation-card">
            <div className="translation-word">{t.targetText || 'Word'}</div>
            {t.targetLanguageName && (
              <div className="translation-lang">{t.targetLanguageName}</div>
            )}
            {t.meaning && (
              <div className="translation-meaning">{t.meaning}</div>
            )}
            {t.exampleUsage && (
              <div className="translation-example">&ldquo;{t.exampleUsage}&rdquo;</div>
            )}
            {!t.meaning && !t.exampleUsage && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No meaning or example
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="footer">
        <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          ← Back to search
        </Link>
      </footer>
    </div>
  )
}
