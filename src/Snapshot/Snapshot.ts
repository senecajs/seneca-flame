import { existsSync, mkdir, writeFile, readFile } from 'fs'
import { promisify } from 'util'

import FlameGraphStore from '../FlameGraphStore'

const mkDirAsync = promisify(mkdir)
const writeFileAsync = promisify(writeFile)
const readFileAsync = promisify(readFile)

export function Snapshot(seneca: any) {
  const data = (seneca.shared.flameGraphStore as FlameGraphStore).get()

  const generateJson = async (folder?: string) => {
    const now = Date.now()
    const folderPath = folder ?? `./snapshots/${now}`
    if (!existsSync(folderPath)) {
      await mkDirAsync(folderPath, { recursive: true })
    }
    const jsonFile = `${folderPath}/${now}-snapshot.json`
    await writeFileAsync(jsonFile, JSON.stringify(data), { encoding: 'utf-8' })
    return {
      message: `File ${jsonFile} was successfully written`,
      filename: jsonFile,
    }
  }

  const generateHtml = async (folder?: string) => {
    const now = Date.now()
    const folderPath = folder ?? `./snapshots/${now}`
    const { filename } = await generateJson(folderPath)
    let baseHtml = (
      await readFileAsync(`${__dirname}/html/base.html`)
    ).toString()
    const replaces = [
      {
        pattern: '$JSON_FILE',
        to: filename.split('/').at(-1),
      },
    ]
    for (const { pattern, to } of replaces) {
      if (to) {
        baseHtml = baseHtml.replace(pattern, to)
      }
    }
    const htmlFile = `${folderPath}/index.html`
    await writeFileAsync(htmlFile, baseHtml, { encoding: 'utf-8' })
    return {
      message: `File ${htmlFile} was successfully written`,
      filename: htmlFile,
    }
  }

  return { generateJson, generateHtml }
}
