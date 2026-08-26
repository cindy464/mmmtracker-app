import React, { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

// ─── Brand Theme ─────────────────────────────────────────────────────────────
const B = {
  indigo:    "#3c3b8e",
  teal:      "#00afaa",
  orange:    "#f97316",
  magenta:   "#d4147a",
  green:     "#22c55e",
  red:       "#ef4444",
  blue:      "#3b82f6",
  purple:    "#7c3aed",
  gold:      "#d4af37",
}




// Supabase Cloud Configuration
const SUPABASE_URL = "https://mtadbfenjfrdajibcejc.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YWRiZmVuamZyZGFqaWJjZWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMjU2NDMsImV4cCI6MjEwMjgwMTY0M30.uu84lV3fwOSLP8HCqYR_zH5eGAq3Z_wnmPyNvNtshoc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Ranchers for headings, Noto Sans for body text
const FH = { fontFamily: "'Ranchers', cursive", fontWeight: 400, letterSpacing: "0.02em" }
const FB = { fontFamily: "'Noto Sans', sans-serif" }
const FM = { fontFamily: "monospace" }

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Ranchers&family=Noto+Sans:wght@400;500;600;700;800&display=swap');`

// Helper utilities
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

function emptyHub(name) {
  return { id: uid(), name, junior: "", senior: "", signedConsent: "", missingConsent: "", newStudents: "" }
}

const DEFAULT_IMPACT = [
  { name: "Mathare",      color: B.magenta, hubs: ["St.Lwang'a", "MathareNorth", "T.Area", "Dandora 2"].map(emptyHub) },
  { name: "Kibera North", color: B.indigo,  hubs: ["Vuma", "Ayany", "Rongai", "Ruiru", "Dagoretti"].map(emptyHub) },
  { name: "Kibera South", color: B.teal,    hubs: ["Ayany", "Kambi Muru", "Kisumu Ndogo", "Gatwekera", "Mashimoni", "DC"].map(emptyHub) },
  { name: "Eastlands",    color: B.orange,  hubs: ["Korogocho", "LungaLunga", "Mukuru kwa Rueben", "Dandora 4", "Dandora 5"].map(emptyHub) },
]

const DEFAULT_DEPTS = [
  { id: "comm-kn",   name: "Community Kibera North",                 iconKey: "👥",   category: "programs" },
  { id: "comm-ks",   name: "Community Kibera South",                 iconKey: "👥",   category: "programs" },
  { id: "comm-mt",   name: "Community Mathare",                      iconKey: "👥",   category: "programs" },
  { id: "comm-el",   name: "Community Eastlands",                    iconKey: "👥",   category: "programs" },
  { id: "happy",     name: "Happy Schools",                          iconKey: "⭐",   category: "programs" },
  { id: "beat",      name: "The BEAT",                               iconKey: "🏆",   category: "programs" },
  { id: "allstars",  name: "AllStars",                               iconKey: "🌿",   category: "programs" },
  { id: "strat",     name: "Strategic Comms & Partnerships",         iconKey: "📢",   category: "departmental" },
  { id: "gc",        name: "Guidance & Counseling / Safeguarding",   iconKey: "🛡️",   category: "departmental" },
  { id: "finance",   name: "Finance",                                iconKey: "💰",   category: "departmental" },
  { id: "hr",        name: "HR",                                     iconKey: "👥",   category: "departmental" },
  { id: "procure",   name: "Procurement",                            iconKey: "🔧",   category: "departmental" },
]

const STORAGE_KEY = "chezacheza_mmm_v11"
const AUTH_USER_KEY = "chezacheza_auth_user_v2"
const AUTO_SAVE_DEBOUNCE_MS = 800

const SC = {
  pending:      { label: "Pending",      bg: "#fff7ed", border: "#f97316", text: "#c2410c", icon: "🕒" },
  hazard:       { label: "At Risk",      bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "⚠️" },
  accomplished: { label: "Accomplished", bg: "#f0fdf4", border: "#22c55e", text: "#15803d", icon: "✅" },
  protected:    { label: "Protected",    bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "🛡️" },
}

function loadRoot() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch (e) { console.warn("Local storage access denied by sandbox.") }
  const initialMeeting = createMeeting(29, DEFAULT_DEPTS)
  return { meetings: [initialMeeting], activeMeetingId: initialMeeting.id, settings: { sheetsUrl: "", departments: DEFAULT_DEPTS } }
}

function saveRoot(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch(e) { console.warn("Failed to save to localStorage") }
}

// ─── BACKEND SYNC (Google Apps Script) ─────────────────────────────────────
// If root.settings.sheetsUrl is set (paste it in the Admin panel), the app
// will pull the latest shared state on load and push every change to it,
// on top of the instant local cache above. This is what keeps data alive
// across refresh even when the embedding page (e.g. a Figma Site iframe)
// restricts localStorage.
async function fetchRemoteState(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { method: "GET" })
    if (!res.ok) return null
    const data = await res.json()
    return data && data.meetings ? data : null
  } catch (e) {
    console.warn("Remote fetch failed, using local cache instead.", e)
    return null
  }
}

async function pushRemoteState(url, state, notify) {
  if (!url) return
  try {
    // text/plain avoids a CORS preflight against Apps Script web apps
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(notify ? { ...state, __notify: notify } : state),
    })
  } catch (e) {
    console.warn("Remote save failed, local cache still has the data.", e)
  }
}

function sumHub(h) {
  const j = Math.max(0, parseInt(h.junior) || 0)
  const s = Math.max(0, parseInt(h.senior) || 0)
  const sc = Math.max(0, parseInt(h.signedConsent) || 0)
  const mc = Math.max(0, parseInt(h.missingConsent) || 0)
  const ns = Math.max(0, parseInt(h.newStudents) || 0)
  return { total: j + s, j, s, sc, mc, ns }
}

function createMeeting(wk, defs) {
  return {
    id: uid(),
    weekNumber: wk,
    date: new Date().toISOString().split("T")[0],
    status: "draft",
    impactData: DEFAULT_IMPACT.map(c => ({ ...c, id: uid(), hubs: c.hubs.map(h => ({ ...h, id: uid() })) })),
    departments: defs.map(d => ({ ...d, update: "", actionItems: [], expanded: true, reported: false, updatedBy: "", sticker: "pending", isLocked: false })),
    staffing: { entrants: [], exits: [], onLeave: [], mathareOffice: [] },
    announcements: [],
    createdAt: new Date().toISOString(),
  }
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────────────
function exportMeetingToCSV(meeting) {
  let csvRows = []
  csvRows.push(["Category", "Department / Region", "Hub / Detail", "Owner / Info", "Status / Total", "Extra Notes"].join(","))

  meeting.impactData.forEach(c => {
    c.hubs.forEach(h => {
      const s = sumHub(h)
      csvRows.push([
        "HUB Attendance",
        `"${c.name}"`,
        `"${h.name}"`,
        `"Junior: ${s.j} | Senior: ${s.s}"`,
        `"Total: ${s.total}"`,
        `"Signed: ${s.sc} | Missing: ${s.mc} | New: ${s.ns}"`
      ].join(","))
    })
  })

  meeting.departments.forEach(d => {
    csvRows.push([
      "Department Narrative",
      `"${d.name}"`,
      `"Status Sticker: ${d.sticker || 'pending'}"`,
      `"${(d.update || 'No update logged').replace(/"/g, '""')}"`,
      `"Locked: ${d.isLocked ? 'Yes' : 'No'}"`,
      ""
    ].join(","))

    d.actionItems?.forEach(a => {
      csvRows.push([
        "Action Item",
        `"${d.name}"`,
        `"${(a.text || '').replace(/"/g, '""')}"`,
        `"Owner: ${(a.owner || 'Unassigned').replace(/"/g, '""')}"`,
        `"Status: ${a.status}"`,
        `"Deadline: ${a.deadline || 'None'}"`
      ].join(","))
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

function Section({ title, icon, color, badge, expanded, onToggle, children }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border mb-5 bg-white" style={{ borderColor: "#e4e2f4", borderLeftWidth: 4, borderLeftColor: color }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-gray-50/80 transition-colors text-left">
        <span className="text-lg">{icon}</span>
        <span className="flex-1 font-bold text-sm uppercase tracking-wider" style={{ ...FH, color: B.indigo }}>{title}</span>
        {badge != null && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: color + "22", color, ...FB }}>{badge}</span>}
        }
        <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="bg-white border-t px-5 py-4 space-y-4" style={{ borderColor: "#f0eff9" }}>{children}</div>}
      }
    </div>
  )
}

function SuccessToast({ message, onClose }) {
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

function ImpactSection({ impactData, onChange, triggerToast }) {
  const [exp, setExp] = useState(true)

  let grandTotal = 0, grandJunior = 0, grandSenior = 0, grandSC = 0, grandMC = 0, grandNS = 0
  impactData.forEach(c => {
    c.hubs.forEach(h => {
      const s = sumHub(h)
      grandTotal += s.total; grandJunior += s.j; grandSenior += s.s
      grandSC += s.sc; grandMC += s.mc; grandNS += s.ns
    })
  })

  return (
    <Section
      title="Impact Numbers — HUB Attendance"
      icon="📊"
      color={B.magenta}
      badge={grandTotal > 0 ? `${grandTotal} Total Participants` : undefined}
      expanded={exp}
      onToggle={() => setExp(!exp)}
    >
      {/* Big counter — yellow-gold transparent background */}
      <div
        className="text-indigo-950 rounded-2xl p-5 border shadow-sm mb-5 space-y-4"
        style={{ background: "rgba(212, 175, 55, 0.16)", borderColor: "rgba(212, 175, 55, 0.55)" }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "rgba(212, 175, 55, 0.35)" }}>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ ...FB, color: "#92720f" }}>
              🌍 All Regions Combined Attendance Total
            </span>
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
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white border" style={{ color: community.color, borderColor: community.color + "33", ...FM }}>
                  Total: {communityTotal.t}
                </span>
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
                      return (
                        <tr key={hub.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafaf9" }}>
                          <td className="px-3 py-2 font-bold text-gray-800" style={{ ...FB }}>{hub.name}</td>
                          <td className="px-3 py-2"><input type="number" min="0" className="w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" style={{ ...FB }} value={hub.junior} onChange={e => { onChange(impactData.map(c => c.id !== community.id ? c : { ...c, hubs: c.hubs.map(h => h.id !== hub.id ? h : { ...h, junior: e.target.value }) })); triggerToast("Attendance figures recorded."); }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" className="w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" style={{ ...FB }} value={hub.senior} onChange={e => { onChange(impactData.map(c => c.id !== community.id ? c : { ...c, hubs: c.hubs.map(h => h.id !== hub.id ? h : { ...h, senior: e.target.value }) })); triggerToast("Attendance figures recorded."); }} /></td>
                          <td className="px-3 py-2 font-bold text-center text-gray-900">{s.total}</td>
                          <td className="px-3 py-2"><input type="number" min="0" className="w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" style={{ ...FB }} value={hub.signedConsent} onChange={e => { onChange(impactData.map(c => c.id !== community.id ? c : { ...c, hubs: c.hubs.map(h => h.id !== hub.id ? h : { ...h, signedConsent: e.target.value }) })); triggerToast("Consent log updated."); }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" className="w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" style={{ ...FB }} value={hub.missingConsent} onChange={e => { onChange(impactData.map(c => c.id !== community.id ? c : { ...c, hubs: c.hubs.map(h => h.id !== hub.id ? h : { ...h, missingConsent: e.target.value }) })); triggerToast("Consent log updated."); }} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" className="w-16 text-xs rounded px-2 py-1 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" style={{ ...FB }} value={hub.newStudents} onChange={e => { onChange(impactData.map(c => c.id !== community.id ? c : { ...c, hubs: c.hubs.map(h => h.id !== hub.id ? h : { ...h, newStudents: e.target.value }) })); triggerToast("New joiners count updated."); }} /></td>
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

function DepartmentSection({ departments, onChange, currentUser, triggerToast }) {
  const [exp, setExp] = useState(true)

  function updateDept(id, updates) {
    const updated = departments.map(d => d.id === id ? { ...d, ...updates, updatedBy: currentUser } : d)
    onChange(updated)
    triggerToast("Department report updated.")
  }

  function addActionItem(deptId) {
    const newItem = {
      id: uid(), text: "", owner: currentUser, deadline: "", status: "pending", department: deptId, weekId: ""
    }
    const updated = departments.map(d => d.id === deptId ? { ...d, actionItems: [...(d.actionItems || []), newItem] } : d)
    onChange(updated)
    triggerToast("Action item added.")
  }

  function updateActionItem(deptId, itemId, updates) {
    const updated = departments.map(d => {
      if (d.id !== deptId) return d
      return {
        ...d,
        actionItems: d.actionItems.map(a => a.id === itemId ? { ...a, ...updates } : a)
      }
    })
    onChange(updated)
    triggerToast("Action item updated.")
  }

  function deleteActionItem(deptId, itemId) {
    const updated = departments.map(d => d.id === deptId ? { ...d, actionItems: d.actionItems.filter(a => a.id !== itemId) } : d)
    onChange(updated)
    triggerToast("Action item removed.")
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
                  }
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1" style={{ background: currentSticker.bg, borderColor: currentSticker.border, color: currentSticker.text }}>
                    {currentSticker.icon} {currentSticker.label}
                  </span>
                  <button onClick={() => updateDept(dept.id, { isLocked: !dept.isLocked })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700">
                    {dept.isLocked ? <span className="text-amber-600">🔒</span> : <span>🔓</span>}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Weekly Operational Update / Narrative</label>
                <textarea
                  disabled={dept.isLocked}
                  rows={3}
                  className="w-full text-xs border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 disabled:text-gray-500 font-medium"
                  placeholder="Type department update here..."
                  value={dept.update}
                  onChange={e => updateDept(dept.id, { update: e.target.value })}
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
                        <input
                          disabled={dept.isLocked}
                          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 font-medium bg-white focus:outline-none"
                          placeholder="Action item task description..."
                          value={item.text}
                          onChange={e => updateActionItem(dept.id, item.id, { text: e.target.value })}
                        />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            disabled={dept.isLocked}
                            className="w-28 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none"
                            placeholder="Owner"
                            value={item.owner}
                            onChange={e => updateActionItem(dept.id, item.id, { owner: e.target.value })}
                          />
                          <input
                            disabled={dept.isLocked}
                            type="date"
                            className="w-32 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none"
                            value={item.deadline}
                            onChange={e => updateActionItem(dept.id, item.id, { deadline: e.target.value })}
                          />
                          <select
                            disabled={dept.isLocked}
                            className="text-xs border rounded px-2 py-1 font-bold bg-white"
                            style={{ color: st.text, borderColor: st.border }}
                            value={item.status}
                            onChange={e => updateActionItem(dept.id, item.id, { status: e.target.value })}
                          >
                            <option value="pending">🕒 Pending</option>
                            <option value="hazard">⚠️ At Risk</option>
                            <option value="accomplished">✅ Accomplished</option>
                            <option value="protected">🛡️ Protected</option>
                          </select>
                          {!dept.isLocked && (
                            <button onClick={() => deleteActionItem(dept.id, item.id)} className="text-gray-400 hover:text-red-600 p-1">
                              🗑️
                            </button>
                          )}
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
    </Section>
  )
}

function StaffingSection({ staffing, onChange, triggerToast }) {
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
          <h4 className="font-bold text-emerald-900 uppercase flex items-center gap-1.5" style={{ ...FB }}>
            <span>👤+</span> New Joining Entrants
          </h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={entrantInput} onChange={e => setEntrantInput(e.target.value)}/>
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
          <h4 className="font-bold text-rose-900 uppercase flex items-center gap-1.5" style={{ ...FB }}>
            <span>👤-</span> Staff Departures / Exits
          </h4>
          <div className="flex gap-1.5">
            <input className="flex-1 border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={exitInput} onChange={e => setExitInput(e.target.value)}/>
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
          <h4 className="font-bold text-indigo-900 uppercase flex items-center gap-1.5" style={{ ...FB }}>
            <span>📅</span> On Leave
          </h4>
          <div className="space-y-1">
            <input className="w-full border rounded p-1.5 bg-white text-xs" placeholder="Staff Name" value={leaveName} onChange={e => setLeaveName(e.target.value)}/>
            <div className="flex gap-1">
              <input type="date" className="w-1/2 border rounded p-1 bg-white text-[11px]" value={leaveStart} onChange={e => setLeaveStart(e.target.value)}/>
              <input type="date" className="w-1/2 border rounded p-1 bg-white text-[11px]" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)}/>
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

function AnnouncementsSection({ announcements, onChange, currentUser, triggerToast, onNotifyUrgent }) {
  const [exp, setExp] = useState(true)
  const [text, setText] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState(true)

  function post() {
    if (!text.trim()) return
    const newA = {
      id: uid(), text: text.trim(), postedBy: currentUser, date: new Date().toLocaleDateString(), isUrgent: urgent
    }
    onChange([newA, ...announcements])
    if (urgent && notifyEmail && onNotifyUrgent) {
      onNotifyUrgent(newA)
      triggerToast("Announcement published — email alert sent.")
    } else {
      triggerToast("Announcement published.")
    }
    setText(""); setUrgent(false)
  }

  return (
    <Section title="Key Reminders & Announcements" icon="📢" color={B.orange} expanded={exp} onToggle={() => setExp(!exp)}>
      <div className="space-y-3 text-xs">
        <div className="p-3 bg-orange-50/50 border border-orange-200 rounded-xl space-y-2">
          <textarea
            rows={2}
            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:outline-none"
            placeholder="Type general reminder or urgent announcement..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-orange-950">
                <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)}/> Mark as Urgent
              </label>
              {urgent && (
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-orange-800">
                  <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)}/> ✉️ Email admins
                </label>
              )}
            </div>
            <button onClick={post} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              Publish Announcement
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {announcements.map(a => (
            <div key={a.id} className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${a.isUrgent ? "bg-red-50 border-red-200 text-red-950" : "bg-white border-gray-200 text-gray-900"}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {a.isUrgent && <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">Urgent</span>}
                  }
                  <span className="font-bold text-xs">{a.postedBy}</span>
                  <span className="text-[10px] text-gray-400">{a.date}</span>
                </div>
                <p className="font-medium text-xs leading-relaxed">{a.text}</p>
              </div>
              <button onClick={() => onChange(announcements.filter(item => item.id !== a.id))} className="text-gray-400 hover:text-red-600 p-1">
                ❌
              </button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function EnhancedAdminPanel({ meeting, onUpdateMeeting, onSpawnWeek, triggerToast, currentUser, settings, onUpdateSettings }) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passError, setPassError] = useState(false)
  const [spawnWk, setSpawnWk] = useState(meeting.weekNumber + 1)

  function handleUnlock(e) {
    e.preventDefault()
    if (passwordInput === "cheza") {
      setIsAdminUnlocked(true)
      setPassError(false)
      triggerToast("Admin Access Granted!")
    } else {
      setPassError(true)
    }
  }

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-gray-200 rounded-3xl shadow-md text-center space-y-4">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl mx-auto flex items-center justify-center text-xl">
          🔑
        </div>
        <h3 className="text-2xl text-indigo-950" style={{ ...FH }}>Admin Panel Restricted</h3>
        <p className="text-xs text-gray-500 font-medium">Please enter the admin password to continue.</p>

        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            type="password"
            placeholder="Enter password..."
            className="w-full text-xs border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-center"
            value={passwordInput}
            onChange={e => setPasswordInput(e.target.value)}
          />
          {passError && <p className="text-xs text-red-600 font-bold">Incorrect password. Please try again.</p>}
          }
          <button type="submit" className="w-full bg-indigo-900 hover:bg-indigo-950 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
            Unlock Admin Panel
          </button>
        </form>
      </div>
    )
  }

  const allActionItems = []
  meeting.departments.forEach(d => {
    d.actionItems?.forEach(a => {
      allActionItems.push({ ...a, deptName: d.name, deptId: d.id })
    })
  })

  function toggleDeptSticker(deptId, sticker) {
    const updatedDepts = meeting.departments.map(d => d.id === deptId ? { ...d, sticker } : d)
    onUpdateMeeting({ departments: updatedDepts })
    triggerToast(`Department marked as ${SC[sticker].label}`)
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-indigo-700/60">
          <div>
            <h2 className="text-2xl tracking-wide flex items-center gap-2" style={{ ...FH }}>
              <span>🛡️</span> Executive Control Panel
            </h2>
            <p className="text-xs text-indigo-200 mt-1" style={{ ...FB }}>
              Week {meeting.weekNumber} Status Overview & Excel Sync Desk
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { exportMeetingToCSV(meeting); triggerToast("CSV Log Exported Successfully!"); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>📉</span> Export CSV Log
            </button>

            <div className="flex items-center gap-2 bg-indigo-950/60 p-1.5 rounded-xl border border-indigo-700/50">
              <span className="text-xs text-indigo-300 font-bold px-1">Spawn Week:</span>
              <input
                type="number"
                className="w-16 text-xs bg-white text-gray-900 font-bold px-2 py-1 rounded focus:outline-none"
                value={spawnWk}
                onChange={e => setSpawnWk(parseInt(e.target.value) || meeting.weekNumber + 1)}
              />
              <button
                onClick={() => { onSpawnWeek(spawnWk); triggerToast(`Created Week ${spawnWk} Log`); }}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
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
                <div className="font-semibold flex items-center gap-1 text-white">
                  {cfg.icon} {cfg.label}
                </div>
                <div className="text-2xl font-extrabold text-white mt-1" style={{ ...FH }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backend Sync — keeps data alive across refresh & powers email alerts */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-base text-gray-900 mb-1 flex items-center gap-2" style={{ ...FH }}>
          <span>🔗</span> Backend Sync (Google Apps Script)
        </h3>
        <p className="text-xs text-gray-500 mb-2">
          Paste your deployed Apps Script Web App URL here. Once set, every update saves to it automatically
          and reloads from it on refresh — so nothing is lost even inside an embedded page.
        </p>
        <input
          className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-mono"
          placeholder="https://script.google.com/macros/s/XXXXX/exec"
          value={settings.sheetsUrl}
          onChange={e => onUpdateSettings({ sheetsUrl: e.target.value })}
        />
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
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {dept.update ? dept.update : <span className="italic text-gray-400">No narrative report logged yet.</span>}
                      }
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap" style={{ background: currentSticker.bg, borderColor: currentSticker.border, color: currentSticker.text }}>
                    {currentSticker.label}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                  <span className="text-gray-500 font-semibold">{dept.actionItems?.length || 0} Actions</span>
                  <div className="flex items-center gap-1">
                    {["pending", "hazard", "accomplished", "protected"].map(st => (
                      <button
                        key={st}
                        onClick={() => toggleDeptSticker(dept.id, st)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${dept.sticker === st ? "bg-indigo-900 text-white border-indigo-900" : "bg-white text-gray-600 hover:bg-gray-100"}`}
                      >
                        {SC[st].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ChezaChezaApp() {
  const [root, setRoot] = useState(null)
  const [userEmail, setUserEmail] = useState("")
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [viewMode, setViewMode] = useState("team")
  const [toastMessage, setToastMessage] = useState(null)
  const [syncStatus, setSyncStatus] = useState("Connecting to shared workspace...")
  const saveTimer = useRef(null)
  const supabaseReady = useRef(false)

  const showSuccessToast = (msg) => setToastMessage(msg)

  // Initial load: show the local cache instantly, then reconcile with the
  // shared backend (if configured) so refresh never loses anything.
  useEffect(() => {
    const local = loadRoot()
    setRoot(local)

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("app_state")
          .select("state")
          .eq("id", 1)
          .maybeSingle()

        if (error) {
          setSyncStatus("Shared sync unavailable — local changes are still active")
        } else if (data?.state?.meetings) {
          setRoot(data.state)
          setSyncStatus("Connected to shared workspace")
        } else if (data?.state?.impactData) {
          setRoot({
            ...local,
            meetings: local.meetings.map(meeting =>
              meeting.id === local.activeMeetingId
                ? { ...meeting, impactData: data.state.impactData }
                : meeting
            ),
          })
          setSyncStatus("Connected — existing attendance restored")
        } else {
          setSyncStatus("Connected — ready to record updates")
        }
      } catch (error) {
        setSyncStatus("Shared sync unavailable — local changes are still active")
      } finally {
        supabaseReady.current = true
      }

      const remote = await fetchRemoteState(local?.settings?.sheetsUrl)
      if (remote) setRoot(remote)
    })()

    try {
      const savedUser = localStorage.getItem(AUTH_USER_KEY)
      if (savedUser && savedUser.toLowerCase().endsWith("@chezachezadance.org")) {
        setUserEmail(savedUser)
        setIsEmailVerified(true)
      }
    } catch (e) {
      console.warn("Local storage access restricted.")
    }
  }, [])

  // Save: instant local cache + debounced push to the shared backend.
  useEffect(() => {
    if (!root) return
    saveRoot(root)
    if (!supabaseReady.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("app_state")
        .upsert({ id: 1, state: root })

      if (error) {
        setSyncStatus("Save issue — your local copy is safe")
      } else {
        setSyncStatus("All changes saved to shared workspace")
      }
      pushRemoteState(root.settings?.sheetsUrl, root)
    }, AUTO_SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimer.current)
  }, [root])

  if (!root) return <div className="p-10 text-center font-bold" style={{ ...FB }}>Loading Workspace Logs...</div>

  let activeMeeting = root.meetings.find(m => m.id === root.activeMeetingId) || root.meetings[0]

  function handleEmailSubmit(e) {
    e.preventDefault()
    if (userEmail.trim().toLowerCase().endsWith("@chezachezadance.org")) {
      try { localStorage.setItem(AUTH_USER_KEY, userEmail.trim().toLowerCase()) } catch(e) {}
      setIsEmailVerified(true)
      setEmailError("")
      showSuccessToast("Workspace Access Authorized!")
    } else {
      setEmailError("Access Denied. Only valid @chezachezadance.org workspace addresses are authorized.")
    }
  }

  function updateActiveMeeting(updates) {
    if (!root || !activeMeeting) return
    const updatedMeetings = root.meetings.map(m => m.id === activeMeeting.id ? { ...m, ...updates } : m)
    setRoot({ ...root, meetings: updatedMeetings })
  }

  function updateSettings(updates) {
    setRoot({ ...root, settings: { ...root.settings, ...updates } })
  }

  function handleSpawnWeek(wkNum) {
    if (!root) return
    const newM = createMeeting(wkNum, root.settings.departments)
    setRoot({
      ...root,
      meetings: [newM, ...root.meetings],
      activeMeetingId: newM.id
    })
  }

  function notifyUrgentAnnouncement(announcement) {
    // Fires an immediate (non-debounced) push flagged for the Apps Script
    // backend to email admins right away — see the accompanying .gs file.
    pushRemoteState(root.settings?.sheetsUrl, root, {
      type: "urgent_announcement",
      text: announcement.text,
      postedBy: announcement.postedBy,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative" style={{ ...FB }}>
      <style>{FONT_IMPORT}</style>
      {toastMessage && <SuccessToast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {!isEmailVerified ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 px-4 py-12 relative overflow-hidden">
          <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl max-w-md w-full border border-white/20 text-center relative z-10 space-y-6">
            <div>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center border border-indigo-100 mb-3 text-indigo-700 shadow-sm text-2xl">
                🌐
              </div>
              <h1 className="text-3xl text-indigo-950 tracking-wide" style={{ ...FH }}>ChezaCheza Dance</h1>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-widest mt-1" style={{ ...FB }}>
                MMM Internal Workspace Portal
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Organization Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">✉️</span>
                  <input
                    type="email"
                    placeholder="name@chezachezadance.org"
                    className="w-full text-xs border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                  />
                </div>
              </div>

              {emailError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span> {emailError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white font-bold rounded-xl py-3 text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>🚪</span> Verify Workspace Access
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <header className="bg-white border-b sticky top-0 z-20 shadow-sm" style={{ borderColor: "#e4e2f4" }}>
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h1 className="text-2xl tracking-wide" style={{ ...FH, color: B.indigo }}>MMM Follow Up Template</h1>
                  <span className="text-xs text-gray-500 font-medium">Logged in as: <strong className="text-indigo-900">{userEmail}</strong></span>
                </div>

                {/* Top-right controls: admin access button + view select + logout */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode(viewMode === "admin" ? "team" : "admin")}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                    style={{
                      background: viewMode === "admin" ? B.indigo : "white",
                      color: viewMode === "admin" ? "white" : B.indigo,
                      borderColor: B.indigo,
                    }}
                    title="Admin Panel Access"
                  >
                    🔑 Admin
                  </button>

                  <select
                    className="text-xs border rounded-lg font-bold px-2.5 py-1.5 cursor-pointer bg-white text-indigo-950 border-gray-300"
                    value={viewMode}
                    onChange={e => setViewMode(e.target.value)}
                  >
                    <option value="team">👥 Team Editor View</option>
                    <option value="admin">🛡️ Executive Admin View</option>
                  </select>

                  <button
                    onClick={() => {
                      try { localStorage.removeItem(AUTH_USER_KEY); } catch(e) {}
                      setIsEmailVerified(false);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                    title="Log Out"
                  >
                    🚪
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Log:</span>
                  <select
                    className="text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg px-2.5 py-1"
                    value={activeMeeting.id}
                    onChange={e => setRoot({ ...root, activeMeetingId: e.target.value })}
                  >
                    {root.meetings.map(m => (
                      <option key={m.id} value={m.id}>Week {m.weekNumber} Log ({m.date})</option>
                    ))}
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
                triggerToast={showSuccessToast}
                currentUser={userEmail}
                settings={root.settings}
                onUpdateSettings={updateSettings}
              />
            ) : (
              <>
                <AnnouncementsSection
                  announcements={activeMeeting.announcements}
                  onChange={announcements => updateActiveMeeting({ announcements })}
                  currentUser={userEmail}
                  triggerToast={showSuccessToast}
                  onNotifyUrgent={notifyUrgentAnnouncement}
                />

                <StaffingSection
                  staffing={activeMeeting.staffing}
                  onChange={staffing => updateActiveMeeting({ staffing })}
                  triggerToast={showSuccessToast}
                />

                <ImpactSection
                  impactData={activeMeeting.impactData}
                  onChange={data => updateActiveMeeting({ impactData: data })}
                  triggerToast={showSuccessToast}
                />

                <DepartmentSection
                  departments={activeMeeting.departments}
                  onChange={depts => updateActiveMeeting({ departments: depts })}
                  currentUser={userEmail}
                  triggerToast={showSuccessToast}
                />
              </>
            )}
          </main>
        </>
      )}
    </div>
  )
}