import fs from 'node:fs/promises'
import mongoose from 'mongoose'
import path from 'node:path'

import { Interview, InterviewStatus } from '../models/Interview.js'
import { Resume, ResumeParseStatus } from '../models/Resume.js'
import { AppError } from '../utils/AppError.js'
import { parseDocx } from '../utils/docxParser.js'
import { parsePdf } from '../utils/pdfParser.js'
import { resolveUploadPath, UPLOADS_DIR } from '../utils/uploadPaths.js'
import { extractStructure } from '../utils/resumeStructure.js'

const MIN_TEXT_LENGTH = 50

const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  docx: [0x50, 0x4b, 0x03, 0x04],
}

const LANGUAGE_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  { name: 'C++', aliases: ['cpp', 'cplusplus'] },
  { name: 'C#', aliases: ['c sharp', 'csharp'] },
  { name: 'Go', aliases: ['golang', 'go lang', 'go-lang'], caseSensitive: true },
  { name: 'R', caseSensitive: true },
  'Rust',
  'PHP',
  'Ruby',
  'Kotlin',
  'Swift',
  'Scala',
  'Dart',
  'Elixir',
  'Erlang',
  'Haskell',
  'Lua',
  'Perl',
  'MATLAB',
  { name: 'Objective-C', aliases: ['objective c', 'objc'] },
  'Groovy',
  'Bash',
  'PowerShell',
  'Solidity',
]

const FRONTEND_SKILLS = [
  'React',
  { name: 'Next.js', aliases: ['nextjs', 'next js'] },
  'Vue',
  'Nuxt',
  'Angular',
  'Svelte',
  { name: 'Astro', aliases: ['astro.js', 'astrojs'] },
  { name: 'Remix', aliases: ['remix.js', 'remixjs'] },
  { name: 'HTML5', aliases: ['html'] },
  { name: 'CSS3', aliases: ['css'] },
  { name: 'Sass', aliases: ['scss'] },
  { name: 'Less', aliases: ['less css', 'lesscss'], aliasesOnly: true },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss', 'tailwind css'] },
  'Bootstrap',
  { name: 'Material UI', aliases: ['material ui', 'material-ui', 'mui', 'react material'] },
  { name: 'Styled Components', aliases: ['styled components', 'styled-components'] },
  'Redux',
  'Zustand',
  { name: 'MobX', aliases: ['mob x'] },
  { name: 'jQuery', aliases: ['jquery', 'jquery js'] },
  'Webpack',
  'Vite',
  'Rollup',
  'Babel',
  { name: 'Three.js', aliases: ['threejs', 'three js'] },
  { name: 'D3.js', aliases: ['d3', 'd3js', 'd3 js'] },
  { name: 'Alpine.js', aliases: ['alpine', 'alpinejs', 'alpine js'] },
  'Storybook',
]

const BACKEND_SKILLS = [
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node js'] },
  { name: 'Express', aliases: ['express.js', 'expressjs', 'express js', 'express framework', 'node express'], aliasesOnly: true },
  { name: 'NestJS', aliases: ['nest js', 'nestjs'] },
  { name: 'FastAPI', aliases: ['fastapi', 'fast api'] },
  'Django',
  'Flask',
  { name: 'Ruby on Rails', aliases: ['rails', 'ruby on rails', 'ror'] },
  'Laravel',
  { name: 'Spring Boot', aliases: ['spring boot', 'springboot'] },
  {
    name: 'Spring Framework',
    aliases: ['spring framework', 'springframework', 'spring mvc', 'spring security', 'spring cloud', 'spring data'],
  },
  { name: '.NET', aliases: ['dotnet', 'asp.net', 'asp.net core', 'aspnet', 'net core', 'netcore'] },
  { name: 'gRPC', aliases: ['grpc'] },
  { name: 'GraphQL', aliases: ['graphql', 'graph ql'] },
  {
    name: 'REST API',
    aliases: ['rest api', 'rest apis', 'restful', 'restful api', 'rest endpoints', 'api', 'apis'],
  },
  { name: 'Socket.IO', aliases: ['socket.io', 'socket io', 'socketio'] },
  { name: 'WebSocket', aliases: ['websocket', 'websockets'] },
  'SOAP',
  { name: 'OAuth', aliases: ['oauth2', 'oauth 2'] },
  { name: 'JWT', aliases: ['json web token', 'json web tokens'] },
  { name: 'Serverless', aliases: ['serverless framework'] },
  { name: 'AWS Lambda', aliases: ['aws lambda'] },
  'Symfony',
  'Prisma',
  { name: 'TypeORM', aliases: ['type orm'] },
  'Sequelize',
  'Mongoose',
  { name: 'Entity Framework Core', aliases: ['ef core', 'entity framework', 'entity framework core'] },
  'Hibernate',
  { name: 'Apollo', aliases: ['apollo client', 'apollo server', 'apollo graphql'] },
  'PM2',
]

const DATASTORE_SKILLS = [
  { name: 'SQL', aliases: ['pl/sql', 'rdbms', 'structured query language'] },
  'MySQL',
  { name: 'PostgreSQL', aliases: ['postgres', 'psql'] },
  { name: 'MongoDB', aliases: ['mongo', 'mongo db'] },
  'Redis',
  { name: 'SQLite', aliases: ['sqlite3'] },
  'Cassandra',
  { name: 'DynamoDB', aliases: ['dynamo db'] },
  'Firebase',
  'Firestore',
  { name: 'Elasticsearch', aliases: ['elastic search', 'elastic stack'] },
  { name: 'Memcached', aliases: ['memcache'] },
  { name: 'Neo4j', aliases: ['neo 4j'] },
  'CouchDB',
  { name: 'Oracle Database', aliases: ['oracle db', 'oracle database', 'oracle'] },
  { name: 'SQL Server', aliases: ['mssql', 'ms sql', 'microsoft sql server'] },
  'Supabase',
  { name: 'InfluxDB', aliases: ['influx db'] },
  { name: 'ClickHouse', aliases: ['click house'] },
  { name: 'Apache Hive', aliases: ['hive'] },
  { name: 'DuckDB', aliases: ['duck db'] },
  'Snowflake',
  { name: 'BigQuery', aliases: ['big query'] },
  { name: 'Amazon Redshift', aliases: ['redshift'] },
  { name: 'MariaDB', aliases: ['maria db'] },
  { name: 'NoSQL', aliases: ['no sql', 'nosql databases'] },
]

const DEVOPS_SKILLS = [
  { name: 'AWS', aliases: ['amazon web services'] },
  { name: 'Azure', aliases: ['microsoft azure'] },
  { name: 'GCP', aliases: ['google cloud platform', 'google cloud'] },
  'Docker',
  { name: 'Kubernetes', aliases: ['k8s'] },
  'Terraform',
  'Ansible',
  'Jenkins',
  { name: 'GitHub Actions', aliases: ['github actions', 'gh actions'] },
  { name: 'GitLab CI', aliases: ['gitlab ci', 'gitlab ci/cd'] },
  { name: 'CircleCI', aliases: ['circle ci'] },
  { name: 'Travis CI', aliases: ['travis'] },
  { name: 'Argo CD', aliases: ['argo cd', 'argocd'] },
  'Helm',
  'Nginx',
  'Prometheus',
  'Grafana',
  'Datadog',
  { name: 'New Relic', aliases: ['newrelic'] },
  'Splunk',
  'Cloudflare',
  'Vercel',
  'Netlify',
  'Heroku',
  { name: 'DigitalOcean', aliases: ['digital ocean'] },
  { name: 'OpenShift', aliases: ['open shift'] },
  'Rancher',
  'Vagrant',
  { name: 'SonarQube', aliases: ['sonar qube', 'sonar'] },
  { name: 'HashiCorp Vault', aliases: ['vault'] },
  { name: 'EKS', aliases: ['elastic kubernetes service'] },
  { name: 'GKE', aliases: ['google kubernetes engine'] },
  { name: 'AKS', aliases: ['azure kubernetes service'] },
  { name: 'VMware', aliases: ['vsphere', 'v sphere', 'esxi'] },
  'Linux',
  'Ubuntu',
  'Debian',
  'CentOS',
  'Unix',
  { name: 'macOS', aliases: ['mac os'] },
]

const DATAML_SKILLS = [
  'Machine Learning',
  { name: 'Deep Learning', aliases: ['deep learning'] },
  { name: 'NLP', aliases: ['natural language processing'] },
  { name: 'Computer Vision', aliases: ['computer vision'] },
  { name: 'MLOps', aliases: ['ml ops'] },
  { name: 'Data Science', aliases: ['data scientist'] },
  { name: 'Data Analysis', aliases: ['data analysis', 'data analytics', 'data analyst'] },
  { name: 'Statistics', aliases: ['statistical analysis', 'statistical modeling'] },
  { name: 'ETL', aliases: ['etl pipelines'] },
  { name: 'Data Warehousing', aliases: ['data warehouse', 'data warehousing'] },
  'Pandas',
  { name: 'NumPy', aliases: ['num py'] },
  { name: 'TensorFlow', aliases: ['tensor flow'] },
  { name: 'PyTorch', aliases: ['py torch'] },
  { name: 'scikit-learn', aliases: ['scikit learn', 'sklearn'] },
  { name: 'Jupyter', aliases: ['jupyter notebook', 'jupyter lab'] },
  'Keras',
  { name: 'OpenCV', aliases: ['opencv python'] },
  'NLTK',
  { name: 'spaCy', aliases: ['spacy nlp'] },
  { name: 'Hugging Face', aliases: ['huggingface', 'hugging face transformers'] },
  { name: 'LangChain', aliases: ['lang chain'] },
  { name: 'LLM', aliases: ['llms', 'large language model', 'large language models'] },
  { name: 'Prompt Engineering', aliases: ['prompt engineering'] },
  { name: 'OpenAI', aliases: ['openai api'] },
  { name: 'MLflow', aliases: ['ml flow'] },
  { name: 'Apache Airflow', aliases: ['airflow'] },
  { name: 'Apache Spark', aliases: ['spark', 'pyspark', 'spark mllib'] },
  { name: 'Hadoop', aliases: ['apache hadoop'] },
  'Tableau',
  { name: 'Power BI', aliases: ['powerbi'] },
  'Looker',
  'Seaborn',
  'Matplotlib',
  { name: 'SciPy', aliases: ['sci py'] },
  { name: 'XGBoost', aliases: ['xg boost'] },
  { name: 'LightGBM', aliases: ['light gbm'] },
  'Databricks',
  { name: 'Amazon SageMaker', aliases: ['sagemaker', 'sage maker'] },
  { name: 'Plotly', aliases: ['plotly express'] },
  'CUDA',
]

const TESTING_SKILLS = [
  'Jest',
  'Vitest',
  'Mocha',
  'Chai',
  'Cypress',
  'Playwright',
  'Selenium',
  'Puppeteer',
  'Postman',
  { name: 'Pytest', aliases: ['py test'] },
  { name: 'JUnit', aliases: ['j unit'] },
  { name: 'TestNG', aliases: ['test ng'] },
  { name: 'PHPUnit', aliases: ['php unit'] },
  { name: 'RSpec', aliases: ['r spec'] },
  { name: 'TDD', aliases: ['test driven development', 'test-driven development'] },
  { name: 'BDD', aliases: ['behavior driven development', 'behavior-driven development', 'behaviour driven development'] },
  { name: 'JMeter', aliases: ['j meter'] },
]

const MOBILE_SKILLS = [
  { name: 'React Native', aliases: ['react native'] },
  'Flutter',
  { name: 'Android', aliases: ['android sdk', 'android studio'] },
  { name: 'iOS', aliases: ['iphone os'] },
  'Expo',
  'Ionic',
  'Xamarin',
  { name: 'Jetpack Compose', aliases: ['compose'] },
  { name: 'SwiftUI', aliases: ['swift ui'] },
]

const MESSAGING_SKILLS = [
  { name: 'Kafka', aliases: ['apache kafka'] },
  { name: 'RabbitMQ', aliases: ['rabbit mq'] },
  { name: 'ActiveMQ', aliases: ['active mq'] },
  'Celery',
]

const SECURITY_SKILLS = [
  { name: 'OWASP', aliases: ['owasp top 10'] },
  { name: 'Penetration Testing', aliases: ['pentest', 'pen testing', 'pen tester'] },
  { name: 'Burp Suite', aliases: ['burp'] },
  'Metasploit',
  'Wireshark',
  { name: 'Nmap', aliases: ['n map'] },
  'SIEM',
  'Snyk',
  { name: 'Cryptography', aliases: ['cryptography'] },
  { name: 'SSL/TLS', aliases: ['ssl', 'tls'] },
]

const PRACTICE_SKILLS = [
  'Git',
  'GitHub',
  'GitLab',
  'Bitbucket',
  'Jira',
  'Confluence',
  'Figma',
  { name: 'Adobe XD', aliases: ['xd'] },
  'Agile',
  'Scrum',
  'Kanban',
  { name: 'CI/CD', aliases: ['ci cd', 'cicd', 'continuous integration', 'continuous delivery', 'continuous deployment'] },
  { name: 'DevOps', aliases: ['dev ops'] },
  { name: 'SDLC', aliases: ['software development life cycle'] },
  { name: 'System Design', aliases: ['system design'] },
  { name: 'Data Structures', aliases: ['data structure', 'data structures and algorithms'] },
  { name: 'Algorithms', aliases: ['algorithm', 'algo'] },
  { name: 'Pair Programming', aliases: ['pair programming'] },
  { name: 'Code Review', aliases: ['code reviews'] },
  { name: 'Micro Frontends', aliases: ['micro frontend', 'micro frontends'] },
  { name: 'Microservices', aliases: ['microservice', 'micro services'] },
  { name: 'SaaS', aliases: ['software as a service'] },
  { name: 'Microsoft Excel', aliases: ['ms excel', 'advanced excel'] },
  { name: 'Photoshop', aliases: ['adobe photoshop'] },
  'npm',
  'Yarn',
  'pnpm',
  'Gradle',
  'Maven',
  'CMake',
]

const SKILL_DEFS = [
  ...LANGUAGE_SKILLS,
  ...FRONTEND_SKILLS,
  ...BACKEND_SKILLS,
  ...DATASTORE_SKILLS,
  ...DEVOPS_SKILLS,
  ...DATAML_SKILLS,
  ...TESTING_SKILLS,
  ...MOBILE_SKILLS,
  ...MESSAGING_SKILLS,
  ...SECURITY_SKILLS,
  ...PRACTICE_SKILLS,
]

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const boundaryPattern = (terms) =>
  new RegExp(`(?:^|[^a-z0-9])(?:${terms.map((term) => escapeRegex(term.toLowerCase())).join('|')})(?:[^a-z0-9]|$)`)

const compiledSkills = SKILL_DEFS.map((entry) => {
  const def = typeof entry === 'string' ? { name: entry, aliases: [] } : { aliases: [], ...entry }
  const ciTerms = def.caseSensitive || def.aliasesOnly ? def.aliases : [def.name, ...def.aliases]
  return {
    name: def.name,
    ci: ciTerms.length > 0 ? boundaryPattern(ciTerms) : null,
    cs: def.caseSensitive ? new RegExp(`\\b${escapeRegex(def.name)}\\b`) : null,
  }
})

export const extractSkills = (text) => {
  const haystack = text.toLowerCase()
  const found = []
  for (const { name, ci, cs } of compiledSkills) {
    if ((ci && ci.test(haystack)) || (cs && cs.test(text))) found.push(name)
  }
  return found
}

const readHeader = async (filePath) => {
  const handle = await fs.open(filePath, 'r')
  try {
    const header = Buffer.alloc(8)
    await handle.read(header, 0, 8, 0)
    return header
  } finally {
    await handle.close()
  }
}

const matchesSignature = (header, signature) => signature.every((byte, i) => header[i] === byte)

const extractText = async (filePath, fileType) => {
  try {
    return fileType === 'pdf' ? await parsePdf(filePath) : await parseDocx(filePath)
  } catch {
    throw AppError.badRequest(
      'Could not read the file. It may be corrupted or password-protected.',
      'PARSE_FAILED',
    )
  }
}

export const createResume = async (user, file) => {
  const fileType = path.extname(file.originalname).toLowerCase().slice(1)
  const relativePath = path.relative(UPLOADS_DIR, file.path)

  try {
    const header = await readHeader(file.path)
    if (!matchesSignature(header, FILE_SIGNATURES[fileType])) {
      throw AppError.badRequest('File content does not match its extension', 'INVALID_FILE_TYPE')
    }

    const rawText = await extractText(file.path, fileType)
    const parsedText = rawText.replace(/\s+/g, ' ').trim()

    if (parsedText.length < MIN_TEXT_LENGTH) {
      throw AppError.badRequest(
        'No extractable text found. Scanned or image-only files are not supported.',
        'NO_TEXT_FOUND',
      )
    }

    return await Resume.create({
      user: user._id,
      fileName: file.originalname,
      fileType,
      filePath: relativePath,
      parsedText,
      rawText,
      structure: extractStructure(rawText),
      parseStatus: ResumeParseStatus.PARSED,
      skills: extractSkills(parsedText),
    })
  } catch (err) {
    await fs.unlink(file.path).catch(() => {})
    throw err
  }
}

export const ensureResumeStructure = async (resume) => {
  if (!resume.rawText) {
    try {
      const rawText = await extractText(resolveUploadPath(resume.filePath), resume.fileType)
      if (!rawText || !rawText.trim()) return resume
      resume.rawText = rawText
    } catch {
      // legacy file missing or unreadable — keep structure null (flat fallback)
      return resume
    }
  }

  const next = extractStructure(resume.rawText)
  if (JSON.stringify(next) !== JSON.stringify(resume.structure)) {
    resume.structure = next
    await resume.save()
  }
  return resume
}

export const listResumes = (user) => Resume.find({ user: user._id }).sort({ createdAt: -1 })

export const getResume = async (user, resumeId) => {
  if (!mongoose.isValidObjectId(resumeId)) {
    throw AppError.notFound('Resume not found')
  }

  const resume = await Resume.findOne({ _id: resumeId, user: user._id })
  if (!resume) {
    throw AppError.notFound('Resume not found')
  }
  return resume
}

export const deleteResume = async (user, resumeId) => {
  const resume = await getResume(user, resumeId)

  const openCount = await Interview.countDocuments({
    resume: resume._id,
    status: { $in: [InterviewStatus.CREATED, InterviewStatus.IN_PROGRESS] },
  })
  if (openCount > 0) {
    throw AppError.conflict(
      `This resume is used by ${openCount} open interview${openCount > 1 ? 's' : ''}. Delete ${
        openCount > 1 ? 'them' : 'it'
      } from History first.`,
      'RESUME_IN_USE',
    )
  }

  await fs.unlink(resolveUploadPath(resume.filePath)).catch(() => {})
  await Resume.deleteOne({ _id: resume._id })
}
