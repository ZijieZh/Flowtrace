/**
 * Paper shape detection markers (used in looksLikePapers heuristic).
 * Normalized to lowercase without underscores for fuzzy matching.
 */
export const PAPER_SHAPE_MARKERS = [
  'link', 'url', 'href', 'paperurl', 'sourceurl',
  'publicationinfo', 'authorstring', 'authors', 'author',
  'doi', 'pmid', 'pubmedid',
  'journal', 'journaltitle', 'journalname', 'journalinfo', 'venue',
  'containertitle',  // CSL-JSON format
  'pubyear', 'publicationyear', 'pubdate', 'issued',  // CSL-JSON uses 'issued'
  'abstract', 'abstracttext', 'snippet',
  'citationcount', 'citedbycount', 'citations',
  'pdfurl', 'pdflink',
] as const
