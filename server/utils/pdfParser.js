import fs from 'node:fs/promises'

import { PDFParse } from 'pdf-parse'

export const parsePdf = async (filePath) => {
  const data = await fs.readFile(filePath)
  const parser = new PDFParse({ data })

  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}
