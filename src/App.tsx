import React, { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import logoImg from "@/imports/Screenshot_2026-06-09_151556-1.png"

// ─── Brand Theme ─────────────────────────────────────────────────────────────
const B = {
  indigo:    "#3c3b8e",
  teal:      "#00afaa",
  orange:    "#f97316",
  magenta:   "#d4147a",
  green:     "#22c55e",
  red:       "#ef4444",
  blue:      "#3b82f6",
  sky:       "#38bdf8",
  purple:    "#7c3aed",
  gold:      "#d4af37",
  pink:      "#ec4899",
}

// Supabase Cloud Configuration
const SUPABASE_URL = "https://mtadbfenjfrdajibcejc.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YWRiZmVuamZyZGFqaWJjZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjU2NDMsImV4cCI6MjEwMjgwMTY0M30.uu84lV3fwOSLP8HCqYR_zH5eGAq3Z_wnmPyNvNtshoc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Ranchers for headings, Noto Sans for body text
const FH: React.CSSProperties = { fontFamily: "'Ranchers', cursive", fontWeight: 400, letterSpacing: "0.02em" }
const FB: React.CSSProperties = { fontFamily: "'Noto Sans', sans-serif" }
const FM: React.CSSProperties = { fontFamily: "monospace" }

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Ranchers&family=Noto+Sans:wght@400;500;600;700;800&display=swap'); .rich-text-edit:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;} .rich-text-edit ol{margin-left:1.2em;padding-left:0.5em;} .rich-text-edit ul{margin-left:1.2em;padding-left:0.5em;}`

// Helper utilities
function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function sessionId(): string {
  let s = ""
  try { s = sessionStorage.getItem("chezacheza_session") || "" } catch { }
  if (!s) { s = uid(); try { sessionStorage.setItem("chezacheza_session", s) } catch { } }
  return s
}

interface Hub {
  id: string
  name: string
  junior: string
  senior: string
  signedConsent: string
  missingConsent: string
  newStudents: string
}

interface Community {
  id: string
  name: string
  color: string
  hubs: Hub[]
}

interface ActionItem {
  id: string
  text: string
  owner: string
  deadline: string
  status: string
  department: string
  weekId: string
}

interface Dept {
  id: string
  name: string
  iconKey: string
  category: string
  update: string
  actionItems: ActionItem[]
  expanded: boolean
  reported: boolean
  updatedBy: string
  sticker: string
  isLocked: boolean
  lockPin: string
}

interface Staffing {
  entrants: string[]
  exits: string[]
  onLeave: { id: string; name: string; startDate: string; endDate: string }[]
  mathareOffice: string[]
}

interface Announcement {
  id: string
  text: string
  postedBy: string
  date: string
  isUrgent: boolean
}

interface ChatMessage {
  id: string
  sender: string
  text: string
  timestamp: string
  mentionedEmails: string[]
}

interface Meeting {
  id: string
  weekNumber: number
  date: string
  status: string
  impactData: Community[]
  departments: Dept[]
  staffing: Staffing
  announcements: Announcement[]
  createdAt: string
  numbersLocked: boolean
  gcCounters: { oneOnOnesParents: string; oneOnOnesChildren: string; groupTherapy: string; familyTherapy: string }
  happySchoolsStudents: string
  beatMathare: string
  beatKibera: string
  chatMessages: ChatMessage[]
}

interface Root {
  meetings: Meeting[]
  activeMeetingId: string
  settings: { sheetsUrl: string; departments: Dept[] }
}

function emptyHub(name: string): Hub {
  return { id: uid(), name, junior: "", senior: "", signedConsent: "", missingConsent: "", newStudents: "" }
}

const DEFAULT_IMPACT: Omit<Community, "id" | "hubs"> & { hubs: Hub[] }[] = [
  { name: "Mathare",      color: B.magenta, hubs: ["St.Lwang'a", "MathareNorth", "T.Area", "Dandora 2"].map(emptyHub) },
  { name: "Kibera North", color: B.indigo,  hubs: ["Vuma", "Ayany", "Rongai", "Ruiru", "Dagoretti"].map(emptyHub) },
  { name: "Kibera South", color: B.teal,    hubs: ["Kambi Muru", "Kisumu Ndogo", "Gatwekera", "Mashimoni", "DC"].map(emptyHub) },
  { name: "Eastlands",    color: B.orange,  hubs: ["Korogocho", "LungaLunga", "Mukuru kwa Rueben", "Dandora 4", "Dandora 5"].map(emptyHub) },
]

const DEFAULT_DEPTS: Omit<Dept, "update" | "actionItems" | "expanded" | "reported" | "updatedBy" | "sticker" | "isLocked" | "lockPin">[] = [
  { id: "comm-kn",   name: "Community Kibera North",                 iconKey: "👥",   category: "programs" },
  { id: "comm-ks",   name: "Community Kibera South",                 iconKey: "👥",   category: "programs" },
  { id: "comm-mt",   name: "Community Mathare",                      iconKey: "👥",   category: "programs" },
  { id: "comm-el",   name: "Community Eastlands",                    iconKey: "👥",   category: "programs" },
  { id: "comm-lead", name: "Community Leadership",                   iconKey: "🧭",   category: "programs" },
  { id: "happy",     name: "Happy Schools",                          iconKey: "⭐",   category: "programs" },
  { id: "beat",      name: "The BEAT",                               iconKey: "🏆",   category: "programs" },
  { id: "allstars",  name: "AllStars",                               iconKey: "🌿",   category: "programs" },
  { id: "strat",     name: "Strategic Comms & Partnerships",         iconKey: "📢",   category: "departmental" },
  { id: "gc",        name: "Guidance & Counseling / Safeguarding",   iconKey: "🛡️",   category: "departmental" },
  { id: "finance",   name: "Finance",                                iconKey: "💰",   category: "departmental" },
  { id: "hr",        name: "HR",                                     iconKey: "👥",   category: "departmental" },
  { id: "procure",   name: "Procurement",                            iconKey: "🔧",   category: "departmental" },
]

const STORAGE_KEY = "chezacheza_mmm_v12"
const AUTH_USER_KEY = "chezacheza_auth_user_v2"
const AUTO_SAVE_DEBOUNCE_MS = 600
const SESSION_ID = sessionId()

const MOOD_KEY = "chezachezadance_mood_v1"
const MOODS = [
  { id: "calm",      emoji: "😌", label: "Calm",        color: B.teal },
  { id: "terrific",  emoji: "🤩", label: "Terrific",    color: B.green },
  { id: "good",      emoji: "😊", label: "Good",        color: B.sky },
  { id: "notsowell", emoji: "😔", label: "Not So Well", color: B.orange },
]
const TEXT_COLORS = [B.indigo, B.teal, B.magenta, B.red, B.green, B.orange, B.gold, B.pink, B.blue, B.purple]

const SC: Record<string, { label: string; bg: string; border: string; text: string; icon: string }> = {
  pending:      { label: "Pending",      bg: "#fff7ed", border: "#f97316", text: "#c2410c", icon: "🕒" },
  hazard:       { label: "At Risk",      bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "⚠️" },
  accomplished: { label: "Accomplished", bg: "#f0fdf4", border: "#22c55e", text: "#15803d", icon: "✅" },
  protected:    { label: "Protected",    bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "🛡️" },
}

function createMeeting(wk: number, defs: typeof DEFAULT_DEPTS): Meeting {
  return {
    id: uid(),
    weekNumber: wk,
    date: new Date().toISOString().split("T")[0],
    status: "draft",
    impactData: DEFAULT_IMPACT.map(c => ({ ...c, id: uid(), hubs: c.hubs.map(h => ({ ...h, id: uid() })) })),
    departments: defs.map(d => ({ ...d, update: "", actionItems: [], expanded: true, reported: false, updatedBy: "", sticker: "pending", isLocked: false, lockPin: "" })),
    staffing: { entrants: [], exits: [], onLeave: [], mathareOffice: [] },
    announcements: [],
    createdAt: new Date().toISOString(),
    numbersLocked: false,
    gcCounters: { oneOnOnesParents: "", oneOnOnesChildren: "", groupTherapy: "", familyTherapy: "" },
    happySchoolsStudents: "",
    beatMathare: "",
    beatKibera: "",
    chatMessages: [],
  }
}

function loadRoot(): Root {
  try {
    const r = localStorage.getItem(STORAGE_KEY)
    if (r) {
      const parsed = JSON.parse(r) as Root
      // Ensure new fields exist on older saved data
      parsed.meetings = parsed.meetings.map(ensureMeetingFields)
      return parsed
    }
  } catch { /* sandbox may block localStorage */ }
  const initialMeeting = createMeeting(29, DEFAULT_DEPTS as any)
  return { meetings: [initialMeeting], activeMeetingId: initialMeeting.id, settings: { sheetsUrl: "", departments: DEFAULT_DEPTS as any } }
}

function ensureMeetingFields(m: Meeting): Meeting {
  return {
    ...m,
    numbersLocked: m.numbersLocked ?? false,
    gcCounters: m.gcCounters ?? { oneOnOnesParents: "", oneOnOnesChildren: "", groupTherapy: "", familyTherapy: "" },
    happySchoolsStudents: (m as any).happySchoolsStudents ?? "",
    beatMathare: (m as any).beatMathare ?? "",
    beatKibera: (m as any).beatKibera ?? "",
    chatMessages: (m as any).chatMessages ?? [],
    departments: (m.departments || []).map((d: Dept) => ({ ...d, lockPin: d.lockPin ?? "", isLocked: d.isLocked ?? false })),
    impactData: (m.impactData || []).map((c: Community) => ({ ...c, hubs: (c.hubs || []).map((h: Hub) => ({ ...h })) })),
  }
}

function saveRoot(s: Root) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* sandbox */ }
}

// ─── BACKEND SYNC (Google Apps Script) ─────────────────────────────────────
async function fetchRemoteState(url: string): Promise<Root | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { method: "GET" })
    if (!res.ok) return null
    const data = await res.json()
    return data && data.meetings ? data as Root : null
  } catch {
    return null
  }
}

async function pushRemoteState(url: string, state: Root, notify?: any) {
  if (!url) return
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(notify ? { ...state, __notify: notify } : state),
    })
  } catch { /* local cache still safe */ }
}

function sumHub(h: Hub) {
  const j = Math.max(0, parseInt(h.junior) || 0)
  const s = Math.max(0, parseInt(h.senior) || 0)
  const sc = Math.max(0, parseInt(h.signedConsent) || 0)
  const mc = Math.max(0, parseInt(h.missingConsent) || 0)
  const ns = Math.max(0, parseInt(h.newStudents) || 0)
  return { total: j + s, j, s, sc, mc, ns }
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────────────
function exportMeetingToCSV(meeting: Meeting) {
  const csvRows: string[] = []
  csvRows.push(["Category", "Department / Region", "Hub / Detail", "Owner / Info", "Status / Total", "Extra Notes"].join(","))

  meeting.impactData.forEach(c => {
    c.hubs.forEach(h => {
      const s = sumHub(h)
      csvRows.push(["HUB Attendance", `"${c.name}"`, `"${h.name}"`, `"Junior: ${s.j} | Senior: ${s.s}"`, `"Total: ${s.total}"`, `"Signed: ${s.sc} | Missing: ${s.mc} | New: ${s.ns}"`].join(","))
    })
  })

  meeting.departments.forEach(d => {
    csvRows.push(["Department Narrative", `"${d.name}"`, `"Status Sticker: ${d.sticker || 'pending'}"`, `"${(d.update || 'No update logged').replace(/"/g, '""')}"`, `"Locked: ${d.isLocked ? 'Yes' : 'No'}"`, ""].join(","))
    d.actionItems?.forEach(a => {
      csvRows.push(["Action Item", `"${d.name}"`, `"${(a.text || '').replace(/"/g, '""')}"`, `"Owner: ${(a.owner || 'Unassigned').replace(/"/g, '""')}"`, `"Status: ${a.status}"`, `"Deadline: ${a.deadline || 'None'}"`].join(","))
    })
  })

  const csvString = csvRows.join("\n")
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `ChezaCheza_MMM_Week_${meeting.weekNumber}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────

function Section({ title, icon, color, badge, expanded, onToggle, children }: {
  title: string; icon: string; color: string; badge?: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border mb-5 bg-white" style={{ borderColor: "#e4e2f4", borderLeftWidth: 4, borderLeftColor: color }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-gray-50/80 transition-colors text-left">
        <span className="text-lg">{icon}</span>
        <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH, color: B.indigo }}>{title}</span>
        {badge != null && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: color + "22", color, ...FB }}>{badge}</span>}
        <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="bg-white border-t px-5 py-4 space-y-4" style={{ borderColor: "#f0eff9" }}>{children}</div>}
    </div>
  )
}

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400/30">
      <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
        <span>✅</span>
      </div>
      <div>
        <p className="font-bold text-xs" style={{ ...FH }}>Updated Successfully!</p>
        <p className="text-[11px] text-emerald-100 font-medium">{message}</p>
      </div>
      <button onClick={onClose} className="ml-2 text-emerald-200 hover:text-white">❌</button>
    </div>
  )
}

function GreetingScreen({ userName, onCheckIn }: {
  userName: string; onCheckIn: (moodId: string) => void
}) {
  const rawName = userName.split("@")[0].split(".")[0]
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  function handleContinue() {
    if (selectedMood) {
      try { sessionStorage.setItem(MOOD_KEY, selectedMood) } catch {}
      onCheckIn(selectedMood)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: B.indigo }}>
      <div className="absolute top-0 left-0 right-0 h-2 flex">
        <div className="flex-1" style={{ background: B.orange }} />
        <div className="flex-1" style={{ background: B.teal }} />
        <div className="flex-1" style={{ background: B.magenta }} />
        <div className="flex-1" style={{ background: B.green }} />
        <div className="flex-1" style={{ background: B.gold }} />
        <div className="flex-1" style={{ background: B.red }} />
      </div>
      <div className="absolute top-16 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: B.teal }} />
      <div className="absolute bottom-8 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: B.magenta }} />

      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center relative z-10 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="ChezaCheza Dance Foundation" className="h-14 w-auto object-contain" />
          <div className="h-0.5 w-16 rounded-full" style={{ background: B.orange }} />
          <h1 className="text-3xl" style={{ ...FH, color: B.indigo }}>Hi {firstName}!</h1>
          <p className="text-sm font-medium text-gray-500" style={{ ...FB }}>Where can we pick up from today?</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400" style={{ ...FB }}>How are you feeling today?</p>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map(mood => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${selectedMood === mood.id ? "scale-105 shadow-md" : "hover:scale-105"}`}
                style={{
                  borderColor: selectedMood === mood.id ? mood.color : "#e4e2f4",
                  background: selectedMood === mood.id ? mood.color + "15" : "#fafafa",
                }}
              >
                <span className="text-4xl">{mood.emoji}</span>
                <span className="text-sm font-bold" style={{ ...FH, color: mood.color }}>{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedMood}
          className="w-full text-white font-bold rounded-xl py-3 text-sm tracking-wider uppercase transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: B.teal }}
        >
          {selectedMood ? "Let's Get Started!" : "Pick a mood to continue"}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1" style={{ background: B.red }} />
        <div className="flex-1" style={{ background: B.gold }} />
        <div className="flex-1" style={{ background: B.green }} />
        <div className="flex-1" style={{ background: B.magenta }} />
        <div className="flex-1" style={{ background: B.teal }} />
        <div className="flex-1" style={{ background: B.orange }} />
      </div>
    </div>
  )
}

function RichTextEditor({ value, onChange, disabled, placeholder }: {
  value: string; onChange: (html: string) => void; disabled: boolean; placeholder: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [showColors, setShowColors] = useState(false)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
  }, [disabled])

  function exec(cmd: string, val?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    if (ref.current) onChange(ref.current.innerHTML)
    setShowColors(false)
  }

  const btnBase = "px-2 py-1 rounded text-xs font-bold border border-gray-200 hover:bg-indigo-50 transition-colors"

  return (
    <div className="w-full">
      {!disabled && (
        <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-gray-100 flex-wrap">
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("bold") }} className={btnBase} style={{ fontWeight: 800 }}>B</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("italic") }} className={btnBase} style={{ fontStyle: "italic" }}>I</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertOrderedList") }} className={btnBase}>1.</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList") }} className={btnBase}>•</button>
          <div className="relative">
            <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(!showColors) }} className={btnBase}>🎨 Color</button>
            {showColors && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex gap-1 flex-wrap w-48">
                {TEXT_COLORS.map(c => (
                  <button key={c} type="button" onMouseDown={e => { e.preventDefault(); exec("foreColor", c) }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`w-full text-xs border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${disabled ? "bg-gray-50 text-gray-500" : "bg-white"} font-medium min-h-[80px] rich-text-edit`}
        style={{ borderColor: "#d1d5db" }}
      />
    </div>
  )
}

function LockModal({ deptName, lockPin, onClose, onUnlock, onSetPin }: {
  deptName: string; lockPin: string; onClose: () => void; onUnlock: () => void; onSetPin: (pin: string) => void
}) {
  const [pin, setPin] = useState("")
  const [mode, setMode] = useState<"unlock" | "setpin" | "removepin">(lockPin ? "unlock" : "setpin")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState("")

  function handleSubmit() {
    if (mode === "unlock") {
      if (pin === lockPin) { onUnlock(); onClose() }
      else setError("Incorrect PIN. Please try again.")
    } else if (mode === "setpin") {
      if (pin.length < 3) { setError("PIN must be at least 3 digits."); return }
      if (pin !== confirmPin) { setError("PINs do not match."); return }
      onSetPin(pin); onClose()
    } else if (mode === "removepin") {
      if (pin === lockPin) { onSetPin(""); onClose() }
      else setError("Incorrect PIN. Cannot remove without verifying.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mode === "setpin" ? "🔐" : "🔒"}</span>
          <h3 className="text-lg text-indigo-950" style={{ ...FH }}>{deptName}</h3>
        </div>

        {mode === "setpin" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium">
            💡 Tip: Use a short PIN you'll remember — like your birthday digits or a simple 3-4 digit code. This avoids needing admin help to reset passwords.
          </div>
        )}

        {mode === "unlock" && <p className="text-xs text-gray-500">Enter the PIN to unlock this department's section.</p>}
        {mode === "setpin" && <p className="text-xs text-gray-500">Set a PIN to lock this department. You'll need it to unlock later.</p>}
        {mode === "removepin" && <p className="text-xs text-gray-500">Verify your current PIN to remove the lock entirely.</p>}

        <input
          type="password"
          placeholder="Enter PIN..."
          className="w-full text-sm border-2 rounded-xl px-4 py-2.5 text-center font-bold tracking-widest focus:outline-none"
          style={{ borderColor: "#e4e2f4" }}
          value={pin}
          onChange={e => { setPin(e.target.value); setError("") }}
        />
        {mode === "setpin" && (
          <input
            type="password"
            placeholder="Confirm PIN..."
            className="w-full text-sm border-2 rounded-xl px-4 py-2.5 text-center font-bold tracking-widest focus:outline-none"
            style={{ borderColor: "#e4e2f4" }}
            value={confirmPin}
            onChange={e => { setConfirmPin(e.target.value); setError("") }}
          />
        )}

        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}

        <button onClick={handleSubmit} className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
          {mode === "unlock" ? "🔓 Unlock Section" : mode === "setpin" ? "🔐 Set PIN & Lock" : "Remove PIN"}
        </button>

        {lockPin && mode === "unlock" && (
          <button onClick={() => { setMode("removepin"); setError(""); setPin("") }} className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium">
            Change or remove PIN
          </button>
        )}
        {!lockPin && mode === "setpin" && (
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium">
            Cancel
          </button>
        )}
        {lockPin && mode === "removepin" && (
          <button onClick={() => { setMode("unlock"); setError(""); setPin("") }} className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium">
            Back to unlock
          </button>
        )}
      </div>
    </div>
  )
}

function ImpactSection({ impactData, onChange, triggerToast, numbersLocked }: {
  impactData: Community[]; onChange: (d: Community[]) => void; triggerToast: (m: string) => void; numbersLocked: boolean
}) {
  const [exp, setExp] = useState(true)

  let grandTotal = 0, grandJunior = 0, grandSenior = 0, grandSC = 0, grandMC = 0, grandNS = 0
  impactData.forEach(c => {
    c.hubs.forEach(h => {
      const s = sumHub(h)
      grandTotal += s.total; grandJunior += s.j; grandSenior += s.s
      grandSC += s.sc; grandMC += s.mc; grandNS += s.ns
    })
  })

  function updateHub(communityId: string, hubId: string, field: keyof Hub, value: string) {
    onChange(impactData.map(c => c.id !== communityId ? c : { ...c, hubs: c.hubs.map(h => h.id !== hubId ? h : { ...h, [field]: value }) }))
  }

  return (
    <Section
      title="Impact Numbers — HUB Attendance"
      icon="📊"
      color={B.magenta}
      badge={grandTotal > 0 ? `${grandTotal} Total Participants` : undefined}
      expanded={exp}
      onToggle={() => setExp(!exp)}
    >
      {/* Numbers lock indicator */}
      <div className={`flex items-center justify-between rounded-xl p-3 mb-4 border ${numbersLocked ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-200"}`}>
        <span className="text-xs font-bold flex items-center gap-2" style={{ ...FB, color: numbersLocked ? B.gold : B.green }}>
          {numbersLocked ? "🔒 Attendance numbers are LOCKED — editing disabled" : "🔓 Attendance numbers are editable"}
        </span>
      </div>

      {/* Big counter — yellow-gold transparent background */}
      <div className="text-indigo-950 rounded-2xl p-5 border shadow-sm mb-5 space-y-4" style={{ background: "rgba(212, 175, 55, 0.16)", borderColor: "rgba(212, 175, 55, 0.55)" }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "rgba(212, 175, 55, 0.35)" }}>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ ...FB, color: "#92720f" }}>🌍 All Regions Combined Attendance Total</span>
            <h2 className="text-3xl mt-1 text-indigo-950 flex items-center gap-2" style={{ ...FH }}>
              {grandTotal} <span className="text-sm font-semibold" style={{ ...FB, color: "#92720f" }}>Registered Participants</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
          <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 shadow-sm">
            <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Junior</div>
            <div className="text-lg font-bold text-indigo-950 mt-0.5" style={{ ...FH }}>{grandJunior}</div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 shadow-sm">
            <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Senior</div>
            <div className="text-lg font-bold text-indigo-950 mt-0.5" style={{ ...FH }}>{grandSenior}</div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200/70 shadow-sm">
            <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Signed Consent</div>
            <div className="text-lg font-bold text-emerald-800 mt-0.5" style={{ ...FH }}>{grandSC}</div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200/70 shadow-sm">
            <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Missing Consent</div>
            <div className="text-lg font-bold text-rose-800 mt-0.5" style={{ ...FH }}>{grandMC}</div>
          </div>
          <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/70 shadow-sm col-span-2 sm:col-span-1">
            <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">New Joiners</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5" style={{ ...FH }}>{grandNS}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {impactData.map(community => {
          const communityTotal = community.hubs.reduce((acc, h) => { const s = sumHub(h); return { t: acc.t + s.total } }, { t: 0 })
          return (
            <div key={community.id} className="rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: community.color + "33" }}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: community.color + "12" }}>
                <span className="font-bold text-sm tracking-wide" style={{ ...FH, color: community.color }}>{community.name} Region</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border" style={{ color: community.color, borderColor: community.color + "33", ...FM }}>Total: {communityTotal.t}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: community.color + "08" }}>
                      {["Hub / Venue", "Junior", "Senior", "Total", "Signed Consent", "Missing Consent", "New Students"].map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: community.color + "dd", ...FB }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {community.hubs.map((hub, idx) => {
                      const s = sumHub(hub)
                      const inputCls = "w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                      return (
                        <tr key={hub.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafaf9" }}>
                          <td className="px-3 py-2 font-bold text-gray-800" style={{ ...FB }}>{hub.name}</td>
                          <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.junior} onChange={e => { updateHub(community.id, hub.id, "junior", e.target.value); triggerToast("Attendance figures recorded.") }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.senior} onChange={e => { updateHub(community.id, hub.id, "senior", e.target.value); triggerToast("Attendance figures recorded.") }} /></td>
                          <td className="px-3 py-2 font-bold text-center text-gray-900">{s.total}</td>
                          <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.signedConsent} onChange={e => { updateHub(community.id, hub.id, "signedConsent", e.target.value); triggerToast("Consent log updated.") }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.missingConsent} onChange={e => { updateHub(community.id, hub.id, "missingConsent", e.target.value); triggerToast("Consent log updated.") }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.newStudents} onChange={e => { updateHub(community.id, hub.id, "newStudents", e.target.value); triggerToast("New joiners count updated.") }} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function MainCounterSection({ meeting, impactData }: {
  meeting: Meeting; impactData: Community[]
}) {
  const communityTotal = impactData.reduce((acc, c) => acc + c.hubs.reduce((h, hub) => h + sumHub(hub).total, 0), 0)
  const happyTotal = Math.max(0, parseInt(meeting.happySchoolsStudents) || 0)
  const beatTotal = (Math.max(0, parseInt(meeting.beatMathare) || 0)) + (Math.max(0, parseInt(meeting.beatKibera) || 0))
  const gcTotal =
    (Math.max(0, parseInt(meeting.gcCounters.oneOnOnesParents) || 0)) +
    (Math.max(0, parseInt(meeting.gcCounters.oneOnOnesChildren) || 0)) +
    (Math.max(0, parseInt(meeting.gcCounters.groupTherapy) || 0)) +
    (Math.max(0, parseInt(meeting.gcCounters.familyTherapy) || 0))
  const grandTotal = communityTotal + happyTotal + beatTotal + gcTotal

  const segments = [
    { label: "Community HUB Attendance", value: communityTotal, color: B.magenta, icon: "👥" },
    { label: "Happy Schools Students",    value: happyTotal,    color: B.pink,    icon: "⭐" },
    { label: "The BEAT Students",         value: beatTotal,     color: B.green,   icon: "🏆" },
    { label: "G&C / Safeguarding Reach",   value: gcTotal,       color: B.sky,     icon: "🛡️" },
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border mb-5 bg-white" style={{ borderColor: "#e4e2f4", borderLeftWidth: 4, borderLeftColor: B.indigo }}>
      <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white">
        <div className="flex items-center gap-3">
          <span className="text-lg">🌍</span>
          <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH }}>Combined Numbers Reached — All Programs</span>
        </div>
      </div>
      <div className="bg-white px-5 py-5 space-y-4">
        <div className="text-center pb-3 border-b border-gray-100">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400" style={{ ...FB }}>Total People Reached This Week</p>
          <h2 className="text-5xl mt-2" style={{ ...FH, color: B.indigo }}>{grandTotal}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {segments.map(seg => (
            <div key={seg.label} className="rounded-xl p-3 border text-center" style={{ background: seg.color + "10", borderColor: seg.color + "33" }}>
              <div className="text-xl mb-1">{seg.icon}</div>
              <div className="text-2xl font-bold" style={{ ...FH, color: seg.color }}>{seg.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ ...FB, color: seg.color + "dd" }}>{seg.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 text-center font-medium" style={{ ...FB }}>This counter auto-updates from Community HUBs, Happy Schools, The BEAT, and Guidance & Counseling entries below.</p>
      </div>
    </div>
  )
}

function TeamChatSection({ messages, onChange, currentUser, triggerToast }: {
  messages: ChatMessage[]; onChange: (msgs: ChatMessage[]) => void; currentUser: string; triggerToast: (m: string) => void
}) {
  const [exp, setExp] = useState(true)
  const [text, setText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  function extractMentions(t: string): string[] {
    const matches = t.match(/@([\w.]+@chezachezadance\.org)/gi) || []
    return matches.map(m => m.substring(1).toLowerCase())
  }

  function send() {
    if (!text.trim()) return
    const mentioned = extractMentions(text)
    const msg: ChatMessage = { id: uid(), sender: currentUser, text: text.trim(), timestamp: new Date().toISOString(), mentionedEmails: mentioned }
    onChange([...messages, msg])
    if (mentioned.length > 0) {
      const subject = encodeURIComponent(`ChezaCheza MMM: You were mentioned by ${currentUser}`)
      const body = encodeURIComponent(`${currentUser} mentioned you in the workspace chat:\n\n"${text.trim()}"\n\nOpen the MMM workspace to see the full conversation.`)
      window.open(`mailto:${mentioned.join(",")}?subject=${subject}&body=${body}`, "_blank")
      triggerToast(`Message sent — email ping sent to ${mentioned.length} teammate(s).`)
    } else {
      triggerToast("Message posted to team chat.")
    }
    setText("")
  }

  function formatTime(ts: string) {
    try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) } catch { return "" }
  }

  const rawName = currentUser.split("@")[0].split(".")[0]
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <Section title="Team Chat & Pings" icon="💬" color={B.blue} badge={`${messages.length} messages`} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="bg-indigo-50/50 rounded-xl p-2.5 mb-3 text-[11px] text-indigo-700 font-medium flex items-center gap-2" style={{ ...FB }}>
        <span>💡</span> Tag a teammate with @their.email@chezachezadance.org to ping them directly — it opens Gmail pre-filled with your message.
      </div>
      <div ref={scrollRef} className="space-y-2 max-h-72 overflow-y-auto bg-gray-50 rounded-xl p-3 border border-gray-200">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6" style={{ ...FB }}>No messages yet. Say hi to the team, {firstName}!</p>
        ) : messages.map(msg => {
          const senderName = msg.sender.split("@")[0].split(".")[0]
          const senderDisplay = senderName.charAt(0).toUpperCase() + senderName.slice(1)
          const isMe = msg.sender === currentUser
          const renderedText = msg.text.replace(/(@[\w.]+@chezachezadance\.org)/gi, '<span style="font-weight:700;color:#3b82f6">$1</span>')
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${isMe ? "bg-indigo-700 text-white" : "bg-white border border-gray-200 text-gray-900"}`} style={{ ...FB }}>
                {!isMe && <div className="text-[10px] font-bold text-indigo-600 mb-0.5">{senderDisplay}</div>}
                <div dangerouslySetInnerHTML={{ __html: renderedText }} />
                <div className={`text-[9px] mt-1 ${isMe ? "text-indigo-300" : "text-gray-400"}`}>{formatTime(msg.timestamp)}{msg.mentionedEmails.length > 0 && " · pinged"}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          placeholder="Type a message... Use @name@chezachezadance.org to ping someone via Gmail"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send() }}
        />
        <button onClick={send} className="bg-indigo-800 hover:bg-indigo-900 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-1 transition-colors">Send</button>
      </div>
    </Section>
  )
}

function DepartmentSection({ departments, onChange, currentUser, triggerToast, meeting, onCounterChange }: {
  departments: Dept[]; onChange: (d: Dept[]) => void; currentUser: string; triggerToast: (m: string) => void; meeting: Meeting; onCounterChange: (u: Partial<Meeting>) => void
}) {
  const [exp, setExp] = useState(true)
  const [lockModalDept, setLockModalDept] = useState<Dept | null>(null)

  function updateDept(id: string, updates: Partial<Dept>) {
    onChange(departments.map(d => d.id === id ? { ...d, ...updates, updatedBy: currentUser } : d))
    triggerToast("Department report updated.")
  }

  function addActionItem(deptId: string) {
    const newItem: ActionItem = { id: uid(), text: "", owner: currentUser, deadline: "", status: "pending", department: deptId, weekId: "" }
    onChange(departments.map(d => d.id === deptId ? { ...d, actionItems: [...(d.actionItems || []), newItem] } : d))
    triggerToast("Action item added.")
  }

  function updateActionItem(deptId: string, itemId: string, updates: Partial<ActionItem>) {
    onChange(departments.map(d => d.id !== deptId ? d : { ...d, actionItems: d.actionItems.map(a => a.id === itemId ? { ...a, ...updates } : a) }))
    triggerToast("Action item updated.")
  }

  function deleteActionItem(deptId: string, itemId: string) {
    onChange(departments.map(d => d.id !== deptId ? d : { ...d, actionItems: d.actionItems.filter(a => a.id !== itemId) }))
    triggerToast("Action item removed.")
  }

  function handleLockToggle(dept: Dept) {
    if (dept.isLocked) {
      // Need to unlock — show modal to verify PIN
      setLockModalDept(dept)
    } else {
      // Need to lock — if no PIN set, show modal to create one; if PIN exists, lock directly
      if (!dept.lockPin) {
        setLockModalDept(dept)
      } else {
        updateDept(dept.id, { isLocked: true })
        triggerToast("Section locked.")
      }
    }
  }

  function handleSetPin(pin: string) {
    if (lockModalDept) {
      if (pin === "") {
        updateDept(lockModalDept.id, { isLocked: false, lockPin: "" })
        triggerToast("PIN removed. Section is now unlocked.")
      } else {
        updateDept(lockModalDept.id, { isLocked: true, lockPin: pin })
        triggerToast("PIN set and section locked.")
      }
    }
  }

  function handleUnlock() {
    if (lockModalDept) {
      updateDept(lockModalDept.id, { isLocked: false })
      triggerToast("Section unlocked.")
    }
  }

  return (
    <Section title="Departmental Updates & Action Items" icon="📋" color={B.indigo} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="space-y-6">
        {departments.map(dept => {
          const currentSticker = SC[dept.sticker || "pending"]
          return (
            <div key={dept.id} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-indigo-950 text-base" style={{ ...FH }}>{dept.name}</span>
                  {dept.isLocked && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🔒 Locked</span>}
                  {dept.lockPin && !dept.isLocked && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">🔐 PIN Protected</span>}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1" style={{ background: currentSticker.bg, borderColor: currentSticker.border, color: currentSticker.text }}>
                    {currentSticker.icon} {currentSticker.label}
                  </span>
                  <button onClick={() => handleLockToggle(dept)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700" title={dept.isLocked ? "Unlock section" : "Lock section with PIN"}>
                    {dept.isLocked ? <span className="text-amber-600">🔒</span> : <span>🔓</span>}
                  </button>
                </div>
              </div>

              {/* Inline program counters for specific departments */}
              {dept.id === "happy" && (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "rgba(236, 72, 153, 0.08)", borderColor: "rgba(236, 72, 153, 0.3)" }}>
                  <span className="text-2xl">⭐</span>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#9d174d" }}>Total Students Reached</span>
                    <div className="text-2xl font-bold" style={{ ...FH, color: B.pink }}>{Math.max(0, parseInt(meeting.happySchoolsStudents) || 0)}</div>
                  </div>
                  <input type="number" min="0" disabled={dept.isLocked} className="w-24 text-sm border-2 rounded-lg px-3 py-2 font-bold focus:outline-none" style={{ borderColor: "rgba(236, 72, 153, 0.3)" }} value={meeting.happySchoolsStudents} onChange={e => { onCounterChange({ happySchoolsStudents: e.target.value }); triggerToast("Happy Schools counter updated.") }} />
                </div>
              )}
              {dept.id === "beat" && (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "rgba(34, 197, 94, 0.08)", borderColor: "rgba(34, 197, 94, 0.3)" }}>
                  <span className="text-2xl">🏆</span>
                  <div className="flex-1 grid grid-cols-3 gap-2 items-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#15803d" }}>Total BEAT</span>
                      <div className="text-xl font-bold" style={{ ...FH, color: B.green }}>{(Math.max(0, parseInt(meeting.beatMathare) || 0)) + (Math.max(0, parseInt(meeting.beatKibera) || 0))}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500">Mathare</span>
                      <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.beatMathare} onChange={e => { onCounterChange({ beatMathare: e.target.value }); triggerToast("BEAT Mathare updated.") }} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500">Kibera</span>
                      <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.beatKibera} onChange={e => { onCounterChange({ beatKibera: e.target.value }); triggerToast("BEAT Kibera updated.") }} />
                    </div>
                  </div>
                </div>
              )}
              {dept.id === "gc" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl border" style={{ background: "rgba(56, 189, 248, 0.08)", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>1:1s — Parents</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.sky }}>{Math.max(0, parseInt(meeting.gcCounters.oneOnOnesParents) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.oneOnOnesParents} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, oneOnOnesParents: e.target.value } }); triggerToast("1:1s (Parents) counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>1:1s — Children</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.sky }}>{Math.max(0, parseInt(meeting.gcCounters.oneOnOnesChildren) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.oneOnOnesChildren} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, oneOnOnesChildren: e.target.value } }); triggerToast("1:1s (Children) counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>Group Therapy</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.sky }}>{Math.max(0, parseInt(meeting.gcCounters.groupTherapy) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.groupTherapy} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, groupTherapy: e.target.value } }); triggerToast("Group therapy counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>Family Therapy</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.sky }}>{Math.max(0, parseInt(meeting.gcCounters.familyTherapy) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.familyTherapy} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, familyTherapy: e.target.value } }); triggerToast("Family therapy counter updated.") }} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Weekly Operational Update / Narrative</label>
                <RichTextEditor
                  value={dept.update}
                  onChange={html => updateDept(dept.id, { update: html })}
                  disabled={dept.isLocked}
                  placeholder="Type department update here... Use the toolbar above for Bold, Italic, Numbered Lists, and Colors."
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Department Action Items ({dept.actionItems?.length || 0})</span>
                  {!dept.isLocked && (
                    <button onClick={() => addActionItem(dept.id)} className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      ➕ Add Action Item
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {dept.actionItems?.map(item => {
                    const st = SC[item.status]
                    return (
                      <div key={item.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                        <input disabled={dept.isLocked} className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 font-medium bg-white focus:outline-none" placeholder="Action item task description..." value={item.text} onChange={e => updateActionItem(dept.id, item.id, { text: e.target.value })} />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input disabled={dept.isLocked} className="w-28 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none" placeholder="Owner" value={item.owner} onChange={e => updateActionItem(dept.id, item.id, { owner: e.target.value })} />
                          <input disabled={dept.isLocked} type="date" className="w-32 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none" value={item.deadline} onChange={e => updateActionItem(dept.id, item.id, { deadline: e.target.value })} />
                          <select disabled={dept.isLocked} className="text-xs border rounded px-2 py-1 font-bold bg-white" style={{ color: st.text, borderColor: st.border }} value={item.status} onChange={e => updateActionItem(dept.id, item.id, { status: e.target.value })}>
                            <option value="pending">🕒 Pending</option>
                            <option value="hazard">⚠️ At Risk</option>
                            <option value="accomplished">✅ Accomplished</option>
                            <option value="protected">🛡️ Protected</option>
                          </select>
                          {!dept.isLocked && <button onClick={() => deleteActionItem(dept.id, item.id)} className="text-gray-400 hover:text-red-600 p-1">🗑️</button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {lockModalDept && (
        <LockModal
          deptName={lockModalDept.name}
          lockPin={lockModalDept.lockPin}
          onClose={() => setLockModalDept(null)}
          onUnlock={handleUnlock}
          onSetPin={handleSetPin}
        />
      )}
    </Section>
  )
}

function StaffingSection({ staffing, onChange, triggerToast }: {
  staffing: Staffing; onChange: (s: Staffing) => void; triggerToast: (m: string) => void
}) {
  const [exp, setExp] = useState(true)
  const [entrantInput, setEntrantInput] = useState("")
  const [exitInput, setExitInput] = useState("")
  const [leaveName, setLeaveName] = useState("")
  const [leaveStart, setLeaveStart] = useState("")
  const [leaveEnd, setLeaveEnd] = useState("")

  function addEntrant() {
    if (!entrantInput.trim()) return
    onChange({ ...staffing, entrants: [...staffing.entrants, entrantInput.trim()] })
    setEntrantInput("")
    triggerToast("Staff entrant recorded.")
  }

  function addExit() {
    if (!exitInput.trim()) return
    onChange({ ...staffing, exits: [...staffing.exits, exitInput.trim()] })
    setExitInput("")
    triggerToast("Staff exit recorded.")
  }

  function addLeave() {
    if (!leaveName.trim()) return
    const entry = { id: uid(), name: leaveName.trim(), startDate: leaveStart, endDate: leaveEnd }
    onChange({ ...staffing, onLeave: [...staffing.onLeave, entry] })
    setLeaveName(""); setLeaveStart(""); setLeaveEnd("")
    triggerToast("Leave log added.")
  }

  return (
    <Section title="Staffing & Presence Log" icon="👥" color={B.teal} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
          <h4 className="font-bold text-emerald-900 uppercase flex items-center gap-1.5" style={{ ...FB }}><span>👤+</span> New Joining Entrants</h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={entrantInput} onChange={e => setEntrantInput(e.target.value)} />
            <button onClick={addEntrant} className="bg-emerald-700 text-white font-bold px-2.5 rounded text-xs">Add</button>
          </div>
          <ul className="space-y-1 pt-1">
            {staffing.entrants.map((name, i) => (
              <li key={i} className="flex justify-between items-center bg-white p-1.5 rounded border border-emerald-100">
                <span>{name}</span>
                <button onClick={() => onChange({ ...staffing, entrants: staffing.entrants.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600">❌</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
          <h4 className="font-bold text-rose-900 uppercase flex items-center gap-1.5" style={{ ...FB }}><span>👤-</span> Staff Departures / Exits</h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={exitInput} onChange={e => setExitInput(e.target.value)} />
            <button onClick={addExit} className="bg-rose-700 text-white font-bold px-2.5 rounded text-xs">Add</button>
          </div>
          <ul className="space-y-1 pt-1">
            {staffing.exits.map((name, i) => (
              <li key={i} className="flex justify-between items-center bg-white p-1.5 rounded border border-rose-100">
                <span>{name}</span>
                <button onClick={() => onChange({ ...staffing, exits: staffing.exits.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600">❌</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
          <h4 className="font-bold text-indigo-900 uppercase flex items-center gap-1.5" style={{ ...FB }}><span>📅</span> On Leave</h4>
          <div className="space-y-1">
            <input className="w-full border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={leaveName} onChange={e => setLeaveName(e.target.value)} />
            <div className="flex gap-1">
              <input type="date" className="w-1/2 border rounded p-1 bg-white text-[11px]" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} />
              <input type="date" className="w-1/2 border rounded p-1 bg-white text-[11px]" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} />
            </div>
            <button onClick={addLeave} className="w-full bg-indigo-800 text-white font-bold py-1 rounded text-xs mt-1">Log Leave</button>
          </div>
          <ul className="space-y-1 pt-1">
            {staffing.onLeave.map((item, i) => {
              const label = typeof item === "string" ? item : `${item.name} (${item.startDate || "?"} to ${item.endDate || "?"})`
              return (
                <li key={i} className="flex justify-between items-center bg-white p-1.5 rounded border border-indigo-100">
                  <span className="truncate pr-1">{label}</span>
                  <button onClick={() => onChange({ ...staffing, onLeave: staffing.onLeave.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600">❌</button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Section>
  )
}

function AnnouncementsSection({ announcements, onChange, currentUser, triggerToast, onNotifyUrgent }: {
  announcements: Announcement[]; onChange: (a: Announcement[]) => void; currentUser: string; triggerToast: (m: string) => void; onNotifyUrgent: (a: Announcement) => void
}) {
  const [exp, setExp] = useState(true)
  const [text, setText] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(true)

  function post() {
    if (!text.trim()) return
    const newA: Announcement = { id: uid(), text: text.trim(), postedBy: currentUser, date: new Date().toLocaleDateString(), isUrgent: urgent }
    onChange([newA, ...announcements])
    if (urgent && notifyEmail && onNotifyUrgent) { onNotifyUrgent(newA); triggerToast("Announcement published — email alert sent.") }
    else { triggerToast("Announcement published.") }
    setText(""); setUrgent(false)
  }

  return (
    <Section title="Key Reminders & Announcements" icon="📢" color={B.orange} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="space-y-3 text-xs">
        <div className="p-3 bg-orange-50/50 border border-orange-200 rounded-xl space-y-2">
          <textarea rows={2} className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none" placeholder="Type general reminder or urgent announcement..." value={text} onChange={e => setText(e.target.value)} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-orange-950"><input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} /> Mark as Urgent</label>
              {urgent && <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-orange-800"><input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} /> ✉️ Email admins</label>}
            </div>
            <button onClick={post} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">Publish Announcement</button>
          </div>
        </div>

        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${a.isUrgent ? "bg-red-50 border-red-200 text-red-950" : "bg-white border-gray-200 text-gray-900"}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {a.isUrgent && <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Urgent</span>}
                  <span className="font-bold text-xs">{a.postedBy}</span>
                  <span className="text-[10px] text-gray-400">{a.date}</span>
                </div>
                <p className="font-medium text-xs leading-relaxed">{a.text}</p>
              </div>
              <button onClick={() => onChange(announcements.filter(item => item.id !== a.id))} className="text-gray-400 hover:text-red-600 p-1">❌</button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function EnhancedAdminPanel({ meeting, onUpdateMeeting, onSpawnWeek, onDeleteMeeting, triggerToast, currentUser, settings, onUpdateSettings, root, onToggleNumbersLock }: {
  meeting: Meeting; onUpdateMeeting: (u: Partial<Meeting>) => void; onSpawnWeek: (wk: number) => void; onDeleteMeeting: (id: string) => void; triggerToast: (m: string) => void; currentUser: string; settings: Root["settings"]; onUpdateSettings: (u: Partial<Root["settings"]>) => void; root: Root; onToggleNumbersLock: () => void
}) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passError, setPassError] = useState(false)
  const [spawnWk, setSpawnWk] = useState(meeting.weekNumber + 1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; week: number } | null>(null)

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (passwordInput === "cheza") { setIsAdminUnlocked(true); setPassError(false); triggerToast("Admin Access Granted!") }
    else setPassError(true)
  }

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-gray-200 rounded-3xl shadow-md text-center space-y-4">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl mx-auto flex items-center justify-center text-xl">🔑</div>
        <h3 className="text-2xl text-indigo-950" style={{ ...FH }}>Admin Panel Restricted</h3>
        <p className="text-xs text-gray-500 font-medium">Please enter the admin password to continue.</p>
        <form onSubmit={handleUnlock} className="space-y-3">
          <input type="password" placeholder="Enter password..." className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-center" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
          {passError && <p className="text-xs text-red-600 font-bold">Incorrect password. Please try again.</p>}
          <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">Unlock Admin Panel</button>
        </form>
      </div>
    )
  }

  const allActionItems: (ActionItem & { deptName: string; deptId: string })[] = []
  meeting.departments.forEach(d => { d.actionItems?.forEach(a => { allActionItems.push({ ...a, deptName: d.name, deptId: d.id }) }) })

  function toggleDeptSticker(deptId: string, sticker: string) {
    const updatedDepts = meeting.departments.map(d => d.id === deptId ? { ...d, sticker } : d)
    onUpdateMeeting({ departments: updatedDepts })
    triggerToast(`Department marked as ${SC[sticker].label}`)
  }

  // Sort meetings by week number for the calendar view
  const sortedMeetings = [...root.meetings].sort((a, b) => b.weekNumber - a.weekNumber)

  return (
    <div className="space-y-6 mb-8">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-indigo-700/60">
          <div>
            <h2 className="text-2xl tracking-wide flex items-center gap-2" style={{ ...FH }}><span>🛡️</span> Executive Control Panel</h2>
            <p className="text-xs text-indigo-200 mt-1" style={{ ...FB }}>Week {meeting.weekNumber} Status Overview & Excel Sync Desk</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { exportMeetingToCSV(meeting); triggerToast("CSV Log Exported Successfully!") }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm">
              <span>📉</span> Export CSV Log
            </button>

            <div className="flex items-center gap-2 bg-indigo-950/60 p-1.5 rounded-xl border border-indigo-700/50">
              <span className="text-xs text-indigo-300 font-bold px-1">Spawn Week:</span>
              <input type="number" className="w-16 text-xs bg-white text-gray-900 font-bold px-2 py-1 rounded focus:outline-none" value={spawnWk} onChange={e => setSpawnWk(parseInt(e.target.value) || meeting.weekNumber + 1)} />
              <button onClick={() => { onSpawnWeek(spawnWk); triggerToast(`Created Week ${spawnWk} Log`) }} className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors">
                <span>➕</span> Spawn
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          {["pending", "hazard", "accomplished", "protected"].map(st => {
            const count = allActionItems.filter(a => a.status === st).length
            const cfg = SC[st]
            return (
              <div key={st} className="bg-white/10 border border-white/10 rounded-xl p-3">
                <div className="font-semibold flex items-center gap-1 text-white">{cfg.icon} {cfg.label}</div>
                <div className="text-3xl font-extrabold mt-1" style={{ ...FH, color: B.gold }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Attendance Numbers Lock */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base text-gray-900 mb-3 flex items-center gap-2" style={{ ...FH }}>
          <span>{meeting.numbersLocked ? "🔒" : "🔓"}</span> Attendance Numbers Lock
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Lock all HUB attendance input fields to prevent accidental or unauthorized changes to the numbers.
        </p>
        <button
          onClick={onToggleNumbersLock}
          className={`font-bold text-xs px-4 py-2 rounded-xl transition-colors ${meeting.numbersLocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
        >
          {meeting.numbersLocked ? "🔓 Unlock Attendance Numbers" : "🔒 Lock Attendance Numbers"}
        </button>
      </div>

      {/* Week Calendar & Delete */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base text-gray-900 mb-3 flex items-center gap-2" style={{ ...FH }}>
          <span>📅</span> Week Logs Calendar & Management
        </h3>
        <p className="text-xs text-gray-500 mb-3">View all week logs by date. Delete logs you no longer need or those that were duplicated.</p>

        <div className="space-y-2">
          {sortedMeetings.map(m => {
            const isActive = m.id === meeting.id
            const dateObj = new Date(m.date + "T00:00:00")
            const dateLabel = isNaN(dateObj.getTime()) ? m.date : dateObj.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
            return (
              <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border ${isActive ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-gray-50/50"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: B.indigo + "15", color: B.indigo, ...FH }}>
                    W{m.weekNumber}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900" style={{ ...FB }}>Week {m.weekNumber} — {dateLabel}</div>
                    <div className="text-[10px] text-gray-400">{m.departments.length} departments · {m.announcements.length} announcements</div>
                  </div>
                  {isActive && <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => setDeleteTarget({ id: m.id, week: m.weekNumber })}
                      className="text-xs text-red-600 hover:text-red-800 font-bold px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  )}
                  {isActive && <span className="text-[10px] text-gray-400 italic">Cannot delete active log</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backend Sync */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base text-gray-900 mb-1 flex items-center gap-2" style={{ ...FH }}>
          <span>🔗</span> Backend Sync (Google Apps Script)
        </h3>
        <p className="text-xs text-gray-500 mb-2">Paste your deployed Apps Script Web App URL here. Once set, every update saves to it automatically and reloads from it on refresh.</p>
        <input className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-mono" placeholder="https://script.google.com/macros/s/XXXXX/exec" value={settings.sheetsUrl} onChange={e => onUpdateSettings({ sheetsUrl: e.target.value })} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2" style={{ ...FH }}>
          <span>📈</span> Departmental Submissions & Sticker Desk
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {meeting.departments.map(dept => {
            const currentSticker = SC[dept.sticker || "pending"]
            return (
              <div key={dept.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-indigo-950" style={{ ...FB }}>{dept.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{dept.update ? dept.update : <span className="italic text-gray-400">No narrative report logged yet.</span>}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ background: currentSticker.bg, borderColor: currentSticker.border, color: currentSticker.text }}>{currentSticker.label}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <span className="text-gray-500 font-semibold">{dept.actionItems?.length || 0} Actions</span>
                  <div className="flex items-center gap-1">
                    {["pending", "hazard", "accomplished", "protected"].map(st => (
                      <button key={st} onClick={() => toggleDeptSticker(dept.id, st)} className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${dept.sticker === st ? "bg-indigo-900 text-white border-indigo-900" : "bg-white text-gray-600 hover:bg-gray-100"}`}>{SC[st].label}</button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg text-red-950" style={{ ...FH }}>Delete Week {deleteTarget.week}?</h3>
            </div>
            <p className="text-xs text-gray-600 font-medium">Are you sure you want to delete this week's log? This action cannot be undone. All updates, action items, and numbers for this week will be permanently removed.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors">Cancel</button>
              <button onClick={() => { onDeleteMeeting(deleteTarget.id); setDeleteTarget(null); triggerToast(`Week ${deleteTarget.week} log deleted.`) }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChezaChezaApp() {
  const [root, setRoot] = useState<Root | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [viewMode, setViewMode] = useState("team")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [syncStatus, setSyncStatus] = useState("Connecting to shared workspace...")
  const [liveUsers, setLiveUsers] = useState(1)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseReady = useRef(false)
  const isApplyingRemote = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const showSuccessToast = useCallback((msg: string) => setToastMessage(msg), [])

  // Initial load: show local cache instantly, then reconcile with shared backend.
  // Realtime subscription keeps all connected machines in sync live.
  useEffect(() => {
    const local = loadRoot()
    setRoot(local)

    ;(async () => {
      try {
        const { data, error } = await supabase.from("app_state").select("state, updated_by_session").eq("id", 1).maybeSingle()

        if (error) {
          setSyncStatus("Shared sync unavailable — local changes still active")
        } else if (data?.state?.meetings) {
          const remoteState = ensureRootFields(data.state as Root)
          isApplyingRemote.current = true
          setRoot(remoteState)
          setSyncStatus("Connected to shared workspace")
        } else if (data?.state?.impactData) {
          isApplyingRemote.current = true
          setRoot({
            ...local,
            meetings: local.meetings.map(meeting =>
              meeting.id === local.activeMeetingId ? { ...meeting, impactData: data.state.impactData } : meeting
            ),
          })
          setSyncStatus("Connected — existing attendance restored")
        } else {
          setSyncStatus("Connected — ready to record updates")
        }
      } catch {
        setSyncStatus("Shared sync unavailable — local changes still active")
      } finally {
        supabaseReady.current = true
      }

      const remote = await fetchRemoteState(local?.settings?.sheetsUrl || "")
      if (remote) { isApplyingRemote.current = true; setRoot(ensureRootFields(remote)) }
    })()

    // Restore login and mood check-in
    try {
      const savedUser = localStorage.getItem(AUTH_USER_KEY)
      if (savedUser && savedUser.toLowerCase().endsWith("@chezachezadance.org")) {
        setUserEmail(savedUser); setIsEmailVerified(true)
      }
      const savedMood = sessionStorage.getItem(MOOD_KEY)
      if (savedMood) setIsCheckedIn(true)
    } catch { /* sandbox */ }

    // Realtime subscription — live co-working like Google Docs
    const channel = supabase
      .channel("app_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload: any) => {
        const newState = payload.new?.state
        const senderSession = payload.new?.updated_by_session
        if (newState?.meetings && senderSession !== SESSION_ID) {
          isApplyingRemote.current = true
          setRoot(ensureRootFields(newState as Root))
          setSyncStatus("Live update received from teammate")
          setTimeout(() => setSyncStatus("All changes saved to shared workspace"), 2000)
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setLiveUsers(Object.keys(state).length)
      })
      .on("presence", { event: "join" }, () => {
        setSyncStatus("A teammate joined the workspace")
        setTimeout(() => setSyncStatus("All changes saved to shared workspace"), 2000)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ session: SESSION_ID, user: userEmail || "anonymous", joinedAt: new Date().toISOString() })
          setSyncStatus("Connected — live co-working active")
        }
      })

    channelRef.current = channel

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Save: instant local cache + debounced push to shared backend.
  useEffect(() => {
    if (!root) return
    saveRoot(root)
    if (!supabaseReady.current) return
    if (isApplyingRemote.current) { isApplyingRemote.current = false; return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("app_state").upsert({ id: 1, state: root, updated_by_session: SESSION_ID })
      if (error) { setSyncStatus("Save issue — your local copy is safe") }
      else { setSyncStatus("All changes saved to shared workspace") }
      pushRemoteState(root.settings?.sheetsUrl || "", root)
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [root])

  if (!root) return <div className="p-10 text-center font-bold" style={{ ...FB }}>Loading Workspace Logs...</div>

  let activeMeeting = root.meetings.find(m => m.id === root.activeMeetingId) || root.meetings[0]

  function ensureRootFields(r: Root): Root {
    return { ...r, meetings: r.meetings.map(ensureMeetingFields) }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (userEmail.trim().toLowerCase().endsWith("@chezachezadance.org")) {
      try { localStorage.setItem(AUTH_USER_KEY, userEmail.trim().toLowerCase()) } catch { }
      setIsEmailVerified(true); setEmailError("")
      showSuccessToast("Workspace Access Authorized!")
    } else {
      setEmailError("Access Denied. Only valid @chezachezadance.org workspace addresses are authorized.")
    }
  }

  function updateActiveMeeting(updates: Partial<Meeting>) {
    if (!root || !activeMeeting) return
    const updatedMeetings = root.meetings.map(m => m.id === activeMeeting.id ? { ...m, ...updates } : m)
    setRoot({ ...root, meetings: updatedMeetings })
  }

  function updateSettings(updates: Partial<Root["settings"]>) {
    setRoot({ ...root, settings: { ...root.settings, ...updates } })
  }

  function handleSpawnWeek(wkNum: number) {
    if (!root) return
    const newM = createMeeting(wkNum, root.settings.departments as any)
    setRoot({ ...root, meetings: [newM, ...root.meetings], activeMeetingId: newM.id })
  }

  function handleDeleteMeeting(id: string) {
    if (!root) return
    if (root.meetings.length <= 1) { showSuccessToast("Cannot delete the last remaining week log."); return }
    const filtered = root.meetings.filter(m => m.id !== id)
    const newActive = id === root.activeMeetingId ? filtered[0].id : root.activeMeetingId
    setRoot({ ...root, meetings: filtered, activeMeetingId: newActive })
  }

  function toggleNumbersLock() {
    if (!activeMeeting) return
    updateActiveMeeting({ numbersLocked: !activeMeeting.numbersLocked })
    showSuccessToast(activeMeeting.numbersLocked ? "Attendance numbers unlocked." : "Attendance numbers locked.")
  }

  function notifyUrgentAnnouncement(announcement: Announcement) {
    pushRemoteState(root.settings?.sheetsUrl || "", root, { type: "urgent_announcement", text: announcement.text, postedBy: announcement.postedBy })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative" style={{ ...FB }}>
      <style>{FONT_IMPORT}</style>
      {toastMessage && <SuccessToast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {!isEmailVerified ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: B.indigo }}>
          <div className="absolute top-0 left-0 right-0 h-2 flex">
            <div className="flex-1" style={{ background: B.orange }} />
            <div className="flex-1" style={{ background: B.teal }} />
            <div className="flex-1" style={{ background: B.magenta }} />
            <div className="flex-1" style={{ background: B.green }} />
            <div className="flex-1" style={{ background: B.gold }} />
            <div className="flex-1" style={{ background: B.red }} />
          </div>

          <div className="absolute top-16 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: B.teal }} />
          <div className="absolute bottom-8 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: B.magenta }} />

          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <img src={logoImg} alt="ChezaCheza Dance Foundation" className="h-14 w-auto object-contain" />
              <div className="h-0.5 w-16 rounded-full" style={{ background: B.orange }} />
              <h1 className="text-2xl" style={{ ...FH, color: B.indigo }}>ChezaCheza Dance Foundation</h1>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: B.teal, ...FB }}>MMM Internal Workspace Portal</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: B.indigo }}>Organization Email</label>
                <input type="email" placeholder="name@chezachezadance.org" className="w-full text-sm border-2 rounded-xl px-4 py-2.5 bg-white text-gray-900 focus:outline-none font-medium transition-colors" style={{ borderColor: "#e4e2f4" }} onFocus={e => e.target.style.borderColor = B.teal} onBlur={e => e.target.style.borderColor = "#e4e2f4"} value={userEmail} onChange={e => setUserEmail(e.target.value)} />
              </div>
              {emailError && <div className="border p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: "#fff0ee", borderColor: B.red, color: B.red }}><span>⚠</span> {emailError}</div>}
              <button type="submit" className="w-full text-white font-bold rounded-xl py-3 text-sm tracking-wider uppercase transition-all shadow-md" style={{ background: B.teal }} onMouseEnter={e => (e.currentTarget.style.background = "#009a9a")} onMouseLeave={e => (e.currentTarget.style.background = B.teal)}>Enter Workspace</button>
            </form>

            <p className="text-[11px] text-gray-400" style={{ ...FB }}>Access is restricted to @chezachezadance.org email addresses</p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1" style={{ background: B.red }} />
            <div className="flex-1" style={{ background: B.gold }} />
            <div className="flex-1" style={{ background: B.green }} />
            <div className="flex-1" style={{ background: B.magenta }} />
            <div className="flex-1" style={{ background: B.teal }} />
            <div className="flex-1" style={{ background: B.orange }} />
          </div>
        </div>
      ) : !isCheckedIn ? (
        <GreetingScreen userName={userEmail} onCheckIn={() => setIsCheckedIn(true)} />
      ) : (
        <>
          <header className="bg-white border-b sticky top-0 z-20 shadow-sm" style={{ borderColor: "#e4e2f4" }}>
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="ChezaCheza" className="h-8 w-auto object-contain" />
                  <div>
                    <h1 className="text-xl tracking-wide" style={{ ...FH, color: B.indigo }}>ChezaCheza Dance Foundation</h1>
                    <span className="text-xs text-gray-500 font-medium">Logged in as: <strong className="text-indigo-900">{userEmail}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg" title="Number of people currently editing">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {liveUsers} {liveUsers === 1 ? "person" : "people"} editing
                  </span>
                  <button onClick={() => setViewMode(viewMode === "admin" ? "team" : "admin")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors" style={{ background: viewMode === "admin" ? B.indigo : "white", color: viewMode === "admin" ? "white" : B.indigo, borderColor: B.indigo }} title="Admin Panel Access">🔑 Admin</button>
                  <select className="text-xs border rounded-lg font-bold px-2.5 py-1.5 cursor-pointer bg-white text-indigo-950 border-gray-300" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                    <option value="team">👥 Team Editor View</option>
                    <option value="admin">🛡️ Executive Admin View</option>
                  </select>
                  <button onClick={() => { try { localStorage.removeItem(AUTH_USER_KEY); sessionStorage.removeItem(MOOD_KEY) } catch { } setIsEmailVerified(false); setIsCheckedIn(false) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors" title="Log Out">🚪</button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Log:</span>
                  <select className="text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1" value={activeMeeting.id} onChange={e => setRoot({ ...root, activeMeetingId: e.target.value })}>
                    {root.meetings.map(m => <option key={m.id} value={m.id}>Week {m.weekNumber} Log ({m.date})</option>)}
                  </select>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5" style={{ ...FB }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {syncStatus}
                </span>
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-6">
            {viewMode === "admin" ? (
              <EnhancedAdminPanel
                meeting={activeMeeting}
                onUpdateMeeting={updateActiveMeeting}
                onSpawnWeek={handleSpawnWeek}
                onDeleteMeeting={handleDeleteMeeting}
                triggerToast={showSuccessToast}
                currentUser={userEmail}
                settings={root.settings}
                onUpdateSettings={updateSettings}
                root={root}
                onToggleNumbersLock={toggleNumbersLock}
              />
            ) : (
              <>
                <MainCounterSection meeting={activeMeeting} impactData={activeMeeting.impactData} />

                <AnnouncementsSection announcements={activeMeeting.announcements} onChange={announcements => updateActiveMeeting({ announcements })} currentUser={userEmail} triggerToast={showSuccessToast} onNotifyUrgent={notifyUrgentAnnouncement} />

                <TeamChatSection messages={activeMeeting.chatMessages} onChange={chatMessages => updateActiveMeeting({ chatMessages })} currentUser={userEmail} triggerToast={showSuccessToast} />

                <StaffingSection staffing={activeMeeting.staffing} onChange={staffing => updateActiveMeeting({ staffing })} triggerToast={showSuccessToast} />

                <ImpactSection impactData={activeMeeting.impactData} onChange={data => updateActiveMeeting({ impactData: data })} triggerToast={showSuccessToast} numbersLocked={activeMeeting.numbersLocked} />

                <DepartmentSection departments={activeMeeting.departments} onChange={depts => updateActiveMeeting({ departments: depts })} currentUser={userEmail} triggerToast={showSuccessToast} meeting={activeMeeting} onCounterChange={updateActiveMeeting} />
              </>
            )}
          </main>
        </>
      )}
    </div>
  )
}
