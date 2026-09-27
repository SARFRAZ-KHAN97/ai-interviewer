export const STRUCTURE_VERSION = 2

const SECTION_VOCAB = {
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'work history',
    'career history',
    'work background',
    'employment',
    'relevant experience',
    'internship experience',
    'internships',
    'internship',
  ],
  projects: [
    'projects',
    'project experience',
    'personal projects',
    'academic projects',
    'project work',
    'key projects',
    'selected projects',
    'project',
  ],
  education: [
    'education',
    'academic background',
    'qualifications',
    'academics',
    'educational background',
  ],
  skills: [
    'skills',
    'technical skills',
    'core competencies',
    'technologies',
    'tech stack',
    'skills and tools',
    'skills and technologies',
    'tools and technologies',
  ],
  summary: [
    'summary',
    'professional summary',
    'summary of qualifications',
    'profile',
    'about me',
    'objective',
    'career objective',
    'career summary',
  ],
}

const headingLookup = new Map()
for (const [type, terms] of Object.entries(SECTION_VOCAB)) {
  for (const term of terms) headingLookup.set(term, type)
}

const BULLET_RE = /^\s*(?:[-–—•·▪●○*▶]|\d{1,2}[.)])\s+/

const DATE_TOKEN = '(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?\\s+|(?:0?[1-9]|1[0-2])\\/)'
const YEAR = '(?:19|20)\\d{2}'
const DATE_RANGE = new RegExp(
  `${DATE_TOKEN}?${YEAR}\\s*(?:[-–—]|\\bto\\b)\\s*(?:${DATE_TOKEN}?${YEAR}|present|current|now)`,
  'i',
)

const CONTACT_RE =
  /@|https?:\/\/|www\.|linkedin\.com|github\.com|\b\d{1,3}[-.\s]\d{1,3}[-.\s]\d{4}\b|\b\+\d[\d\s-]{6,}\b/i

const cleanBullet = (line) => line.replace(BULLET_RE, '').trim()

const headingType = (line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 45 || trimmed.endsWith('.')) return null
  if (BULLET_RE.test(trimmed)) return null
  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9&/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return headingLookup.get(normalized) ?? null
}

const tidyTitlePart = (value) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/^[\s|,·•/:-]+/, '')
    .replace(/[\s|,·•/:-]+$/, '')
    .trim()

const parseExperience = (lines) => {
  const entries = []
  let current = null
  let pending = []

  const flush = () => {
    if (current) entries.push(current)
    current = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const dateMatch = line.match(DATE_RANGE)
    if (dateMatch) {
      flush()
      const titlePart = tidyTitlePart(line.replace(DATE_RANGE, ''))
      const title = [...pending, titlePart].filter(Boolean).join(' — ')
      pending = []
      current = { title, dates: tidyTitlePart(dateMatch[0]), description: [], bullets: [] }
      continue
    }

    if (BULLET_RE.test(line)) {
      const bullet = cleanBullet(line)
      if (current) current.bullets.push(bullet)
      else if (bullet) pending.push(bullet)
      continue
    }

    if (current) {
      if (current.bullets.length > 0) {
        flush()
        pending = [line]
      } else {
        current.description.push(line)
      }
    } else {
      pending.push(line)
    }
  }
  flush()

  return entries.filter((entry) => entry.title || entry.bullets.length > 0)
}

const parseGrouped = (lines) => {
  const entries = []
  let current = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (BULLET_RE.test(line)) {
      if (!current) current = { name: '', description: [], bullets: [] }
      current.bullets.push(cleanBullet(line))
      continue
    }

    if (!current) {
      current = { name: line, description: [], bullets: [] }
    } else if (current.bullets.length > 0) {
      entries.push(current)
      current = { name: line, description: [], bullets: [] }
    } else {
      current.description.push(line)
    }
  }
  if (current) entries.push(current)

  return entries.filter((entry) => entry.name || entry.bullets.length > 0)
}

const experienceFallback = (lines) =>
  parseGrouped(lines).map((entry) => ({
    title: [entry.name, ...entry.description].filter(Boolean).join(' — '),
    dates: '',
    description: [],
    bullets: entry.bullets,
  }))

const collectSummary = (summaryLines, preHeadingLines) => {
  const explicit = summaryLines.join(' ').replace(/\s+/g, ' ').trim()
  if (explicit) return explicit.slice(0, 800)

  const cleaned = preHeadingLines
    .map((line) => line.trim())
    .filter((line) => line && !CONTACT_RE.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.length >= 30 && cleaned.length <= 800 ? cleaned : ''
}

const PAGE_MARKER_RE = /^--\s*\d+\s+of\s+\d+\s*--$/

const CONTINUATION_START_RE = /^[a-z0-9]/

const mergeWrappedLines = (rawLines) => {
  const lines = []
  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line || PAGE_MARKER_RE.test(line)) continue
    lines.push(line)
  }

  const merged = []
  let prevIsBullet = false
  let prevIsHeading = false

  for (const line of lines) {
    const isBullet = BULLET_RE.test(line)
    const isHeading = headingType(line) !== null
    const prev = merged[merged.length - 1]
    const canMerge =
      prev !== undefined &&
      !isBullet &&
      !isHeading &&
      !prevIsHeading &&
      (CONTINUATION_START_RE.test(line) || (prevIsBullet && line.length > 70))

    if (canMerge) {
      merged[merged.length - 1] = prev.endsWith('-') ? prev + line : `${prev} ${line}`
    } else {
      merged.push(line)
      prevIsBullet = isBullet
      prevIsHeading = isHeading
    }
  }
  return merged
}

export const extractStructure = (rawText) => {
  if (!rawText || !rawText.trim()) return null

  const lines = mergeWrappedLines(rawText.split(/\r?\n/))
  const sections = { experience: [], projects: [], education: [], skills: [], summary: [] }
  const preHeading = []
  let current = null

  for (const line of lines) {
    const type = headingType(line)
    if (type) {
      current = type
      continue
    }
    if (current) sections[current].push(line)
    else preHeading.push(line)
  }

  let experience =
    sections.experience.length > 0 ? parseExperience(sections.experience) : []
  if (experience.length === 0 && sections.experience.length > 0) {
    experience = experienceFallback(sections.experience)
  }

  const projects = parseGrouped(sections.projects)
  const education = parseGrouped(sections.education)

  if (experience.length === 0 && projects.length === 0 && education.length === 0) {
    return null
  }

  return {
    version: STRUCTURE_VERSION,
    summary: collectSummary(sections.summary, preHeading),
    experience,
    projects,
    education,
  }
}
