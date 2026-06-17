export const ecoraMemory = {
  role: null as string | null,
  events: [] as any[],

  setRole(role: string) {
    if (typeof window === "undefined") return
    localStorage.setItem("ecora_role", role)
  },

  getRole() {
    if (typeof window === "undefined") return null
    return localStorage.getItem("ecora_role")
  },

  saveEvents(events: any[]) {
    if (typeof window === "undefined") return
    localStorage.setItem("ecora_events", JSON.stringify(events))
  },

  loadEvents() {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem("ecora_events")
    return data ? JSON.parse(data) : []
  },
}