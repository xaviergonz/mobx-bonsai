import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Generate a random string
 */
function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a random number between min and max
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a random float between min and max
 */
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * Generate an array of random items
 */
function generateArray<T>(size: number, generator: (value: undefined, index: number) => T): T[] {
  return Array.from({ length: size }, generator)
}

/**
 * Generate a metadata object
 */
function generateMetadata(): any {
  return {
    created: Date.now() - randomInt(0, 1000000000),
    updated: Date.now() - randomInt(0, 100000000),
    version: randomInt(1, 10),
    author: `user-${randomInt(1, 100)}`,
    checksum: randomString(32),
    tags: generateArray(randomInt(3, 8), () => `tag-${randomString(5)}`),
    flags: {
      enabled: Math.random() > 0.5,
      verified: Math.random() > 0.5,
      archived: Math.random() > 0.5,
    },
  }
}

/**
 * Generate a record object
 */
function generateRecord(id: number): any {
  return {
    recordId: `record-${id}`,
    recordValue: randomFloat(100, 10000),
    recordActive: Math.random() > 0.5,
    recordType: ["primary", "secondary", "tertiary"][randomInt(0, 2)],
    recordPriority: randomInt(1, 10),
    recordMetadata: {
      created: Date.now() - randomInt(0, 1000000000),
      category: `category-${randomInt(0, 10)}`,
      subcategory: `subcategory-${randomInt(0, 20)}`,
      tags: generateArray(randomInt(2, 5), () => `tag-${randomString(4)}`),
      extra: {
        field1: randomString(10),
        field2: randomInt(100, 999),
        field3: randomFloat(1.0, 100.0),
        nested: {
          deep1: randomString(8),
          deep2: randomInt(1, 100),
          deep3: Math.random() > 0.5,
        },
      },
    },
  }
}

/**
 * Generate a complex nested node
 */
function generateNode(depth: number, maxDepth: number, id: string): any {
  const node: any = {
    id,
    name: `Node-${id}`,
    depth,
    value: randomInt(100, 10000),
    score: randomFloat(0, 1000),
    active: Math.random() > 0.5,
    type: ["branch", "leaf", "root"][randomInt(0, 2)],
    timestamp: Date.now() - randomInt(0, 1000000000),
    metadata: generateMetadata(),
    config: {
      setting1: randomString(10),
      setting2: randomInt(1, 100),
      setting3: Math.random() > 0.5,
      setting4: randomFloat(0.0, 100.0),
      nested: {
        deep1: randomString(8),
        deep2: randomInt(1, 50),
        deep3: Math.random() > 0.5,
        deep4: {
          veryDeep1: randomString(12),
          veryDeep2: generateArray(randomInt(3, 7), () => randomInt(1, 100)),
          veryDeep3: {
            ultraDeep1: randomString(6),
            ultraDeep2: Math.random() > 0.5,
          },
        },
      },
      advanced: {
        timeout: randomInt(1000, 10000),
        retries: randomInt(1, 5),
        batch: Math.random() > 0.5,
        compression: ["gzip", "brotli", "none"][randomInt(0, 2)],
      },
    },
    tags: generateArray(randomInt(5, 8), () => `tag-${randomString(5)}`),
    numbers: generateArray(randomInt(8, 12), () => randomInt(1, 1000)),
    floats: generateArray(randomInt(6, 10), () => randomFloat(0.0, 100.0)),
    flags: generateArray(randomInt(4, 6), () => `flag-${randomString(4)}`),
    items: generateArray(randomInt(5, 8), (_, idx) => ({
      itemId: idx,
      itemName: `Item-${idx}`,
      itemValue: randomFloat(10.0, 100.0),
      itemEnabled: Math.random() > 0.5,
      itemPriority: randomInt(1, 10),
      itemMetadata: {
        created: Date.now() - randomInt(0, 100000000),
        category: `cat-${randomInt(1, 5)}`,
      },
    })),
    records: generateArray(randomInt(8, 12), (_, idx) => generateRecord(idx)),
  }

  // Add nested children if we haven't reached max depth
  if (depth < maxDepth) {
    // For depth: create one deep path via child1, and leaf nodes for child2 and children
    node.child1 = generateNode(depth + 1, maxDepth, `${id}-c1`)

    // child2 is a leaf (doesn't go deeper)
    const child2: any = {
      id: `${id}-c2`,
      name: `Node-${id}-c2`,
      depth: depth + 1,
      value: randomInt(100, 10000),
      score: randomFloat(0, 1000),
      active: Math.random() > 0.5,
      type: "leaf",
    }
    node.child2 = child2

    // Only add children array at the root level with leaf nodes
    if (depth === 1) {
      node.children = generateArray(3, (_, idx) => ({
        id: `${id}-ch${idx}`,
        name: `Node-${id}-ch${idx}`,
        depth: depth + 1,
        value: randomInt(100, 10000),
        score: randomFloat(0, 1000),
        active: Math.random() > 0.5,
        type: "leaf",
      }))
    }
  }

  return node
}

/**
 * Generate the fixture and save it
 */
function generateFixture() {
  console.log("Generating complex fixture...")

  const maxDepth = 10 // Back to 10 levels
  const fixture = generateNode(1, maxDepth, "root")

  const json = JSON.stringify(fixture, null, 2)
  const sizeKB = (json.length / 1024).toFixed(2)

  console.log(`Generated fixture: ${sizeKB} KB`)

  const outputPath = join(__dirname, "fixture.json")
  writeFileSync(outputPath, json, "utf-8")

  console.log(`✅ Fixture saved to: ${outputPath}`)
  console.log(`Size: ${sizeKB} KB`)
}

// Run the generator
generateFixture()
