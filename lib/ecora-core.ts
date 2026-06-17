export type EventType =
  | "Waste Detected"
  | "Pothole Detected"
  | "Citizen Report Submitted"
  | "Hotspot Verified"

export type Severity = "low" | "medium" | "high"

export type SystemEvent = {
  id: string
  type: EventType
  severity: Severity
  confidence: number
  city: string
  timestamp: number
}

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const cities = ["Jaipur", "Jodhpur", "Udaipur", "Ajmer", "Kota"]

const types: EventType[] = [
  "Waste Detected",
  "Pothole Detected",
  "Citizen Report Submitted",
  "Hotspot Verified",
]

function severityFromType(type: EventType): Severity {
  if (type === "Hotspot Verified") return "medium"
  if (type === "Waste Detected") return "high"
  return "low"
}

function confidence() {
  return 75 + Math.floor(Math.random() * 25)
}

/* ================= CORE ENGINE ================= */

export function generateEvent(): SystemEvent {
  const type = rand(types)

  return {
    id: Date.now().toString() + Math.random(),
    type,
    severity: severityFromType(type),
    confidence: confidence(),
    city: rand(cities),
    timestamp: Date.now(),
  }
}

/* AI reasoning simulation */
export function generateReasoning(event: SystemEvent) {
  return {
    insight:
      event.type === "Waste Detected"
        ? "Detected via clustering of waste signatures and edge anomaly patterns."
        : event.type === "Pothole Detected"
        ? "Road surface deformation detected using texture variance analysis."
        : "Multi-source civic signal correlation confirmed.",

    confidence: event.confidence,
    severity: event.severity,
  }
}

/* Citizen interaction hook */
export function registerCitizenAction(type: string) {
  return {
    acknowledged: true,
    impact: type,
    timestamp: Date.now(),
  }
}