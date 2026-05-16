import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import avatarEmily from "@/assets/avatar-emily.jpg";
import avatarFemale from "@/assets/avatar-female.jpg";
import avatarFemaleOps from "@/assets/avatar-female-ops.jpg";
import avatarMale from "@/assets/avatar-male.jpg";
import avatarMaleOps from "@/assets/avatar-male-ops.jpg";

export const UNITS = [
  "Unitate Terapie Intensiva",
  "Departament Urgente",
  "Sectie Chirurgie",
  "Pediatrie",
  "Oncologie",
  "Multi-sectie Prezentare",
] as const;

export type Gender = "female" | "male";

export const COORDINATORS = [
  { name: "Dr. Emily Carter",                role: "Clinical Operations Coordinator", unit: "Unitate Terapie Intensiva",  gender: "female" as Gender, avatar: avatarEmily,     email: "emily.carter@pulseguard.health",  phone: "+1 (415) 555-0142", timezone: "America/Los_Angeles" },
  { name: "Dr. James Morgan",                role: "Attending Physician",             unit: "Departament Urgente", gender: "male"   as Gender, avatar: avatarMale,      email: "james.morgan@pulseguard.health",  phone: "+1 (212) 555-0188", timezone: "America/New_York" },
  { name: "Dr. Sofia Bennett",               role: "Department Head",                 unit: "Sectie Chirurgie",        gender: "female" as Gender, avatar: avatarFemaleOps, email: "sofia.bennett@pulseguard.health", phone: "+1 (617) 555-0119", timezone: "America/New_York" },
  { name: "Nurse Lead Olivia Hayes",         role: "Charge Nurse",                    unit: "Pediatrie",           gender: "female" as Gender, avatar: avatarFemale,    email: "olivia.hayes@pulseguard.health",  phone: "+1 (312) 555-0167", timezone: "America/Chicago" },
  { name: "Operations Manager Daniel Price", role: "Operations Manager",              unit: "Multi-sectie Prezentare",  gender: "male"   as Gender, avatar: avatarMaleOps,   email: "daniel.price@pulseguard.health",  phone: "+1 (206) 555-0124", timezone: "America/Los_Angeles" },
] as const;

export type Unit = typeof UNITS[number];
export type Coordinator = typeof COORDINATORS[number]["name"];
export type Theme = "light" | "dark" | "system" | "high-contrast";

export function getCoordinator(name: Coordinator) {
  return COORDINATORS.find((c) => c.name === name) ?? COORDINATORS[0];
}

type ProfilCtx = {
  unit: Unit;
  coordinator: Coordinator;
  theme: Theme;
  setUnit: (u: Unit) => void;
  setCoordinator: (c: Coordinator) => void;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ProfilCtx | null>(null);

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark", "hc");
  if (theme === "high-contrast") {
    root.classList.add("dark", "hc");
  } else if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(prefersDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

export function ProfilProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<Unit>("Unitate Terapie Intensiva");
  const [coordinator, setCoordinatorState] = useState<Coordinator>("Dr. Emily Carter");
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const u = localStorage.getItem("pg:unit") as Unit | null;
      const c = localStorage.getItem("pg:coord") as Coordinator | null;
      const t = (localStorage.getItem("pg:theme") as Theme | null) || "dark";
      if (u) setUnitState(u);
      if (c) setCoordinatorState(c);
      setThemeState(t);
      applyTheme(t);
    } catch {}
  }, []);

  const setUnit = (u: Unit) => { setUnitState(u); try { localStorage.setItem("pg:unit", u); } catch {} };
  const setCoordinator = (c: Coordinator) => { setCoordinatorState(c); try { localStorage.setItem("pg:coord", c); } catch {} };
  const setTheme = (t: Theme) => { setThemeState(t); applyTheme(t); try { localStorage.setItem("pg:theme", t); } catch {} };

  return <Ctx.Provider value={{ unit, coordinator, theme, setUnit, setCoordinator, setTheme }}>{children}</Ctx.Provider>;
}

export function useProfil() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useProfil must be used within ProfilProvider");
  return c;
}

// Backward-compatible aliases used across the app.
export const ProfileProvider = ProfilProvider;
export const useProfile = useProfil;
