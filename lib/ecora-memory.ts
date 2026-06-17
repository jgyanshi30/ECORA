const memory: any[] = []

export function addEventToMemory(event: any) {
  memory.unshift(event)
}

export function getMemory() {
  return memory
}

export const ecoraMemory = {
  addEventToMemory,
  getMemory,
}