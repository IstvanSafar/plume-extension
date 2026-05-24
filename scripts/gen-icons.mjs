import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'fs'

mkdirSync('public/icons', { recursive: true })

const svg = readFileSync('public/favicon.svg')


for (const size of [16, 48, 96, 128]) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon${size}.png`)
  console.log(`icon${size}.png ✓`)
}
