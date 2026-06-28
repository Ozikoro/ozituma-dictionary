export interface Language {
  id: string
  code: string
  name: string
}

export interface Word {
  id: string
  languageId: string
  text: string
}

export interface Translation {
  id: string
  sourceWordId: string
  targetWordId: string
  meaning: string | null
  exampleUsage: string | null
}

export interface LanguagesData {
  languages: Language[]
}

export interface SearchWordsData {
  searchWords: Word[]
}

export interface CompareWordData {
  compareWord: Translation[]
}

export interface WordWithLanguage extends Word {
  language?: Language
}

export interface TranslationWithWord extends Translation {
  source_word?: Word
  target_word?: Word
  target_language?: Language
}
