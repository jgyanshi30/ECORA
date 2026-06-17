import type { SystemEvent } from "./ecora-core"

const KEY = "ecora_city_memory_v1"

export type CityMemory = {
  events: SystemEvent[]
  hotspots: Record<string, number>
  lastUpdated: number
}

function loadMemory(): CityMemory {
  if (typeof window === "undefined") {
    return { events: [], hotspots: {}, lastUpdated: Date.now() }
  }

  const raw = localStorage.getItem(KEY)
  if (!raw) {
    return { events: [], hotspots: {}, lastUpdated: Date.now() }
  }

  try {
    return JSON.parse(raw)
  } catch {
    return { events: [], hotspots: {}, lastUpdated: Date.now() }
  }
}

function saveMemory(memory: CityMemory) {
  localStorage.setItem(KEY, JSON.stringify(memory))
}

export function getMemory(): CityMemory {
  return loadMemory()
}

export function addEventToMemory(event: SystemEvent) {
  const memory = loadMemory()

  memory.events = [event, ...memory.events].slice(0, 200)

  const key = `${event.city}-${event.type}`
  memory.hotspots[key] = (memory.hotspots[key] || 0) + 1

  memory.lastUpdated = Date.now()

  saveMemory(memory)
  return memory
}

export function evolveHotspots(memory: CityMemory) {
  // slowly decay or grow intensity (simulated city evolution)
  Object.keys(memory.hotspots).forEach((k) => {
    memory.hotspots[k] = Math.max(1, memory.hotspots[k] - 0.1)
  })

  saveMemory(memory)
  return memory
}

export function clearMemory() {
  localStorage.removeItem(KEY)
}