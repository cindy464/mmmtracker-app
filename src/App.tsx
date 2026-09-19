import React, { useState, useEffect, useRef, useCallback } from "react"
import { createClient, Session } from "@supabase/supabase-js"
import logoImg from "@/imports/Screenshot_2026-06-09_151556-1.png"
import heartIcon from "@/imports/icons/heart.png"
import fistIcon from "@/imports/icons/fist.png"
import mouthIcon from "@/imports/icons/mouth.png"
import lightbulbIcon from "@/imports/icons/lightbulb.png"
import sunIcon from "@/imports/icons/sun.png"
import dancerIcon from "@/imports/icons/dancer.png"

// ─── Brand Theme ─────────────────────────────────────────────────────────────
// Pulled directly from the ChezaCheza brand lookbook (exact hex values, not
// approximations) — cream is the dominant surface, the rest are bold solid
// accents used the way the lookbook uses them: full-saturation pill blocks,
// not soft tints.
const B = {
  cream:      "#F7F1EE",
  indigo:     "#433D7B",
  teal:       "#21B8C9",
  green:      "#A0BB42",
  gold:       "#FDBF21",
  goldLight:  "#FCC559",
  red:        "#C53928",
  magenta:    "#C31C6C",
  text:       "#1E1E1E",
}

// Supabase Cloud Configuration
const SUPABASE_URL = "https://mtadbfenjfrdajibcejc.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YWRiZmVuamZyZGFqaWJjZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjU2NDMsImV4cCI6MjEwMjgwMTY0M30.uu84lV3fwOSLP8HCqYR_zH5eGAq3Z_wnmPyNvNtshoc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Sends a real "flash card" styled email via the send-flash-card-email Edge
// Function (which calls Resend server-side). Returns true on success so
// callers can fall back to mailto: if the send fails for any reason (e.g.
// recipient not yet allowed under Resend's unverified-domain test limits).
async function sendFlashCardEmail(opts: { to: string; heading: string; body: string; footer?: string; accentColor?: string; subject?: string }): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-flash-card-email", { body: opts })
    if (error) return false
    return !!data?.success
  } catch {
    return false
  }
}

// Ranchers for headings, Noto Sans for everything else — this is the actual
// pairing used throughout the brand lookbook (confirmed from the deck's own
// font usage, not a guess).
const FH: React.CSSProperties = { fontFamily: "'Ranchers', cursive", fontWeight: 400, letterSpacing: "0.02em" }
const FB: React.CSSProperties = { fontFamily: "'Noto Sans', sans-serif" }
const FM: React.CSSProperties = { fontFamily: "monospace" }
// Baloo 2 isn't in the brand deck's own slides, but used here as a deliberate
// playful accent in the app chrome (header, landing page) per explicit request.
const FN: React.CSSProperties = { fontFamily: "'Baloo 2', cursive" }

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Ranchers&family=Baloo+2:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600;700;800;900&family=Quicksand:wght@400;500;600;700&family=Comic+Neue:wght@400;700&display=swap'); .rich-text-edit:empty::before{content:attr(data-placeholder);color:#9ca3af;pointer-events:none;} .rich-text-edit ol{list-style:decimal;margin-left:1.2em;padding-left:0.5em;} .rich-text-edit ul{list-style:disc;margin-left:1.2em;padding-left:0.5em;} .rich-text-edit li{display:list-item;}`

// Narration-box font picker. "Google Sans" and literal "Comic Sans" aren't
// licensed for free web embedding (not on Google Fonts) — Quicksand and
// Comic Neue are the closest genuinely-available equivalents in that spirit.
const NARRATION_FONTS = [
  { label: "Noto Sans", value: "'Noto Sans', sans-serif" },
  { label: "Baloo 2", value: "'Baloo 2', cursive" },
  { label: "Quicksand", value: "'Quicksand', sans-serif" },
  { label: "Comic Neue", value: "'Comic Neue', cursive" },
]

// Helper utilities
function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function sessionId(): string {
  let s = ""
  try { s = sessionStorage.getItem("chezacheza_session") || "" } catch { }
  if (!s) { s = uid(); try { sessionStorage.setItem("chezacheza_session", s) } catch { } }
  return s
}

function getISOWeek(dateStr: string): number {
  if (!dateStr) return 1
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function isLastWeekOfMonth(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr + "T00:00:00")
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return (lastDay - d.getDate()) < 7
}

function meetingsInSameMonth(meetings: Meeting[], dateStr: string): Meeting[] {
  const d = new Date(dateStr + "T00:00:00")
  return meetings.filter(m => {
    const md = new Date(m.date + "T00:00:00")
    return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth()
  })
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
  heartedBy: string[]
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
  deleted: boolean
}

interface Root {
  meetings: Meeting[]
  activeMeetingId: string
  settings: { departments: Dept[] }
}

function emptyHub(name: string): Hub {
  return { id: uid(), name, junior: "", senior: "", signedConsent: "", missingConsent: "", newStudents: "" }
}

const DEFAULT_IMPACT: Omit<Community, "id" | "hubs"> & { hubs: Hub[] }[] = [
  { name: "Mathare",      color: B.magenta, hubs: ["St.Lwang'a", "MathareNorth", "T.Area", "Dandora 2"].map(emptyHub) },
  { name: "Kibera North", color: B.indigo,  hubs: ["Vuma", "Ayany", "Rongai", "Ruiru", "Dagoretti"].map(emptyHub) },
  { name: "Kibera South", color: B.teal,    hubs: ["Kambi Muru", "Kisumu Ndogo", "Gatwekera", "Mashimoni", "DC"].map(emptyHub) },
  { name: "Eastlands",    color: B.gold,  hubs: ["Korogocho", "LungaLunga", "Mukuru kwa Rueben", "Dandora 4", "Dandora 5"].map(emptyHub) },
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

// Links a regional department card to its matching HUB attendance data, so
// coordinators edit their region's narrative, numbers, and action items in
// one place instead of numbers living in a separate shared section.
const REGION_COMMUNITY_MAP: Record<string, string> = {
  "comm-kn": "Kibera North",
  "comm-ks": "Kibera South",
  "comm-mt": "Mathare",
  "comm-el": "Eastlands",
}

// Gives every non-regional department its own accent color too, so the
// department list isn't just the four region colors plus one bland default.
const DEPT_COLORS: Record<string, string> = {
  "comm-lead": B.red,
  "happy":     B.magenta,
  "beat":      B.green,
  "allstars":  B.teal,
  "strat":     B.gold,
  "gc":        B.indigo,
  "finance":   B.goldLight,
  "hr":        B.magenta,
  "procure":   B.teal,
}

// Illustrated brand icons (pulled from the lookbook) in place of generic
// emoji, minimal — only where a genuine match exists, everywhere else keeps
// its plain iconKey emoji rather than forcing a mismatched illustration.
const DEPT_ILLUSTRATED_ICONS: Record<string, string> = {
  "comm-lead": fistIcon,
  "happy":     sunIcon,
  "strat":     lightbulbIcon,
  "allstars":  dancerIcon,
}

const STORAGE_KEY = "chezacheza_mmm_v13"
const VERSION_KEY = "chezacheza_mmm_v13_version"
const AUTO_SAVE_DEBOUNCE_MS = 600
const SESSION_ID = sessionId()

const MOOD_KEY = "chezachezadance_mood_v1"
const MOODS = [
  { id: "calm",      emoji: "😌", label: "Calm",        color: B.teal },
  { id: "terrific",  emoji: "🤩", label: "Terrific",    color: B.green },
  { id: "good",      emoji: "😊", label: "Good",        color: B.teal },
  { id: "notsowell", emoji: "😔", label: "Not So Well", color: B.gold },
]
const TEXT_COLORS = [B.indigo, B.teal, B.magenta, B.red, B.green, B.gold, B.goldLight]
const HIGHLIGHT_COLORS = ["#fff59d", "#a7f3d0", "#bae6fd", "#fbcfe8", "#fed7aa", "#ddd6fe", "#fecaca", "#e5e7eb"]

const SC: Record<string, { label: string; bg: string; border: string; text: string; icon: string }> = {
  pending:      { label: "Pending",      bg: "#fff7ed", border: "#f97316", text: "#c2410c", icon: "🕒" },
  hazard:       { label: "At Risk",      bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "⚠️" },
  accomplished: { label: "Accomplished", bg: "#f0fdf4", border: "#22c55e", text: "#15803d", icon: "✅" },
  protected:    { label: "Protected",    bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "🛡️" },
}

// AI Assistant categories. Each buildPrompt receives the same context object
// so new categories can pull whatever data they need without changing the
// call site. "currentUser" personalizes tone/attribution; department-scoped
// categories ("weekly", "atrisk", "followup") read the real live data.
type AIPromptCtx = { meeting: Meeting; meetings: Meeting[]; monthLabel: string; currentUser: string }

function firstNameOf(email: string): string {
  const raw = (email || "").split("@")[0].split(".")[0]
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "there"
}

function plainDeptLines(meeting: Meeting): string {
  return meeting.departments.map(d => {
    const acts = (d.actionItems || []).map(a => `    - [${a.status.toUpperCase()}] ${a.text || "(untitled)"}, owner: ${a.owner || "unassigned"}, due: ${a.deadline || "no date"}`).join("\n")
    const plainUpdate = (d.update || "").replace(/<[^>]+>/g, " ").trim()
    return `${d.name} (${(d.sticker || "pending").toUpperCase()})\n  Update: ${plainUpdate || "(no update)"}\n  Actions:\n${acts || "    (none)"}`
  }).join("\n\n")
}

const AI_CATEGORIES = [
  {
    key: "wellness", label: "🌿 Wellness Tips", tagline: "Staff wellbeing and self-care ideas", color: B.green,
    buildPrompt: (ctx: AIPromptCtx) => `Share 3 meaningful wellness and self-care tips for ${firstNameOf(ctx.currentUser)}, who works as community development staff in challenging environments in Nairobi. Include one physical, one mental, and one social tip. Address them warmly by name, keep it practical and encouraging.`,
  },
  {
    key: "management", label: "💡 Management Tips", tagline: "Practical leadership ideas for coordinators", color: B.indigo,
    buildPrompt: (ctx: AIPromptCtx) => `Give 3 practical, specific management tips for ${firstNameOf(ctx.currentUser)}, a leader of youth dance and community development programmes in informal urban settlements in Nairobi. Make them immediately actionable and grounded in the realities of NGO/community programme work. Address them by name, write in clear, warm, professional English.`,
  },
  {
    key: "nutrition", label: "🥗 Nutrition Tips", tagline: "Healthy eating for active staff", color: B.gold,
    buildPrompt: (ctx: AIPromptCtx) => `Give 3 practical, affordable nutrition tips for ${firstNameOf(ctx.currentUser)}, an active community programme worker in Nairobi. Consider local foods, budget constraints, and busy schedules. Address them by name, keep it positive and realistic.`,
  },
  {
    key: "weekly", label: "📋 Weekly Summary", tagline: "Executive brief of this week's updates", color: B.teal,
    buildPrompt: (ctx: AIPromptCtx) => `You are an executive assistant summarising a Monthly Management Meeting (MMM) for ChezaCheza Dance Foundation, a youth dance organisation across Mathare, Kibera, and Eastlands, Nairobi. This summary is being prepared by ${firstNameOf(ctx.currentUser)}.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nWrite a concise 3-5 sentence executive summary for senior leadership. Highlight overall momentum, any departments at risk, and 1-2 wins. Professional tone, no bullet points.`,
  },
  {
    key: "monthly", label: "🗓️ Monthly Report", tagline: "Detailed report combining every week this month", color: B.red,
    buildPrompt: (ctx: AIPromptCtx) => {
      const lines = ctx.meetings.map(m => {
        const total = m.impactData.reduce((acc, c) => acc + c.hubs.reduce((h, hub) => h + sumHub(hub).total, 0), 0)
        const deptLines = m.departments.map(d => `  - ${d.name} (${(d.sticker || "pending").toUpperCase()}): ${(d.update || "").replace(/<[^>]+>/g, " ").trim() || "no update"}`).join("\n")
        return `Week ${m.weekNumber} (${m.date}), combined HUB attendance: ${total}\n${deptLines}`
      }).join("\n\n")
      return `You are an executive assistant writing a detailed MONTHLY report for ChezaCheza Dance Foundation, covering ${ctx.monthLabel}, prepared by ${firstNameOf(ctx.currentUser)}, combining every weekly log logged that month below.\n\n${lines}\n\nWrite a well-structured monthly report for the board: overall attendance trend across the weeks, standout wins, departments needing support, and 2-3 concrete recommendations for next month. Use short headed sections, not one long paragraph.`
    },
  },
  {
    key: "donor", label: "💌 Donor Update Email", tagline: "Funder-ready update drafted from this week's data", color: B.magenta,
    buildPrompt: (ctx: AIPromptCtx) => `Draft a warm, professional donor/funder update email for ChezaCheza Dance Foundation, from ${firstNameOf(ctx.currentUser)}. Base it on this week's real programme data below — use specific numbers and wins, not generic language.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nWrite a complete email: greeting, 2-3 short paragraphs of real impact and momentum, and a warm closing. Keep it under 250 words, no bullet points, ready to send with minimal editing.`,
  },
  {
    key: "agenda", label: "🗂️ Meeting Agenda", tagline: "Turn this week's updates into a ready-to-run agenda", color: B.teal,
    buildPrompt: (ctx: AIPromptCtx) => `Turn this week's department updates into a ready-to-run Monthly Management Meeting agenda for ChezaCheza Dance Foundation, for ${firstNameOf(ctx.currentUser)} to lead.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nWrite a numbered agenda: lead with any at-risk departments first, then wins, then open action items needing discussion, then any other business. Give a rough time allocation per item assuming a 45-minute meeting.`,
  },
  {
    key: "atrisk", label: "⚠️ At-Risk Flag", tagline: "Which departments need attention before the meeting", color: B.red,
    buildPrompt: (ctx: AIPromptCtx) => `Review this week's department data for ChezaCheza Dance Foundation and flag what actually needs attention, for ${firstNameOf(ctx.currentUser)} ahead of the meeting.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nList only departments with a genuine concern — an "At Risk" sticker, an overdue-sounding or vague action item, or a missing update. For each, say specifically what looks off and one suggested question to ask in the meeting. If nothing looks concerning, say so plainly rather than inventing a concern.`,
  },
  {
    key: "recognition", label: "🌟 Recognition Message", tagline: "Draft a thank-you for a standout update", color: B.gold,
    buildPrompt: (ctx: AIPromptCtx) => `Look at this week's department updates for ChezaCheza Dance Foundation and find the most genuine win or standout effort worth recognizing. Written for ${firstNameOf(ctx.currentUser)} to send.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nDraft a short, warm recognition message (3-4 sentences) to the team or person behind that update, specific to what they actually did — not generic praise. If nothing stands out clearly, say so rather than inventing one.`,
  },
  {
    key: "followup", label: "🔔 Overdue Follow-Up", tagline: "One list of everything that needs chasing", color: B.indigo,
    buildPrompt: (ctx: AIPromptCtx) => `Review this week's action items across all departments for ChezaCheza Dance Foundation and build one consolidated follow-up list, for ${firstNameOf(ctx.currentUser)} to send out.\n\nWeek ${ctx.meeting.weekNumber} department updates:\n\n${plainDeptLines(ctx.meeting)}\n\nList every action item that is not marked accomplished, grouped by owner, with its department and deadline. Write it as a short, direct message ready to paste into chat — one line per item, no preamble.`,
  },
]

// Calls the ai-assistant Edge Function (Gemini, server-side key) instead of
// talking to a model API directly from the browser — the key never reaches
// the client, and the function only accepts the fixed categories above.
async function callAIAssistant(category: string, prompt: string): Promise<{ text: string; truncated: boolean }> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", { body: { category, prompt } })
  if (error) throw new Error(error.message || "AI request failed")
  if (data?.error) throw new Error(data.error)
  return { text: data?.text || "", truncated: !!data?.truncated }
}

function createMeeting(wk: number, defs: typeof DEFAULT_DEPTS, dateStr?: string): Meeting {
  return {
    id: uid(),
    weekNumber: wk,
    date: dateStr || new Date().toISOString().split("T")[0],
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
    deleted: false,
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
  return { meetings: [initialMeeting], activeMeetingId: initialMeeting.id, settings: { departments: DEFAULT_DEPTS as any } }
}

function ensureMeetingFields(m: Meeting): Meeting {
  // Rebuilt in DEFAULT_DEPTS order every load: any department that existed
  // when this meeting was saved keeps its real content, and any department
  // added to the app since (like Community Leadership) gets backfilled with
  // a fresh empty entry instead of silently missing from old logs.
  const existingDeptsById = new Map((m.departments || []).map((d: Dept) => [d.id, d]))
  const departments = DEFAULT_DEPTS.map(def => {
    const existing = existingDeptsById.get(def.id)
    if (existing) return { ...existing, lockPin: existing.lockPin ?? "", isLocked: existing.isLocked ?? false }
    return { ...def, update: "", actionItems: [], expanded: true, reported: false, updatedBy: "", sticker: "pending", isLocked: false, lockPin: "" }
  })

  return {
    ...m,
    numbersLocked: m.numbersLocked ?? false,
    gcCounters: m.gcCounters ?? { oneOnOnesParents: "", oneOnOnesChildren: "", groupTherapy: "", familyTherapy: "" },
    happySchoolsStudents: (m as any).happySchoolsStudents ?? "",
    beatMathare: (m as any).beatMathare ?? "",
    beatKibera: (m as any).beatKibera ?? "",
    chatMessages: ((m as any).chatMessages ?? []).map((msg: ChatMessage) => ({ ...msg, heartedBy: msg.heartedBy ?? [] })),
    deleted: (m as any).deleted ?? false,
    departments,
    impactData: (m.impactData || []).map((c: Community) => ({ ...c, hubs: (c.hubs || []).map((h: Hub) => ({ ...h })) })),
  }
}

function saveRoot(s: Root) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* sandbox */ }
}

function loadSyncedVersion(): number {
  try { return parseInt(localStorage.getItem(VERSION_KEY) || "0", 10) || 0 } catch { return 0 }
}

function saveSyncedVersion(v: number) {
  try { localStorage.setItem(VERSION_KEY, String(v)) } catch { /* sandbox */ }
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
  title: string; icon: React.ReactNode; color: string; badge?: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md mb-5 bg-white transition-all hover:shadow-lg hover:-translate-y-0.5">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3.5 hover:brightness-105 transition-all text-left" style={{ background: color }}>
        <span className="text-lg flex items-center justify-center w-5 h-5">{icon}</span>
        <span className="flex-1 font-bold text-sm uppercase tracking-wider text-white" style={{ ...FH }}>{title}</span>
        {badge != null && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/25 text-white" style={{ ...FB }}>{badge}</span>}
        <span className="text-white/80">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="px-5 py-4 space-y-4 bg-white">{children}</div>}
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: B.cream }}>
      <div className="absolute top-0 left-0 right-0 h-2 flex">
        <div className="flex-1" style={{ background: B.gold }} />
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
          <div className="h-0.5 w-16 rounded-full" style={{ background: B.gold }} />
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
        <div className="flex-1" style={{ background: B.gold }} />
      </div>
    </div>
  )
}

function RichTextEditor({ value, onChange, disabled, placeholder }: {
  value: string; onChange: (html: string) => void; disabled: boolean; placeholder: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)
  const [showColors, setShowColors] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [showFonts, setShowFonts] = useState(false)

  // Only overwrite the live DOM from the incoming value when this device
  // isn't the one currently typing here. Without the focus guard, a
  // teammate's realtime edit landing mid-keystroke would yank the cursor
  // and clobber whatever you were typing. This is also what makes another
  // person's narration edits actually appear on your screen live — the old
  // version only re-synced when `disabled` changed, never when `value` did,
  // so incoming edits saved correctly but never visibly showed up remotely.
  useEffect(() => {
    if (ref.current && !isFocusedRef.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || ""
    }
  }, [value, disabled])

  function exec(cmd: string, val?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    if (ref.current) onChange(ref.current.innerHTML)
    setShowColors(false)
    setShowHighlights(false)
    setShowFonts(false)
  }

  const btnBase = "px-2 py-1 rounded text-xs font-bold border border-gray-200 hover:bg-indigo-50 transition-colors"

  return (
    <div className="w-full">
      {!disabled && (
        <div className="flex items-center gap-1 mb-1.5 pb-1.5 border-b border-gray-100 flex-wrap">
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("bold") }} className={btnBase} style={{ fontWeight: 800 }}>B</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("italic") }} className={btnBase} style={{ fontStyle: "italic" }}>I</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("underline") }} className={btnBase} style={{ textDecoration: "underline" }}>U</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertOrderedList") }} className={btnBase}>1.</button>
          <button type="button" onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList") }} className={btnBase}>•</button>
          <div className="relative">
            <button type="button" onMouseDown={e => { e.preventDefault(); setShowFonts(!showFonts); setShowColors(false); setShowHighlights(false) }} className={btnBase}>🔤 Font</button>
            {showFonts && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 flex flex-col gap-1 w-40">
                {NARRATION_FONTS.map(f => (
                  <button key={f.value} type="button" onMouseDown={e => { e.preventDefault(); exec("fontName", f.value) }} className="text-left px-2 py-1.5 rounded hover:bg-indigo-50 text-xs" style={{ fontFamily: f.value }}>{f.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(!showColors); setShowHighlights(false); setShowFonts(false) }} className={btnBase}>🎨 Color</button>
            {showColors && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex gap-1 flex-wrap w-48">
                {TEXT_COLORS.map(c => (
                  <button key={c} type="button" onMouseDown={e => { e.preventDefault(); exec("foreColor", c) }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ background: c }} />
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button type="button" onMouseDown={e => { e.preventDefault(); setShowHighlights(!showHighlights); setShowColors(false); setShowFonts(false) }} className={btnBase}>🖍️ Highlight</button>
            {showHighlights && (
              <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-2 flex gap-1 flex-wrap w-48">
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c} type="button" onMouseDown={e => { e.preventDefault(); exec("hiliteColor", c) }} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ background: c }} />
                ))}
                <button type="button" onMouseDown={e => { e.preventDefault(); exec("hiliteColor", "transparent") }} className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform flex items-center justify-center text-[9px] text-gray-500 bg-white">off</button>
              </div>
            )}
          </div>
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        onFocus={() => { isFocusedRef.current = true }}
        onBlur={() => { isFocusedRef.current = false }}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`w-full text-sm border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${disabled ? "bg-gray-50 text-gray-500" : "bg-white"} min-h-[120px] rich-text-edit`}
        style={{ borderColor: "#d1d5db", ...FB }}
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
            💡 Tip: Use a short PIN you'll remember, like your birthday digits or a simple 3-4 digit code. This avoids needing admin help to reset passwords.
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

// Reusable HUB attendance table for one region — used inside that region's
// own department card so numbers live with the narrative and action items.
function RegionNumbersBlock({ community, onChange, numbersLocked, triggerToast }: {
  community: Community; onChange: (c: Community) => void; numbersLocked: boolean; triggerToast: (m: string) => void
}) {
  const total = community.hubs.reduce((acc, h) => acc + sumHub(h).total, 0)

  function updateHub(hubId: string, field: keyof Hub, value: string) {
    onChange({ ...community, hubs: community.hubs.map(h => h.id !== hubId ? h : { ...h, [field]: value }) })
  }

  return (
    <div className="rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: community.color + "33" }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: community.color + "12" }}>
        <span className="font-bold text-sm tracking-wide" style={{ ...FH, color: community.color }}>Hub Attendance Numbers</span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border" style={{ color: community.color, borderColor: community.color + "33", ...FM }}>Total: {total}</span>
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
                  <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.junior} onChange={e => { updateHub(hub.id, "junior", e.target.value); triggerToast("Attendance figures recorded.") }} /></td>
                  <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.senior} onChange={e => { updateHub(hub.id, "senior", e.target.value); triggerToast("Attendance figures recorded.") }} /></td>
                  <td className="px-3 py-2 font-bold text-center text-gray-900">{s.total}</td>
                  <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.signedConsent} onChange={e => { updateHub(hub.id, "signedConsent", e.target.value); triggerToast("Consent log updated.") }} /></td>
                  <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.missingConsent} onChange={e => { updateHub(hub.id, "missingConsent", e.target.value); triggerToast("Consent log updated.") }} /></td>
                  <td className="px-3 py-2"><input type="number" min="0" disabled={numbersLocked} className={inputCls} style={{ ...FB }} value={hub.newStudents} onChange={e => { updateHub(hub.id, "newStudents", e.target.value); triggerToast("New joiners count updated.") }} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Same big-counter shell as MainCounterSection, scoped to just the four
// community regions — a standalone card, still fed by the exact same
// impactData the region cards above edit, so the two stay in sync.
function ImpactSection({ impactData, numbersLocked }: {
  impactData: Community[]; numbersLocked: boolean
}) {
  let grandTotal = 0, grandJunior = 0, grandSenior = 0, grandSC = 0, grandMC = 0, grandNS = 0
  impactData.forEach(c => {
    c.hubs.forEach(h => {
      const s = sumHub(h)
      grandTotal += s.total; grandJunior += s.j; grandSenior += s.s
      grandSC += s.sc; grandMC += s.mc; grandNS += s.ns
    })
  })

  const tiles = [
    { label: "Junior",          value: grandJunior, color: B.indigo },
    { label: "Senior",          value: grandSenior, color: B.indigo },
    { label: "Signed Consent",  value: grandSC,      color: B.green },
    { label: "Missing Consent", value: grandMC,      color: B.red },
    { label: "New Joiners",     value: grandNS,      color: B.gold },
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-md mb-5 bg-white">
      <div className="px-5 py-3.5 text-white" style={{ background: B.magenta }}>
        <div className="flex items-center gap-3">
          <img src={heartIcon} className="w-5 h-5 object-contain" alt="" />
          <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH }}>Total Community Numbers Reached</span>
        </div>
      </div>
      <div className="bg-white px-5 py-5 space-y-4">
        <div className={`flex items-center justify-between rounded-xl p-2.5 border text-xs ${numbersLocked ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-200"}`}>
          <span className="font-bold flex items-center gap-2" style={{ ...FB, color: numbersLocked ? B.gold : B.green }}>
            {numbersLocked ? "🔒 Attendance numbers are LOCKED. Editing disabled" : "🔓 Attendance numbers are editable"}
          </span>
        </div>
        <div className="text-center pb-3 border-b border-gray-100">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400" style={{ ...FB }}>Registered Participants Across All Regions</p>
          <h2 className="text-5xl mt-2" style={{ ...FH, color: B.text }}>{grandTotal}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tiles.map(t => (
            <div key={t.label} className="rounded-xl p-3 border text-center" style={{ background: t.color + "10", borderColor: t.color + "33" }}>
              <div className="text-2xl font-bold" style={{ ...FH, color: t.color }}>{t.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ ...FB, color: t.color + "dd" }}>{t.label}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 text-center font-medium" style={{ ...FB }}>Each region's own numbers are entered inside that region's card under Departmental Updates above.</p>
      </div>
    </div>
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
    { label: "Happy Schools Students",    value: happyTotal,    color: B.magenta,    icon: "⭐" },
    { label: "The BEAT Students",         value: beatTotal,     color: B.green,   icon: "🏆" },
    { label: "G&C / Safeguarding Reach",  value: gcTotal,       color: B.teal,     icon: "🛡️" },
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-md mb-5 bg-white">
      <div className="px-5 py-3.5 text-white" style={{ background: B.indigo }}>
        <div className="flex items-center gap-3">
          <span className="text-lg">🌍</span>
          <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH }}>Total Impact Numbers</span>
        </div>
      </div>
      <div className="bg-white px-5 py-5 space-y-4">
        <div className="text-center pb-3 border-b border-gray-100">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400" style={{ ...FB }}>Total People Reached This Week</p>
          <h2 className="text-5xl mt-2" style={{ ...FH, color: B.text }}>{grandTotal}</h2>
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

// Deterministic colored-initials avatar — no upload/storage needed, every
// teammate gets a consistent, recognizable identity across the app just from
// their email.
const AVATAR_COLORS = [B.indigo, B.teal, B.magenta, B.red, B.green, B.gold]
function avatarColorFor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function initialsFor(email: string): string {
  const name = (email || "").split("@")[0].split(".")[0]
  return name.slice(0, 2).toUpperCase() || "?"
}
function Avatar({ email, size = 28 }: { email: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-none"
      style={{ width: size, height: size, background: avatarColorFor(email), fontSize: size * 0.4, ...FH }}
      title={email}
    >
      {initialsFor(email)}
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

  async function send() {
    if (!text.trim()) return
    const mentioned = extractMentions(text)
    const msg: ChatMessage = { id: uid(), sender: currentUser, text: text.trim(), timestamp: new Date().toISOString(), mentionedEmails: mentioned, heartedBy: [] }
    onChange([...messages, msg])
    setText("")
    if (mentioned.length === 0) {
      triggerToast("Message posted to team chat.")
      return
    }
    triggerToast(`Pinging ${mentioned.length} teammate(s)...`)
    const results = await Promise.all(mentioned.map(email => sendFlashCardEmail({
      to: email,
      subject: `ChezaCheza MMM: You were mentioned by ${currentUser}`,
      heading: `${currentUser} mentioned you`,
      body: `"${text.trim()}"`,
      footer: "Open the MMM workspace to see the full conversation.",
      accentColor: B.indigo,
    })))
    if (results.every(r => r)) {
      triggerToast(`Pinged ${mentioned.length} teammate(s) by email.`)
    } else {
      const subject = encodeURIComponent(`ChezaCheza MMM: You were mentioned by ${currentUser}`)
      const body = encodeURIComponent(`${currentUser} mentioned you in the workspace chat:\n\n"${text.trim()}"\n\nOpen the MMM workspace to see the full conversation.`)
      // window.location.href (not window.open) is what reliably hands off to
      // the browser's registered mail handler when the automated send fails.
      window.location.href = `mailto:${mentioned.join(",")}?subject=${subject}&body=${body}`
      triggerToast("Automated send unavailable for some pings — opening Gmail instead.")
    }
  }

  function formatTime(ts: string) {
    try { return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } catch { return "" }
  }

  function toggleHeart(msgId: string) {
    onChange(messages.map(m => {
      if (m.id !== msgId) return m
      const hearted = m.heartedBy.includes(currentUser)
      return { ...m, heartedBy: hearted ? m.heartedBy.filter(e => e !== currentUser) : [...m.heartedBy, currentUser] }
    }))
  }

  function deleteMessage(msgId: string) {
    onChange(messages.filter(m => m.id !== msgId))
    triggerToast("Message deleted.")
  }

  const rawName = currentUser.split("@")[0].split(".")[0]
  const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  return (
    <Section title="Team Chat & Pings" icon={<img src={mouthIcon} className="w-5 h-5 object-contain" alt="" />} color={B.indigo} badge={`${messages.length} messages`} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="bg-white rounded-xl p-2.5 mb-3 text-[11px] text-indigo-700 font-medium flex items-center gap-2 border border-indigo-100" style={{ ...FB }}>
        <span>💡</span> Tag @name@chezachezadance.org to send them a real email ping instantly.
      </div>
      <div ref={scrollRef} className="space-y-2 max-h-72 overflow-y-auto bg-white rounded-xl p-3 border border-gray-200">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-6" style={{ ...FB }}>No messages yet. Say hi to the team, {firstName}!</p>
        ) : messages.map(msg => {
          const senderName = msg.sender.split("@")[0].split(".")[0]
          const senderDisplay = senderName.charAt(0).toUpperCase() + senderName.slice(1)
          const isMe = msg.sender === currentUser
          const renderedText = msg.text.replace(/(@[\w.]+@chezachezadance\.org)/gi, '<span style="font-weight:700;color:#3b82f6">$1</span>')
          const hearted = msg.heartedBy.includes(currentUser)
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar email={msg.sender} size={26} />
              <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${isMe ? "bg-indigo-700 text-white" : "bg-gray-50 border border-gray-200 text-gray-900"}`} style={{ ...FB }}>
                  {!isMe && <div className="text-[10px] font-bold text-indigo-600 mb-0.5">{senderDisplay}</div>}
                  <div dangerouslySetInnerHTML={{ __html: renderedText }} />
                  <div className={`text-[9px] mt-1 ${isMe ? "text-indigo-300" : "text-gray-400"}`}>{formatTime(msg.timestamp)}{msg.mentionedEmails.length > 0 && " · pinged"}</div>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <button onClick={() => toggleHeart(msg.id)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full hover:bg-rose-50 transition-all">
                    <img src={heartIcon} className="w-3.5 h-3.5 object-contain transition-transform" style={{ opacity: hearted ? 1 : 0.35, transform: hearted ? "scale(1.15)" : "scale(1)" }} alt="heart" />
                    {msg.heartedBy.length > 0 && <span className="text-[9px] font-bold text-rose-500">{msg.heartedBy.length}</span>}
                  </button>
                  {isMe && (
                    <button onClick={() => deleteMessage(msg.id)} className="text-gray-300 hover:text-red-500 px-1 py-0.5 rounded-full hover:bg-red-50 transition-all text-[11px]" title="Delete message">🗑️</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          className="flex-1 text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          placeholder="Type a message... Use @name@chezachezadance.org to email-ping someone"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send() }}
        />
        <button onClick={send} className="bg-indigo-800 hover:bg-indigo-900 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-1 transition-all hover:scale-105">Send</button>
      </div>
    </Section>
  )
}

function AISummaryPanel({ meeting, root, currentUser, onClose }: { meeting: Meeting; root: Root; currentUser: string; onClose: () => void }) {
  const [activeKey, setActiveKey] = useState("weekly")
  const [response, setResponse] = useState("")
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const showMonthly = isLastWeekOfMonth(meeting.date)
  const visibleCategories = AI_CATEGORIES.filter(c => c.key !== "monthly" || showMonthly)
  const activeCat = visibleCategories.find(c => c.key === activeKey) || visibleCategories[0]
  const inMonthMeetings = meetingsInSameMonth(root.meetings, meeting.date)
  const monthLabel = new Date(meeting.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })

  async function generate() {
    setLoading(true); setResponse(""); setError(""); setTruncated(false)
    try {
      const prompt = activeCat.buildPrompt({ meeting, meetings: inMonthMeetings, monthLabel, currentUser })
      const { text, truncated: wasTruncated } = await callAIAssistant(activeCat.key, prompt)
      setResponse(text); setTruncated(wasTruncated)
    } catch (err: any) {
      setError(`Something went wrong: ${err?.message || "unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  // Locking body scroll while the modal is open stops the wheel/trackpad
  // scroll from "bleeding through" to the long page behind it — that bleed-
  // through is exactly what made the main page scroll instead of the panel.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="rounded-2xl overflow-hidden shadow-2xl bg-white max-w-lg w-full my-8 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
      <div className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-white flex-none" style={{ background: B.red }}>
        <span className="text-lg">✨</span>
        <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH }}>AI Assistant</span>
        {response && !loading && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/25">Ready</span>}
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>

      {(
        <div className="px-5 py-4 space-y-4 bg-white overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {visibleCategories.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setActiveKey(cat.key); setResponse(""); setError("") }}
                className="text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all"
                style={activeKey === cat.key ? { background: cat.color, color: "white", borderColor: cat.color } : { background: "white", color: "#555", borderColor: "#e0dff5" }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 italic -mt-1">
            {activeCat.tagline}{activeCat.key === "monthly" ? ` (combining ${inMonthMeetings.length} week${inMonthMeetings.length === 1 ? "" : "s"} from ${monthLabel})` : ""}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs font-bold px-5 py-2.5 rounded-xl text-white flex items-center gap-2 transition-all disabled:opacity-60"
              style={{ background: loading ? activeCat.color + "88" : activeCat.color }}
            >
              {loading ? <><span className="animate-spin inline-block">⟳</span> Thinking…</> : <>✨ Generate</>}
            </button>
            {response && !loading && (
              <button onClick={generate} className="text-xs underline" style={{ color: activeCat.color }}>Regenerate</button>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 font-medium">{error}</div>
          )}

          {(response || loading) && (
            <div className="rounded-xl p-4 text-sm leading-relaxed border bg-white whitespace-pre-wrap" style={{ borderColor: activeCat.color + "30", color: "#1a2340", ...FB }}>
              {response || <span className="text-gray-400 italic text-xs">Writing…</span>}
            </div>
          )}
          {truncated && !loading && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">Response was cut short for length — click Regenerate for a tighter version, or ask again to continue.</div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function DepartmentSection({ departments, onChange, currentUser, triggerToast, meeting, onCounterChange, impactData, onImpactChange }: {
  departments: Dept[]; onChange: (d: Dept[]) => void; currentUser: string; triggerToast: (m: string) => void; meeting: Meeting; onCounterChange: (u: Partial<Meeting>) => void; impactData: Community[]; onImpactChange: (c: Community[]) => void
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

  // Sends a real flash-card email straight to the owner's inbox via the
  // send-flash-card-email Edge Function (Resend). Falls back to opening a
  // pre-filled Gmail compose window only if the automated send fails.
  async function notifyOwner(item: ActionItem, deptName: string) {
    const email = item.owner.trim()
    if (!email.includes("@")) {
      triggerToast("Add the owner's email first, e.g. name@chezachezadance.org.")
      return
    }
    triggerToast("Sending ping...")
    const sent = await sendFlashCardEmail({
      to: email,
      subject: `ChezaCheza MMM: Action item assigned to you in ${deptName}`,
      heading: `New action item in ${deptName}`,
      body: `Task: ${item.text || "(untitled)"}\nDeadline: ${item.deadline || "Not set"}`,
      footer: "Open the MMM workspace for full details.",
      accentColor: B.magenta,
    })
    if (sent) {
      triggerToast(`Pinged ${email} by email.`)
    } else {
      const subject = encodeURIComponent(`ChezaCheza MMM: Action item assigned to you in ${deptName}`)
      const body = encodeURIComponent(`You've been assigned an action item in ${deptName}.\n\nTask: ${item.text || "(untitled)"}\nDeadline: ${item.deadline || "Not set"}\n\nOpen the MMM workspace for full details.`)
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`
      triggerToast("Automated send unavailable — opening Gmail instead.")
    }
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

  const anyCollapsed = departments.some(d => d.expanded === false)

  return (
    <Section title="Departmental Updates & Action Items" icon="📋" color={B.indigo} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="flex justify-end">
        <button
          onClick={() => onChange(departments.map(d => ({ ...d, expanded: anyCollapsed })))}
          className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all hover:scale-105 mb-1"
        >
          {anyCollapsed ? "⬇️ Expand All" : "⬆️ Collapse All"}
        </button>
      </div>
      <div className="space-y-6">
        {departments.map(dept => {
          const currentSticker = SC[dept.sticker || "pending"]
          const regionName = REGION_COMMUNITY_MAP[dept.id]
          const community = regionName ? impactData.find(c => c.name === regionName) || null : null
          const accentColor = community ? community.color : (DEPT_COLORS[dept.id] || B.indigo)
          const isExpanded = dept.expanded !== false

          return (
            <React.Fragment key={dept.id}>
            <div className="border rounded-2xl p-4 bg-white shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5" style={{ borderColor: "#e5e7eb", borderLeftWidth: 4, borderLeftColor: accentColor, borderRightWidth: 4, borderRightColor: accentColor }}>
              <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isExpanded ? "border-b border-gray-100 pb-3" : ""}`}>
                <button
                  type="button"
                  onClick={() => updateDept(dept.id, { expanded: !isExpanded })}
                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                >
                  <span className="text-gray-400 text-xs flex-none">{isExpanded ? "▼" : "▶"}</span>
                  {DEPT_ILLUSTRATED_ICONS[dept.id] ? <img src={DEPT_ILLUSTRATED_ICONS[dept.id]} className="w-5 h-5 object-contain flex-none" alt="" /> : <span className="text-lg flex-none">{dept.iconKey}</span>}
                  <span className="font-extrabold text-indigo-950 text-base truncate" style={{ ...FH }}>{dept.name}</span>
                  {dept.isLocked && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-none">🔒 Locked</span>}
                  {dept.lockPin && !dept.isLocked && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-none">🔐 PIN Protected</span>}
                </button>

                <div className="flex items-center gap-2 flex-none">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1" style={{ background: currentSticker.bg, borderColor: currentSticker.border, color: currentSticker.text }}>
                    {currentSticker.icon} {currentSticker.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLockToggle(dept)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110"
                    title={dept.isLocked ? "Unlock section" : "Lock section with PIN"}
                  >
                    {dept.isLocked ? <span className="text-amber-600">🔒</span> : <span>🔓</span>}
                  </button>
                </div>
              </div>

              {isExpanded && (
              <>
              {/* Inline program counters for specific departments */}
              {dept.id === "happy" && (
                <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "rgba(236, 72, 153, 0.08)", borderColor: "rgba(236, 72, 153, 0.3)" }}>
                  <span className="text-2xl">⭐</span>
                  <div className="flex-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#9d174d" }}>Total Students Reached</span>
                    <div className="text-2xl font-bold" style={{ ...FH, color: B.magenta }}>{Math.max(0, parseInt(meeting.happySchoolsStudents) || 0)}</div>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>1:1s: Parents</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.teal }}>{Math.max(0, parseInt(meeting.gcCounters.oneOnOnesParents) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.oneOnOnesParents} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, oneOnOnesParents: e.target.value } }); triggerToast("1:1s (Parents) counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>1:1s: Children</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.teal }}>{Math.max(0, parseInt(meeting.gcCounters.oneOnOnesChildren) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.oneOnOnesChildren} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, oneOnOnesChildren: e.target.value } }); triggerToast("1:1s (Children) counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>Group Therapy</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.teal }}>{Math.max(0, parseInt(meeting.gcCounters.groupTherapy) || 0)}</div>
                    <input type="number" min="0" disabled={dept.isLocked} className="w-full text-xs border rounded px-2 py-1 font-bold focus:outline-none" value={meeting.gcCounters.groupTherapy} onChange={e => { onCounterChange({ gcCounters: { ...meeting.gcCounters, groupTherapy: e.target.value } }); triggerToast("Group therapy counter updated.") }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ ...FB, color: "#0284c7" }}>Family Therapy</span>
                    <div className="text-xl font-bold mb-1" style={{ ...FH, color: B.teal }}>{Math.max(0, parseInt(meeting.gcCounters.familyTherapy) || 0)}</div>
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
                  placeholder="Type department update here... Use the toolbar above for Bold, Italic, Numbered Lists, Colors, and Highlight."
                />
              </div>

              {community && (
                <RegionNumbersBlock
                  community={community}
                  onChange={updated => onImpactChange(impactData.map(c => c.id === updated.id ? updated : c))}
                  numbersLocked={meeting.numbersLocked}
                  triggerToast={triggerToast}
                />
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Department Action Items ({dept.actionItems?.length || 0})</span>
                  {!dept.isLocked && (
                    <button onClick={() => addActionItem(dept.id)} className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition-all hover:scale-105">
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
                          <input disabled={dept.isLocked} className="w-32 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none" placeholder="Owner email" value={item.owner} onChange={e => updateActionItem(dept.id, item.id, { owner: e.target.value })} />
                          <button type="button" disabled={dept.isLocked} onClick={() => notifyOwner(item, dept.name)} className="text-gray-400 hover:text-blue-600 p-1 disabled:opacity-40 disabled:hover:text-gray-400 transition-all hover:scale-125" title="Email-ping the owner instantly">🔔</button>
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
              </>
              )}
            </div>
            {dept.id === "comm-lead" && (
              <ImpactSection impactData={impactData} numbersLocked={meeting.numbersLocked} />
            )}
            </React.Fragment>
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
        <div className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-2">
          <h4 className="font-bold text-emerald-900 uppercase flex items-center gap-1.5" style={{ ...FB }}><span>👤+</span> New Joining Entrants</h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={entrantInput} onChange={e => setEntrantInput(e.target.value)} />
            <button onClick={addEntrant} className="bg-emerald-700 text-white font-bold px-2.5 rounded text-xs">Add</button>
          </div>
          <ul className="space-y-1 pt-1">
            {staffing.entrants.map((name, i) => (
              <li key={i} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-emerald-100">
                <span>{name}</span>
                <button onClick={() => onChange({ ...staffing, entrants: staffing.entrants.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600">❌</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 bg-white border border-rose-200 rounded-xl space-y-2">
          <h4 className="font-bold text-rose-900 uppercase flex items-center gap-1.5" style={{ ...FB }}><span>👤-</span> Staff Departures / Exits</h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={exitInput} onChange={e => setExitInput(e.target.value)} />
            <button onClick={addExit} className="bg-rose-700 text-white font-bold px-2.5 rounded text-xs">Add</button>
          </div>
          <ul className="space-y-1 pt-1">
            {staffing.exits.map((name, i) => (
              <li key={i} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-rose-100">
                <span>{name}</span>
                <button onClick={() => onChange({ ...staffing, exits: staffing.exits.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-600">❌</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 bg-white border border-indigo-200 rounded-xl space-y-2">
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
                <li key={i} className="flex justify-between items-center bg-gray-50 p-1.5 rounded border border-indigo-100">
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

function AnnouncementsSection({ announcements, onChange, currentUser, triggerToast }: {
  announcements: Announcement[]; onChange: (a: Announcement[]) => void; currentUser: string; triggerToast: (m: string) => void
}) {
  const [exp, setExp] = useState(true)
  const [text, setText] = useState("")
  const [urgent, setUrgent] = useState(false)

  function post() {
    if (!text.trim()) return
    const newA: Announcement = { id: uid(), text: text.trim(), postedBy: currentUser, date: new Date().toLocaleDateString(), isUrgent: urgent }
    onChange([newA, ...announcements])
    triggerToast("Announcement published.")
    setText(""); setUrgent(false)
  }

  return (
    <Section title="Key Reminders & Announcements" icon="📢" color={B.gold} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="space-y-3 text-xs">
        <div className="p-3 bg-white border border-orange-200 rounded-xl space-y-2">
          <textarea rows={2} className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none" placeholder="Type general reminder or urgent announcement..." value={text} onChange={e => setText(e.target.value)} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-orange-950"><input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} /> Mark as Urgent</label>
            <button onClick={post} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all hover:scale-105">Publish Announcement</button>
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

function EnhancedAdminPanel({ meeting, onUpdateMeeting, onSpawnWeek, onDeleteMeeting, onRestoreMeeting, onPermanentDelete, onRestoreFromHistory, triggerToast, currentUser, liveMeetings, binnedMeetings, onToggleNumbersLock }: {
  meeting: Meeting; onUpdateMeeting: (u: Partial<Meeting>) => void; onSpawnWeek: (wk: number, dateStr: string) => void; onDeleteMeeting: (id: string) => void; onRestoreMeeting: (id: string) => void; onPermanentDelete: (id: string) => void; onRestoreFromHistory: (state: Root) => void; triggerToast: (m: string) => void; currentUser: string; liveMeetings: Meeting[]; binnedMeetings: Meeting[]; onToggleNumbersLock: () => void
}) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passError, setPassError] = useState(false)
  const todayStr = new Date().toISOString().split("T")[0]
  const [spawnDate, setSpawnDate] = useState(todayStr)
  const [spawnWk, setSpawnWk] = useState(getISOWeek(todayStr))
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; week: number } | null>(null)
  const [showBin, setShowBin] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<{ id: number; created_at: string; weeks: number[] }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase.from("app_state_history").select("id, state, created_at").order("created_at", { ascending: false }).limit(20)
    setHistoryEntries((data || []).map((row: any) => ({ id: row.id, created_at: row.created_at, weeks: (row.state?.meetings || []).map((m: any) => m.weekNumber) })))
    setLoadingHistory(false)
  }

  async function restoreHistoryEntry(id: number) {
    const { data } = await supabase.from("app_state_history").select("state").eq("id", id).maybeSingle()
    if (data?.state?.meetings) {
      onRestoreFromHistory(data.state as Root)
      triggerToast("Restored from history. Review it, then it'll auto-save.")
    } else {
      triggerToast("Couldn't load that history entry.")
    }
  }

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
        <p className="text-xs text-gray-500 font-medium">Enter the admin password to continue.</p>
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
  const sortedMeetings = [...liveMeetings].sort((a, b) => b.weekNumber - a.weekNumber)
  const sortedBinned = [...binnedMeetings].sort((a, b) => b.weekNumber - a.weekNumber)

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
              <input
                type="date"
                className="text-xs bg-white text-gray-900 font-bold px-2 py-1 rounded focus:outline-none"
                value={spawnDate}
                onChange={e => { setSpawnDate(e.target.value); setSpawnWk(getISOWeek(e.target.value)) }}
              />
              <input type="number" className="w-14 text-xs bg-white text-gray-900 font-bold px-2 py-1 rounded focus:outline-none" value={spawnWk} onChange={e => setSpawnWk(parseInt(e.target.value) || spawnWk)} />
              <button onClick={() => { onSpawnWeek(spawnWk, spawnDate); triggerToast(`Created Week ${spawnWk} Log (${spawnDate})`) }} className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors">
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
          Lock all HUB attendance input fields (both here and inside each region's department card) to prevent accidental or unauthorized changes to the numbers.
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
                    <div className="text-xs font-bold text-gray-900" style={{ ...FB }}>Week {m.weekNumber}: {dateLabel}</div>
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

      {/* Bin — soft-deleted logs, fully recoverable until permanently removed */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <button onClick={() => setShowBin(s => !s)} className="w-full flex items-center justify-between text-left">
          <h3 className="text-base text-gray-900 flex items-center gap-2" style={{ ...FH }}>
            <span>🗑️</span> Bin {sortedBinned.length > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: B.red }}>{sortedBinned.length}</span>}
          </h3>
          <span className="text-gray-400 text-sm">{showBin ? "▲" : "▼"}</span>
        </button>
        {showBin && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500 mb-2">Deleted logs land here first, not gone for good — restore them anytime, or remove them permanently.</p>
            {sortedBinned.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">The bin is empty.</p>
            ) : sortedBinned.map(m => {
              const dateObj = new Date(m.date + "T00:00:00")
              const dateLabel = isNaN(dateObj.getTime()) ? m.date : dateObj.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs bg-gray-200 text-gray-500" style={{ ...FH }}>
                      W{m.weekNumber}
                    </div>
                    <div className="text-xs font-bold text-gray-500" style={{ ...FB }}>Week {m.weekNumber}: {dateLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onRestoreMeeting(m.id)} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all hover:scale-105">↩ Restore</button>
                    <button onClick={() => onPermanentDelete(m.id)} className="text-xs text-red-600 hover:text-red-800 font-bold px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-all hover:scale-105">Delete Forever</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Save History — every save attempt is logged here, win or lose any
          version conflict, so nothing is ever truly unrecoverable. */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <button onClick={() => { setShowHistory(s => !s); if (!showHistory && historyEntries.length === 0) loadHistory() }} className="w-full flex items-center justify-between text-left">
          <h3 className="text-base text-gray-900 flex items-center gap-2" style={{ ...FH }}>
            <span>🕰️</span> Save History
          </h3>
          <span className="text-gray-400 text-sm">{showHistory ? "▲" : "▼"}</span>
        </button>
        {showHistory && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500 mb-2">Every save is backed up here, even ones that lost a conflict with someone else's save. Use this if something looks wrong and the Bin doesn't have it.</p>
            {loadingHistory ? (
              <p className="text-xs text-gray-400 italic text-center py-4">Loading…</p>
            ) : historyEntries.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No history yet.</p>
            ) : historyEntries.map(entry => {
              const d = new Date(entry.created_at)
              const label = isNaN(d.getTime()) ? entry.created_at : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="text-xs text-gray-700">
                    <span className="font-bold" style={{ ...FB }}>{label}</span>
                    <span className="text-gray-400"> — weeks {entry.weeks.join(", ")}</span>
                  </div>
                  <button onClick={() => restoreHistoryEntry(entry.id)} className="text-xs text-indigo-700 hover:text-indigo-900 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-all hover:scale-105">Restore This</button>
                </div>
              )
            })}
            <button onClick={loadHistory} className="text-xs text-gray-400 hover:text-gray-600 underline">Refresh list</button>
          </div>
        )}
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["pending", "hazard", "accomplished", "protected"].map(st => {
                      const cfg = SC[st]
                      const active = dept.sticker === st
                      return (
                        <button
                          key={st}
                          onClick={() => toggleDeptSticker(dept.id, st)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${active ? "scale-105 shadow-sm" : "hover:scale-105"}`}
                          style={{ borderColor: active ? cfg.border : "#e5e7eb", background: active ? cfg.bg : "#fff", color: active ? cfg.text : "#6b7280" }}
                        >
                          <span>{cfg.icon}</span> {cfg.label}
                        </button>
                      )
                    })}
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
            <p className="text-xs text-gray-600 font-medium">This can't be undone — all updates, action items, and numbers for this week will be removed.</p>
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
  // Real Supabase Auth session — replaces the old client-side "does this
  // string end in @chezachezadance.org" check. The database itself now only
  // trusts a genuinely signed-in session (see the RLS policies), so this is
  // no longer just a UI gate.
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const userEmail = session?.user?.email || ""
  const isEmailVerified = !!session
  const [emailError, setEmailError] = useState("")
  const [viewMode, setViewMode] = useState("team")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [syncStatus, setSyncStatus] = useState("Connecting to shared workspace...")
  const [liveUsers, setLiveUsers] = useState(1)
  const [showAI, setShowAI] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabaseReady = useRef(false)
  const isApplyingRemote = useRef(false)
  // True from the moment a save is queued (debounce pending) until it
  // finishes. While true, a live update from elsewhere is deferred instead
  // of overwriting the screen mid-keystroke — this is the actual cause of
  // "things erase while adding action items on phone": a teammate's (or
  // your own other device's) save was landing while you were still typing,
  // and the realtime handler applied it immediately with no protection.
  const localEditInFlight = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // The version we last loaded from Supabase. Saves are conditional on this
  // number matching the database's current version — if someone else (a
  // different tab, device, or the deployed site) saved in between, our write
  // is rejected instead of silently overwriting their change. This is what
  // stops one editor's work from clobbering another's with no trace.
  const versionRef = useRef(0)

  const showSuccessToast = useCallback((msg: string) => setToastMessage(msg), [])
  const hasReconciledAfterAuth = useRef(false)

  // Pulls the shared server copy and decides whether to apply it, comparing
  // versions rather than blindly trusting the server. What Supabase version
  // this device last actually saw: if a box gets typed into and the page
  // refreshes before the 600ms debounced push (or its network round trip)
  // completes, localStorage already has the fresh text — but blindly
  // overwriting with whatever's still on the server would silently discard
  // that edit. This is the "boxes lose info on refresh" bug fix.
  // RLS now requires a real signed-in session to read app_state at all, so
  // this needs to run again once login completes, not just once on mount.
  async function reconcileWithServer(local: Root) {
    const lastKnownVersion = loadSyncedVersion()
    try {
      const { data, error } = await supabase.from("app_state").select("state, updated_by_session, version").eq("id", 1).maybeSingle()

      if (error) {
        setSyncStatus("Shared sync unavailable. Local changes still active")
      } else if (data?.state?.meetings) {
        const remoteVersion = (data as any).version ?? 0
        if (remoteVersion > lastKnownVersion) {
          // The server genuinely has something this device hasn't seen
          // (another tab/device/teammate saved since we last synced) — safe to apply.
          const remoteState = ensureRootFields(data.state as Root)
          versionRef.current = remoteVersion
          saveSyncedVersion(remoteVersion)
          isApplyingRemote.current = true
          setRoot(remoteState)
          setSyncStatus("Connected to shared workspace")
        } else {
          // Our local copy is at least as fresh as the server — possibly
          // ahead of it (an edit that never finished pushing). Keep it,
          // and nudge state once the connection is ready so the normal
          // save effect pushes it up and self-heals the missed sync.
          versionRef.current = remoteVersion
          saveSyncedVersion(remoteVersion)
          setSyncStatus("Connected to shared workspace")
          setRoot(prev => (prev ? { ...prev } : prev))
        }
      } else if (data?.state?.impactData) {
        isApplyingRemote.current = true
        setRoot({
          ...local,
          meetings: local.meetings.map(meeting =>
            meeting.id === local.activeMeetingId ? { ...meeting, impactData: data.state.impactData } : meeting
          ),
        })
        setSyncStatus("Connected. Existing attendance restored")
      } else {
        setSyncStatus("Connected. Ready to record updates")
      }
    } catch {
      setSyncStatus("Shared sync unavailable. Local changes still active")
    } finally {
      supabaseReady.current = true
    }
  }

  // Re-run reconciliation the moment a real session appears (fresh login,
  // not just a restored one) — the mount-time attempt below runs before
  // that session exists, so RLS would have returned nothing for it.
  useEffect(() => {
    if (!session || hasReconciledAfterAuth.current) return
    hasReconciledAfterAuth.current = true
    supabaseReady.current = false
    reconcileWithServer(loadRoot())
  }, [session])

  // Initial load: show local cache instantly, then reconcile with shared backend.
  // Realtime subscription keeps all connected machines in sync live.
  useEffect(() => {
    const local = loadRoot()
    setRoot(local)
    reconcileWithServer(local)

    // Restore the real Supabase session (persisted in localStorage by the
    // client itself) instead of trusting a hand-typed email string, and
    // listen for sign-in/sign-out so the whole app reacts to real auth state.
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    // Restore mood check-in
    try {
      const savedMood = sessionStorage.getItem(MOOD_KEY)
      if (savedMood) setIsCheckedIn(true)
    } catch { /* sandbox */ }

    // Realtime subscription — live co-working like Google Docs
    const channel = supabase
      .channel("app_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, (payload: any) => {
        const newState = payload.new?.state
        const senderSession = payload.new?.updated_by_session
        // Always track the true current version, even when deferring below —
        // this is what lets a save queued while typing still succeed once it
        // fires, instead of being rejected and triggering a second overwrite.
        if (typeof payload.new?.version === "number") { versionRef.current = payload.new.version; saveSyncedVersion(payload.new.version) }
        if (newState?.meetings && senderSession !== SESSION_ID) {
          if (localEditInFlight.current) {
            // A local edit is mid-keystroke or mid-save right now — applying
            // this would wipe it out from under you. Skip it; your own save
            // (queued or about to fire) will land using the version we just
            // updated above, so it isn't silently rejected either.
            setSyncStatus("Teammate update waiting — finishing your edit first")
            return
          }
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
          setSyncStatus("Connected. Live co-working active")
        }
      })

    channelRef.current = channel

    return () => { supabase.removeChannel(channel); authListener.subscription.unsubscribe() }
  }, [])

  // Save: instant local cache + debounced push to shared backend.
  useEffect(() => {
    if (!root) return
    saveRoot(root)
    if (!supabaseReady.current) return
    if (isApplyingRemote.current) { isApplyingRemote.current = false; return }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    // Set the moment ANY local edit queues a save, not just when it fires —
    // this is what tells the realtime handler above to hold off while you're
    // still typing, rather than overwriting mid-keystroke.
    localEditInFlight.current = true
    saveTimer.current = setTimeout(async () => {
      try {
      // Belt-and-suspenders backup: log every attempted save to history,
      // win or lose the version race below. Even if this edit gets rejected
      // as a conflict, its content is never gone — it's sitting in
      // app_state_history and can be pulled back by hand if needed.
      supabase.from("app_state_history").insert({ state: root, version: versionRef.current, updated_by_session: SESSION_ID }).then(() => {})

      // Conditional write: only succeeds if nobody else has saved since we
      // last loaded (version still matches). If someone else's write beat
      // us to it, .eq("version", ...) matches zero rows instead of blindly
      // overwriting their work — we then pull their latest and tell the
      // user plainly, instead of silently discarding what they had.
      const { data, error } = await supabase
        .from("app_state")
        .update({ state: root, updated_by_session: SESSION_ID, version: versionRef.current + 1, updated_at: new Date().toISOString() })
        .eq("id", 1)
        .eq("version", versionRef.current)
        .select("version")

      if (error) {
        setSyncStatus("Save issue. Your local copy is safe")
      } else if (data && data.length > 0) {
        versionRef.current = data[0].version
        saveSyncedVersion(data[0].version)
        setSyncStatus("All changes saved to shared workspace")
      } else {
        // Version mismatch — someone else saved first. Pull their version
        // rather than overwrite it, and say so clearly instead of failing silently.
        const { data: fresh } = await supabase.from("app_state").select("state, version").eq("id", 1).maybeSingle()
        if (fresh?.state?.meetings) {
          versionRef.current = (fresh as any).version ?? versionRef.current
          saveSyncedVersion(versionRef.current)
          isApplyingRemote.current = true
          setRoot(ensureRootFields(fresh.state as Root))
          showSuccessToast("Someone else saved changes just before you — showing their latest version. Redo your last edit if it's missing.")
          setSyncStatus("Reloaded — a teammate's save arrived first")
        } else {
          setSyncStatus("Save issue. Your local copy is safe")
        }
      }
      } finally {
        localEditInFlight.current = false
      }
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [root])

  if (!root) return <div className="p-10 text-center font-bold" style={{ ...FB }}>Loading Workspace Logs...</div>

  const liveMeetings = root.meetings.filter(m => !m.deleted)
  const binnedMeetings = root.meetings.filter(m => m.deleted)
  let activeMeeting = liveMeetings.find(m => m.id === root.activeMeetingId) || liveMeetings[0]

  function ensureRootFields(r: Root): Root {
    return { ...r, meetings: r.meetings.map(ensureMeetingFields) }
  }

  // Real login, step 1: send a one-time code to the typed address. The
  // database itself (via the enforce_org_email_domain trigger) rejects
  // anything outside @chezachezadance.org, so this is a genuine identity
  // check, not just a string comparison in the browser.
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    if (!email.endsWith("@chezachezadance.org")) {
      setEmailError("Access Denied. Only valid @chezachezadance.org workspace addresses are authorized.")
      return
    }
    setEmailError(""); setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setAuthLoading(false)
    if (error) {
      setEmailError(error.message || "Couldn't send a login code. Try again.")
    } else {
      setOtpSent(true)
      showSuccessToast(`Code sent to ${email} — check your inbox.`)
    }
  }

  // Real login, step 2: verify the 6-digit code. Success establishes an
  // actual Supabase session — that session is what the RLS policies check,
  // not anything the client claims about itself.
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    const email = loginEmail.trim().toLowerCase()
    setEmailError(""); setAuthLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode.trim(), type: "email" })
    setAuthLoading(false)
    if (error) {
      setEmailError(error.message || "That code didn't work — check it and try again.")
    } else {
      showSuccessToast("Workspace Access Authorized!")
    }
  }

  function updateActiveMeeting(updates: Partial<Meeting>) {
    if (!root || !activeMeeting) return
    const updatedMeetings = root.meetings.map(m => m.id === activeMeeting.id ? { ...m, ...updates } : m)
    setRoot({ ...root, meetings: updatedMeetings })
  }

  function handleSpawnWeek(wkNum: number, dateStr: string) {
    if (!root) return
    const newM = createMeeting(wkNum, root.settings.departments as any, dateStr)
    setRoot({ ...root, meetings: [newM, ...root.meetings], activeMeetingId: newM.id })
  }

  // Deleting a week log moves it to the bin (deleted: true) instead of
  // erasing it — the dropdown and Admin's live list both filter it out, but
  // it's still fully recoverable from the bin until permanently deleted.
  function handleDeleteMeeting(id: string) {
    if (!root) return
    if (liveMeetings.length <= 1) { showSuccessToast("Cannot delete the last remaining week log."); return }
    const updated = root.meetings.map(m => m.id === id ? { ...m, deleted: true } : m)
    const stillLive = updated.filter(m => !m.deleted)
    const newActive = id === root.activeMeetingId ? stillLive[0].id : root.activeMeetingId
    setRoot({ ...root, meetings: updated, activeMeetingId: newActive })
    showSuccessToast("Moved to the bin — restore it anytime from there.")
  }

  function handleRestoreMeeting(id: string) {
    if (!root) return
    setRoot({ ...root, meetings: root.meetings.map(m => m.id === id ? { ...m, deleted: false } : m) })
    showSuccessToast("Week log restored.")
  }

  function handlePermanentDelete(id: string) {
    if (!root) return
    setRoot({ ...root, meetings: root.meetings.filter(m => m.id !== id) })
    showSuccessToast("Permanently deleted.")
  }

  // Restoring from history is a deliberate local edit, not an incoming
  // remote update — it should go through the normal save path (and win the
  // version race like any other edit) rather than being treated as a sync.
  function handleRestoreFromHistory(historicalState: Root) {
    setRoot(ensureRootFields(historicalState))
  }

  function toggleNumbersLock() {
    if (!activeMeeting) return
    updateActiveMeeting({ numbersLocked: !activeMeeting.numbersLocked })
    showSuccessToast(activeMeeting.numbersLocked ? "Attendance numbers unlocked." : "Attendance numbers locked.")
  }

  return (
    <div className="min-h-screen pb-20 relative" style={{ ...FB, background: B.cream }}>
      <style>{FONT_IMPORT}</style>
      {toastMessage && <SuccessToast message={toastMessage} onClose={() => setToastMessage(null)} />}
      {showAI && <AISummaryPanel meeting={activeMeeting} root={root} currentUser={userEmail} onClose={() => setShowAI(false)} />}

      {!isEmailVerified ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: B.cream }}>
          <div className="absolute top-0 left-0 right-0 h-2 flex">
            <div className="flex-1" style={{ background: B.gold }} />
            <div className="flex-1" style={{ background: B.teal }} />
            <div className="flex-1" style={{ background: B.magenta }} />
            <div className="flex-1" style={{ background: B.green }} />
            <div className="flex-1" style={{ background: B.gold }} />
            <div className="flex-1" style={{ background: B.red }} />
          </div>

          <div className="absolute top-16 right-0 w-64 h-64 rounded-full opacity-15" style={{ background: B.teal }} />
          <div className="absolute bottom-8 left-0 w-48 h-48 rounded-full opacity-15" style={{ background: B.magenta }} />
          <div className="absolute bottom-24 right-8 w-24 h-24 rounded-full opacity-20" style={{ background: B.gold }} />

          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <img src={logoImg} alt="ChezaCheza Dance Foundation" className="h-14 w-auto object-contain" />
              <h1 className="text-3xl leading-tight" style={{ ...FH, color: B.magenta }}>ChezaCheza Dance Foundation</h1>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white uppercase tracking-widest" style={{ background: B.teal, ...FH }}>MMM Internal Workspace Portal</span>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendCode} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: B.indigo }}>Organization Email</label>
                  <input type="email" placeholder="name@chezachezadance.org" className="w-full text-sm border-2 rounded-xl px-4 py-2.5 bg-white text-gray-900 focus:outline-none font-medium transition-colors" style={{ borderColor: "#e4e2f4" }} onFocus={e => e.target.style.borderColor = B.teal} onBlur={e => e.target.style.borderColor = "#e4e2f4"} value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                </div>
                {emailError && <div className="border p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: "#fff0ee", borderColor: B.red, color: B.red }}><span>⚠</span> {emailError}</div>}
                <button type="submit" disabled={authLoading} className="w-full text-white font-bold rounded-full py-3 text-sm tracking-wider uppercase transition-all shadow-md hover:brightness-105 disabled:opacity-50" style={{ background: B.magenta, ...FH }}>{authLoading ? "Sending Code..." : "Send Login Code"}</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: B.indigo }}>6-Digit Code</label>
                  <p className="text-[11px] text-gray-400 mb-2">Sent to {loginEmail.trim().toLowerCase()} — check your inbox (and spam folder).</p>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={6} className="w-full text-lg tracking-[0.4em] text-center border-2 rounded-xl px-4 py-2.5 bg-white text-gray-900 focus:outline-none font-bold transition-colors" style={{ borderColor: "#e4e2f4" }} onFocus={e => e.target.style.borderColor = B.teal} onBlur={e => e.target.style.borderColor = "#e4e2f4"} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} />
                </div>
                {emailError && <div className="border p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2" style={{ background: "#fff0ee", borderColor: B.red, color: B.red }}><span>⚠</span> {emailError}</div>}
                <button type="submit" disabled={authLoading || otpCode.length < 6} className="w-full text-white font-bold rounded-full py-3 text-sm tracking-wider uppercase transition-all shadow-md hover:brightness-105 disabled:opacity-50" style={{ background: B.magenta, ...FH }}>{authLoading ? "Verifying..." : "Enter Workspace"}</button>
                <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); setEmailError("") }} className="w-full text-xs font-medium text-gray-400 hover:text-gray-600">Use a different email</button>
              </form>
            )}

            <p className="text-[11px] text-gray-400" style={{ ...FB }}>Restricted to @chezachezadance.org addresses.</p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1" style={{ background: B.red }} />
            <div className="flex-1" style={{ background: B.gold }} />
            <div className="flex-1" style={{ background: B.green }} />
            <div className="flex-1" style={{ background: B.magenta }} />
            <div className="flex-1" style={{ background: B.teal }} />
            <div className="flex-1" style={{ background: B.gold }} />
          </div>
        </div>
      ) : !isCheckedIn ? (
        <GreetingScreen userName={userEmail} onCheckIn={() => setIsCheckedIn(true)} />
      ) : (
        <>
          <header className="bg-white border-b sticky top-0 z-20 shadow-sm" style={{ borderColor: "#e4e2f4" }}>
            <div className="h-1.5 flex">
              <div className="flex-1" style={{ background: B.gold }} />
              <div className="flex-1" style={{ background: B.teal }} />
              <div className="flex-1" style={{ background: B.magenta }} />
              <div className="flex-1" style={{ background: B.green }} />
              <div className="flex-1" style={{ background: B.indigo }} />
              <div className="flex-1" style={{ background: B.red }} />
            </div>
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="ChezaCheza" className="h-8 w-auto object-contain" />
                  <div>
                    <h1 className="text-2xl tracking-wide" style={{ ...FH, color: B.magenta }}>ChezaCheza Dance Foundation</h1>
                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                      <Avatar email={userEmail} size={18} />
                      Logged in as: <strong className="text-indigo-900">{userEmail}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAI(true)} className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:brightness-105 transition-all shadow-sm" style={{ background: B.red }} title="AI Assistant">✨</button>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg" title="Number of people currently editing">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {liveUsers} {liveUsers === 1 ? "person" : "people"} editing
                  </span>
                  <button onClick={() => setViewMode(viewMode === "admin" ? "team" : "admin")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:scale-105" style={{ background: viewMode === "admin" ? B.indigo : "white", color: viewMode === "admin" ? "white" : B.indigo, borderColor: B.indigo }} title="Admin Panel Access">🔑 Admin</button>
                  <select className="text-xs border rounded-lg font-bold px-2.5 py-1.5 cursor-pointer bg-white text-indigo-950 border-gray-300" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                    <option value="team">👥 Team Editor View</option>
                    <option value="admin">🛡️ Executive Admin View</option>
                  </select>
                  <button onClick={async () => { await supabase.auth.signOut(); try { sessionStorage.removeItem(MOOD_KEY) } catch { } setIsCheckedIn(false); setLoginEmail(""); setOtpSent(false); setOtpCode("") }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors" title="Log Out">🚪</button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Log:</span>
                  <select className="text-xs font-bold text-white border-0 rounded-full px-3 py-1 cursor-pointer" style={{ background: B.teal }} value={activeMeeting.id} onChange={e => setRoot({ ...root, activeMeetingId: e.target.value })}>
                    {liveMeetings.map(m => <option key={m.id} value={m.id}>Week {m.weekNumber} Log ({m.date})</option>)}
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
                onRestoreMeeting={handleRestoreMeeting}
                onPermanentDelete={handlePermanentDelete}
                onRestoreFromHistory={handleRestoreFromHistory}
                triggerToast={showSuccessToast}
                currentUser={userEmail}
                liveMeetings={liveMeetings}
                binnedMeetings={binnedMeetings}
                onToggleNumbersLock={toggleNumbersLock}
              />
            ) : (
              <>
                <MainCounterSection meeting={activeMeeting} impactData={activeMeeting.impactData} />

                <AnnouncementsSection announcements={activeMeeting.announcements} onChange={announcements => updateActiveMeeting({ announcements })} currentUser={userEmail} triggerToast={showSuccessToast} />

                <TeamChatSection messages={activeMeeting.chatMessages} onChange={chatMessages => updateActiveMeeting({ chatMessages })} currentUser={userEmail} triggerToast={showSuccessToast} />

                <StaffingSection staffing={activeMeeting.staffing} onChange={staffing => updateActiveMeeting({ staffing })} triggerToast={showSuccessToast} />

                <DepartmentSection
                  departments={activeMeeting.departments}
                  onChange={depts => updateActiveMeeting({ departments: depts })}
                  currentUser={userEmail}
                  triggerToast={showSuccessToast}
                  meeting={activeMeeting}
                  onCounterChange={updateActiveMeeting}
                  impactData={activeMeeting.impactData}
                  onImpactChange={data => updateActiveMeeting({ impactData: data })}
                />
              </>
            )}
          </main>
        </>
      )}
    </div>
  )
}
