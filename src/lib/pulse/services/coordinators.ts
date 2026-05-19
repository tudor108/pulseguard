import type { Coordinator } from "./types";

export const coordinatorsMock: Coordinator[] = [
  {
    id: "c-emily",
    name: "Dr. Emily Carter",
    role: "Coordonator operatiuni clinice",
    unit: "Planificare personal ATI",
  },
  {
    id: "c-james",
    name: "Dr. James Morgan",
    role: "Attending Physician",
    unit: "Departament Urgente",
  },
  { id: "c-sofia", name: "Dr. Sofia Bennett", role: "Sef departament", unit: "Chirurgie" },
  { id: "c-olivia", name: "Nurse Lead Olivia Hayes", role: "Charge Nurse", unit: "Pediatrie" },
  {
    id: "c-daniel",
    name: "Operations Manager Daniel Price",
    role: "Operations Manager",
    unit: "Multi-sectie Prezentare",
  },
];
