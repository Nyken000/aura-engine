import fs from 'fs'
import path from 'path'
import https from 'https'

const DATA_DIR = path.join(process.cwd(), 'src/data/dnd')

const urls = [
  { name: 'spells-phb.json', url: 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-src/v1.168.0/data/spells/spells-phb.json' },
  { name: 'spells-xge.json', url: 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-src/v1.168.0/data/spells/spells-xge.json' },
  { name: 'spells-tce.json', url: 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-src/v1.168.0/data/spells/spells-tce.json' },
  { name: 'items-base.json', url: 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-src/v1.168.0/data/items-base.json' },
  { name: 'items.json', url: 'https://raw.githubusercontent.com/5etools-mirror-1/5etools-src/v1.168.0/data/items.json' },
]

function downloadResource(urlObj: {name: string, url: string}): Promise<void> {
  return new Promise((resolve, reject) => {
    const dest = path.join(DATA_DIR, urlObj.name)
    const file = fs.createWriteStream(dest)
    
    console.log(`Downloading ${urlObj.name}...`)
    
    https.get(urlObj.url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${urlObj.url}' (${response.statusCode})`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        console.log(`Saved ${urlObj.name}`)
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  for (const item of urls) {
    try {
      await downloadResource(item)
    } catch(err) {
      console.error(err)
    }
  }
}

main()
