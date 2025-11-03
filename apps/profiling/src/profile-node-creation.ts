import { mkdirSync, writeFileSync } from "node:fs"
import { Session } from "node:inspector"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { node } from "mobx-bonsai"
import fixtureData from "./fixture.json" with { type: "json" }

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Sleep for the specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates a node from the fixed structure loaded from JSON
 */
function createComplexNodeFromFixedStructure(structure: any, nodeFactory: any): any {
  return nodeFactory(structure)
}

/**
 * Profile node creation and generate Chrome DevTools compatible profile
 */
async function profileNodeCreation() {
  console.log("Starting profiler...")

  const session = new Session()
  session.connect()

  // Start profiling
  await new Promise<void>((resolve) => {
    session.post("Profiler.enable", () => {
      session.post("Profiler.start", () => {
        resolve()
      })
    })
  })

  console.log("Profiler started. Creating complex nodes from fixed structure...")
  console.log(`Loaded fixture data from fixture.json`)

  const startTime = performance.now()

  // Create multiple complex nodes from the same fixed structure
  const iterations = 10

  for (let i = 0; i < iterations; i++) {
    console.log(`Creating node ${i + 1}/${iterations}...`)

    // Mark the start of node creation
    const markStart = `node-${i}-start`
    const markEnd = `node-${i}-end`
    const measureName = `Node ${i + 1} Creation`

    performance.mark(markStart)
    const complexNode = createComplexNodeFromFixedStructure(fixtureData, node)
    performance.mark(markEnd)
    performance.measure(measureName, markStart, markEnd)

    // Access some properties to ensure everything is fully initialized
    void complexNode.id
    void complexNode.child1.id
    void complexNode.child2.id
    void complexNode.children[0].id

    // Pause between node creations
    await sleep(10)
  }
  const endTime = performance.now()
  console.log(`\nCreated ${iterations} nodes in ${(endTime - startTime).toFixed(2)}ms`)
  console.log(`Average: ${((endTime - startTime) / iterations).toFixed(2)}ms per node`)

  // Stop profiling and collect results
  console.log("Stopping profiler...")

  const profile = await new Promise<any>((resolve) => {
    session.post("Profiler.stop", (err, { profile }) => {
      if (err) {
        console.error("Error stopping profiler:", err)
        process.exit(1)
      }
      resolve(profile)
    })
  })

  session.disconnect()

  // Write profile to file in the out/ directory
  const outDir = join(__dirname, "..", "out")
  mkdirSync(outDir, { recursive: true })
  const outputPath = join(outDir, "node-creation-profile.cpuprofile")
  writeFileSync(outputPath, JSON.stringify(profile, null, 2))

  console.log(`\n✅ Profile saved to: ${outputPath}`)
  console.log("\nTo view the profile:")
  console.log("1. Open Chrome DevTools (F12)")
  console.log("2. Go to the 'Performance' or 'JavaScript Profiler' tab")
  console.log("3. Click 'Load' and select the .cpuprofile file")
  console.log("\nAlternatively, you can use the 'Sources' tab -> 'Performance' panel")
}

// Run the profiler
profileNodeCreation().catch((err) => {
  console.error("Profiling failed:", err)
  process.exit(1)
})
