import { create } from 'zustand'
import type { Language, Word, Translation } from '@/lib/types'

export type Tab = 'search' | 'translate' | 'browse'
export type WordWithLang = Word & { langName?: string; langCode?: string }
export type TransResult = { source: string; target: string; lang: string; meaning?: string; example?: string }

interface SearchState {
  languages: Language[]
  setLanguages: (langs: Language[]) => void
  tab: Tab
  setTab: (tab: Tab) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  hasLoadedLangs: boolean
  setHasLoadedLangs: (val: boolean) => void

  query: string
  setQuery: (q: string) => void
  selectedLang: string | null
  setSelectedLang: (l: string | null) => void
  results: WordWithLang[]
  setResults: (r: WordWithLang[]) => void
  translations: Map<string, Translation[]>
  setTranslations: (t: Map<string, Translation[]>) => void
  searching: boolean
  setSearching: (s: boolean) => void

  transWord: string
  setTransWord: (w: string) => void
  transTargets: Set<string>
  setTransTargets: (t: Set<string>) => void
  transResults: TransResult[]
  setTransResults: (r: TransResult[]) => void
  translating: boolean
  setTranslating: (t: boolean) => void

  browseLang: string
  setBrowseLang: (l: string) => void
  browseWords: Word[]
  setBrowseWords: (w: Word[]) => void
  browseTotal: number
  setBrowseTotal: (t: number) => void
  browsePage: number
  setBrowsePage: (p: number) => void
  browseLoading: boolean
  setBrowseLoading: (l: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  languages: [],
  setLanguages: (languages) => set({ languages }),
  tab: 'search',
  setTab: (tab) => set({ tab }),
  loading: true,
  setLoading: (loading) => set({ loading }),
  error: null,
  setError: (error) => set({ error }),
  hasLoadedLangs: false,
  setHasLoadedLangs: (hasLoadedLangs) => set({ hasLoadedLangs }),

  query: '',
  setQuery: (query) => set({ query }),
  selectedLang: null,
  setSelectedLang: (selectedLang) => set({ selectedLang }),
  results: [],
  setResults: (results) => set({ results }),
  translations: new Map(),
  setTranslations: (translations) => set({ translations }),
  searching: false,
  setSearching: (searching) => set({ searching }),

  transWord: '',
  setTransWord: (transWord) => set({ transWord }),
  transTargets: new Set(),
  setTransTargets: (transTargets) => set({ transTargets }),
  transResults: [],
  setTransResults: (transResults) => set({ transResults }),
  translating: false,
  setTranslating: (translating) => set({ translating }),

  browseLang: '',
  setBrowseLang: (browseLang) => set({ browseLang }),
  browseWords: [],
  setBrowseWords: (browseWords) => set({ browseWords }),
  browseTotal: -1,
  setBrowseTotal: (browseTotal) => set({ browseTotal }),
  browsePage: 0,
  setBrowsePage: (browsePage) => set({ browsePage }),
  browseLoading: false,
  setBrowseLoading: (browseLoading) => set({ browseLoading }),
}))
