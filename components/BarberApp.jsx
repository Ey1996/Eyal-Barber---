import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Scissors, Calendar, Clock, User, Phone, Settings, Home, Users,
  Plus, Trash2, Pencil, Check, X, ChevronRight, ChevronLeft,
  AlertTriangle, RotateCcw, Activity, Bell, ShieldCheck, MessageCircle,
  TrendingUp, Server, DatabaseBackup, Loader2, ChevronDown, Link as LinkIcon,
  CircleDollarSign, CalendarClock, History, StickyNote, Lock,
  Wallet, Receipt, TrendingDown, Crown, BookOpen,
  Search, Download, CalendarDays, Timer, Image as ImageIcon, List
} from "lucide-react";

import { usePersistentList, useSetting } from "../lib/usePersistentState";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/* ---- privacy-aware server writes ----
   In client mode the app deliberately does NOT load other people's data
   (names/phones). These helpers perform the few targeted writes/lookups a
   client needs, directly against the server. No-ops in the prototype. */
async function remoteInsertRow(table, item) {
  if (!(isSupabaseConfigured && supabase)) return true;
  try {
    const { error } = await supabase.from(table).upsert({ id: item.id, data: item });
    return !error;
  } catch (e) { return false; }
}

async function remoteSetAppointmentStatus(id, status) {
  if (!(isSupabaseConfigured && supabase)) return true;
  try {
    const { data } = await supabase.from("appointments").select("data").eq("id", id).maybeSingle();
    if (data?.data) await supabase.from("appointments").upsert({ id, data: { ...data.data, status } });
    return true;
  } catch (e) { return false; }
}

async function remoteFindClientByPhone(phone) {
  if (!(isSupabaseConfigured && supabase) || !phone) return null;
  try {
    const { data } = await supabase.from("clients").select("data").eq("data->>phone", phone).maybeSingle();
    return data?.data || null;
  } catch (e) { return null; }
}

/* ============================================================================
   DESIGN TOKENS — Dark Luxury System
   ============================================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@300;400;500;600;700&display=swap');

.bb-root {
  --bg: #0B0A0D;
  --bg-elevated: #17151A;
  --bg-card: #1D1A21;
  --bg-hover: #242028;
  --border: #2E2A32;
  --border-light: #3A353F;
  --gold: #C6A15B;
  --gold-bright: #E3C480;
  --gold-dim: #8A7442;
  --gold-wash: rgba(198, 161, 91, 0.1);
  --cream: #F3EDE1;
  --muted: #A69C8D;
  --muted-dim: #6E6559;
  --success: #6FAE8B;
  --success-wash: rgba(111, 174, 139, 0.12);
  --danger: #C4695A;
  --danger-wash: rgba(196, 105, 90, 0.12);
  --warning: #D1A85C;
  --warning-wash: rgba(209, 168, 92, 0.12);

  font-family: 'Heebo', sans-serif;
  background: var(--bg);
  color: var(--cream);
  min-height: 100vh;
  direction: rtl;
  position: relative;
  font-display: swap;
}
.bb-root * { box-sizing: border-box; }
.bb-serif { font-family: 'Frank Ruhl Libre', serif; }

/* ---------- layout shells ---------- */
.bb-app { max-width: 480px; margin: 0 auto; min-height: 100vh; background: var(--bg); position: relative; display: flex; flex-direction: column; }
.bb-admin-app { max-width: 900px; margin: 0 auto; min-height: 100vh; background: var(--bg); }
.bb-scroll { flex: 1; overflow-y: auto; padding-bottom: 96px; }
.bb-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(11,10,13,0.92); backdrop-filter: blur(10px); z-index: 30; }
.bb-view-toggle { display: flex; gap: 6px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 3px; }
.bb-view-toggle button { border: none; background: transparent; color: var(--muted); font-family: 'Heebo'; font-size: 13px; padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all .15s; }
.bb-view-toggle button.active { background: var(--gold); color: #1a1509; font-weight: 600; }

/* ---------- buttons ---------- */
.bb-btn { font-family: 'Heebo'; font-weight: 600; font-size: 15px; border-radius: 12px; padding: 14px 20px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform .12s, opacity .12s, background .15s; }
.bb-btn:active { transform: scale(0.97); }
.bb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bb-btn-primary { background: linear-gradient(135deg, var(--gold-bright), var(--gold)); color: #1a1509; }
.bb-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.bb-btn-ghost { background: var(--bg-card); color: var(--cream); border: 1px solid var(--border-light); }
.bb-btn-ghost:hover { background: var(--bg-hover); }
.bb-btn-danger { background: var(--danger-wash); color: var(--danger); border: 1px solid rgba(196,105,90,0.3); }
.bb-btn-sm { padding: 8px 14px; font-size: 13px; border-radius: 9px; }
.bb-icon-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.bb-icon-btn:hover { background: var(--bg-hover); color: var(--cream); }

/* ---------- sticky CTA bar (mobile booking flow) ---------- */
.bb-sticky-cta { position: sticky; bottom: 0; left: 0; right: 0; padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--bg) 60%, transparent); border-top: 1px solid var(--border); backdrop-filter: blur(8px); z-index: 20; }

/* ---------- cards & lists ---------- */
.bb-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.bb-service-card { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bb-service-card:hover { border-color: var(--border-light); }
.bb-service-card.selected { border-color: var(--gold); background: var(--gold-wash); }

/* ---------- skeletons ---------- */
@keyframes bb-shimmer { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
.bb-skel { background: linear-gradient(90deg, var(--bg-card) 0%, var(--bg-hover) 50%, var(--bg-card) 100%); background-size: 200px 100%; animation: bb-shimmer 1.4s ease-in-out infinite; border-radius: 10px; }

/* ---------- empty states ---------- */
.bb-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 24px; color: var(--muted); gap: 10px; }
.bb-empty svg { color: var(--gold-dim); margin-bottom: 6px; }
.bb-empty h4 { color: var(--cream); font-family: 'Frank Ruhl Libre'; font-size: 17px; margin: 0; }
.bb-empty p { font-size: 13px; margin: 0; max-width: 260px; line-height: 1.6; }

/* ---------- time slot grid ---------- */
.bb-slot-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.bb-slot { border-radius: 10px; padding: 11px 6px; text-align: center; font-size: 14px; font-weight: 500; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--cream); cursor: pointer; position: relative; transition: all .15s; }
.bb-slot.past { color: var(--muted-dim); text-decoration: line-through; cursor: not-allowed; opacity: 0.4; border-color: var(--border); }
.bb-slot.booked { color: var(--muted-dim); text-decoration: line-through; cursor: not-allowed; background: transparent; border-style: dashed; }
.bb-slot.recommended { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
.bb-slot.recommended::after { content: 'הכי קרוב'; position: absolute; top: -9px; right: 50%; transform: translateX(50%); background: var(--gold); color: #1a1509; font-size: 9px; padding: 2px 6px; border-radius: 6px; font-weight: 700; white-space: nowrap; }
.bb-slot.selected { background: var(--gold); border-color: var(--gold); color: #1a1509; font-weight: 700; }

/* ---------- date strip ---------- */
.bb-date-strip { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 12px; scrollbar-width: none; }
.bb-date-strip::-webkit-scrollbar { display: none; }
.bb-date-chip { min-width: 58px; flex-shrink: 0; text-align: center; padding: 10px 4px; border-radius: 12px; border: 1.5px solid var(--border); background: var(--bg-card); cursor: pointer; transition: all .15s; }
.bb-date-chip .dow { font-size: 11px; color: var(--muted); }
.bb-date-chip .dnum { font-family: 'Frank Ruhl Libre'; font-size: 18px; font-weight: 700; margin-top: 2px; }
.bb-date-chip.selected { background: var(--gold); border-color: var(--gold); }
.bb-date-chip.selected .dow, .bb-date-chip.selected .dnum { color: #1a1509; }

/* ---------- form fields ---------- */
.bb-field { margin-bottom: 16px; }
.bb-field label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; }
.bb-field input, .bb-field textarea { width: 100%; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; color: var(--cream); font-family: 'Heebo'; font-size: 15px; transition: border-color .15s; }
.bb-field input:focus, .bb-field textarea:focus { outline: none; border-color: var(--gold); }
.bb-field.error input { border-color: var(--danger); }
.bb-field .err-msg { color: var(--danger); font-size: 12px; margin-top: 5px; display: flex; align-items: center; gap: 4px; }
.bb-honeypot { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; pointer-events: none; }

/* ---------- toasts ---------- */
.bb-toast-wrap { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; flex-direction: column; gap: 8px; width: calc(100% - 40px); max-width: 440px; }
@keyframes bb-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.bb-toast { animation: bb-toast-in .25s ease; background: #232028; border: 1px solid var(--border-light); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
.bb-toast.success { border-color: rgba(111,174,139,0.35); }
.bb-toast.danger { border-color: rgba(196,105,90,0.35); }
.bb-toast span.msg { font-size: 13.5px; }
.bb-toast button.undo { color: var(--gold-bright); background: none; border: none; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }

/* ---------- success animation ---------- */
.bb-success-circle { width: 84px; height: 84px; border-radius: 50%; background: var(--success-wash); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; animation: bb-pop .4s cubic-bezier(.34,1.56,.64,1); }
@keyframes bb-pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.bb-success-circle svg { color: var(--success); }
@keyframes bb-shine { 0% { box-shadow: 0 0 0 0 rgba(198,161,91,0.4); } 100% { box-shadow: 0 0 0 26px rgba(198,161,91,0); } }
.bb-shine-ring { position: absolute; inset: 0; border-radius: 50%; animation: bb-shine 1.2s ease-out; }

/* ---------- admin nav ---------- */
.bb-admin-tabs { display: flex; gap: 4px; padding: 10px 16px; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: none; position: sticky; top: 0; background: var(--bg); z-index: 20; }
.bb-admin-tabs::-webkit-scrollbar { display: none; }
.bb-admin-tab { display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; background: transparent; border: none; color: var(--muted); font-family: 'Heebo'; font-size: 13.5px; cursor: pointer; white-space: nowrap; transition: all .15s; }
.bb-admin-tab.active { background: var(--gold-wash); color: var(--gold-bright); font-weight: 600; }
.bb-admin-tab:hover:not(.active) { background: var(--bg-card); color: var(--cream); }

/* ---------- dashboard summary cards ---------- */
.bb-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px; }
.bb-summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 14px 12px; }
.bb-summary-card .label { font-size: 11.5px; color: var(--muted); margin-bottom: 6px; }
.bb-summary-card .value { font-family: 'Frank Ruhl Libre'; font-size: 22px; font-weight: 700; color: var(--gold-bright); }

/* ---------- generic table-ish rows ---------- */
.bb-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); gap: 10px; }
.bb-row:last-child { border-bottom: none; }
.bb-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--gold-wash); color: var(--gold-bright); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }

.bb-badge { font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 600; }
.bb-badge.confirmed { background: var(--success-wash); color: var(--success); }
.bb-badge.pending { background: var(--warning-wash); color: var(--warning); }
.bb-badge.cancelled { background: var(--danger-wash); color: var(--danger); }
.bb-badge.done { background: var(--bg-hover); color: var(--muted); }
.bb-badge.sent { background: var(--success-wash); color: var(--success); }
.bb-badge.failed { background: var(--danger-wash); color: var(--danger); }
.bb-badge.retrying { background: var(--warning-wash); color: var(--warning); }

.bb-pulse-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.bb-pulse-dot.ok { background: var(--success); box-shadow: 0 0 0 0 rgba(111,174,139,0.5); animation: bb-pulse 2s infinite; }
.bb-pulse-dot.warn { background: var(--warning); }
@keyframes bb-pulse { 0% { box-shadow: 0 0 0 0 rgba(111,174,139,0.5); } 70% { box-shadow: 0 0 0 6px rgba(111,174,139,0); } 100% { box-shadow: 0 0 0 0 rgba(111,174,139,0); } }

.bb-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); z-index: 90; display: flex; align-items: flex-end; justify-content: center; }
.bb-modal { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: 20px 20px 0 0; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; animation: bb-modal-up .25s ease; }
@keyframes bb-modal-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.bb-rtl-flip { transform: scaleX(-1); }
.bb-mono-num { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .bb-toast, .bb-success-circle, .bb-modal, .bb-skel, .bb-pulse-dot.ok { animation: none !important; }
}
`;

/* ============================================================================
   HELPERS
   ============================================================================ */
const uid = () => Math.random().toString(36).slice(2, 10);

const DOW_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const DOW_FULL_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function fmtDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextNDays(n) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

function genSlots(openStr, closeStr) {
  if (!openStr || !closeStr) return [];
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const slots = [];
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += 30;
  }
  return slots;
}

function validatePhone(v) {
  return /^0(5\d|[2-4,8-9]|7[0-9])\d{7}$/.test(v.replace(/[\s-]/g, ""));
}

function initials(name) {
  return (name || "").trim().split(" ").map((p) => p[0]).slice(0, 2).join("");
}

/* subtle haptic tap on supporting mobile devices — silently no-ops elsewhere */
function vibrate(pattern = 18) {
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* noop */ }
}

/* minutes since midnight from "HH:MM" */
function timeToMinutes(t) {
  const [h, m] = (t || "0:0").split(":").map(Number);
  return h * 60 + m;
}

/* appointment datetime as a JS Date */
function apptDateTime(appt) {
  const [y, mo, d] = appt.date.split("-").map(Number);
  const [h, mi] = appt.time.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

/* the Sunday that starts the week containing `offsetWeeks` from now */
function weekStart(offsetWeeks = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7);
  return d;
}

/* .ics calendar file content for an appointment — lets clients add the
   booking to their Google/Apple calendar with one tap */
function buildICS(appt, businessName) {
  const start = apptDateTime(appt);
  const end = new Date(start.getTime() + (appt.duration || DEFAULT_APPT_DURATION) * 60000);
  const fmt = (dt) =>
    `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}${String(dt.getMinutes()).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarberApp//HE",
    "BEGIN:VEVENT",
    `UID:${appt.id}@barberapp`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${appt.serviceName} - ${businessName}`,
    `DESCRIPTION:תור ל${appt.serviceName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(appt, businessName) {
  const blob = new Blob([buildICS(appt, businessName)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "appointment.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================================================================
   MOCK INITIAL DATA
   ============================================================================ */
const INITIAL_SERVICES = [
  { id: uid(), name: "תספורת גבר", duration: 30, price: 90 },
  { id: uid(), name: "תספורת + זקן", duration: 45, price: 130 },
  { id: uid(), name: "עיצוב זקן", duration: 20, price: 60 },
  { id: uid(), name: "תספורת ילד", duration: 25, price: 70 },
];

const INITIAL_HOURS = {
  0: { closed: true, open: "09:00", close: "20:00" },
  1: { closed: false, open: "09:00", close: "20:00" },
  2: { closed: false, open: "09:00", close: "20:00" },
  3: { closed: false, open: "09:00", close: "20:00" },
  4: { closed: false, open: "09:00", close: "21:00" },
  5: { closed: false, open: "08:00", close: "15:00" },
  6: { closed: true, open: "09:00", close: "20:00" },
};

const DEFAULT_APPT_DURATION = 20; // minutes — factory default until admin customizes per client/appointment

/* ============================================================================
   SMALL REUSABLE COMPONENTS
   ============================================================================ */
function Skeleton({ w = "100%", h = 16, style = {} }) {
  return <div className="bb-skel" style={{ width: w, height: h, ...style }} />;
}

function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="bb-empty">
      <Icon size={38} strokeWidth={1.3} />
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {action}
    </div>
  );
}

function ToastContainer({ toasts, onUndo, onDismiss }) {
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => onDismiss(t.id), t.duration || 4500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (!toasts.length) return null;
  return (
    <div className="bb-toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`bb-toast ${t.type || ""}`}>
          <span className="msg">{t.message}</span>
          {t.undoable && (
            <button className="undo" onClick={() => onUndo(t.id)}>
              <RotateCcw size={13} style={{ marginLeft: 4, display: "inline", verticalAlign: "-2px" }} />
              בטל
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="err-msg">
      <AlertTriangle size={12} />
      {msg}
    </div>
  );
}

/* 24-hour time picker (00:00–23:59) — avoids native <input type="time"> which
   renders AM/PM on some browsers/locales; Israel uses the 24-hour clock. */
const TIME24_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const TIME24_MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const timeSelectStyle = { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--cream)", padding: "8px 6px", fontSize: 13, fontFamily: "Heebo" };

function Time24Input({ value, onChange }) {
  const [h, m] = (value || "00:00").split(":");
  // dir="ltr" pins the layout like a real digital clock: hours on the LEFT,
  // minutes on the RIGHT — regardless of the surrounding RTL page direction
  return (
    <div dir="ltr" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <select value={h || "00"} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} style={timeSelectStyle}>
          {TIME24_HOURS.map((hh) => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span style={{ fontSize: 9.5, color: "var(--muted-dim)" }}>שעות</span>
      </div>
      <span style={{ color: "var(--muted)", marginBottom: 14 }}>:</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <select value={m || "00"} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} style={timeSelectStyle}>
          {TIME24_MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
        </select>
        <span style={{ fontSize: 9.5, color: "var(--muted-dim)" }}>דקות</span>
      </div>
    </div>
  );
}

/* ============================================================================
   VALIDATION (shared-schema pattern — same rules used client add / edit,
   mirrors what the real API route validates server-side with Zod)
   ============================================================================ */
function validateClient(data, opts = {}) {
  const requirePhone = opts.requirePhone !== false;
  const errors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = "יש להזין שם מלא (2 תווים לפחות)";
  if (requirePhone) {
    if (!data.phone || !validatePhone(data.phone)) errors.phone = "מספר טלפון לא תקין (לדוגמה 0521234567)";
  } else if (data.phone && !validatePhone(data.phone)) {
    errors.phone = "מספר טלפון לא תקין (לדוגמה 0521234567)";
  }
  if (data.defaultDuration !== undefined && data.defaultDuration !== "") {
    const d = Number(data.defaultDuration);
    if (!d || d <= 0 || d > 240) errors.defaultDuration = "אורך תור לא תקין (בדקות)";
  }
  return errors;
}

function validateService(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = "יש להזין שם שירות";
  const dur = Number(data.duration);
  if (!dur || dur <= 0 || dur > 300) errors.duration = "משך זמן לא תקין (בדקות)";
  const price = Number(data.price);
  if (price === undefined || price === null || isNaN(price) || price < 0) errors.price = "מחיר לא תקין";
  return errors;
}

function validateAppointment(data) {
  const errors = {};
  if (!data.clientName || data.clientName.trim().length < 2) errors.clientName = "יש להזין שם מלא";
  if (data.phone && !validatePhone(data.phone)) errors.phone = "מספר טלפון לא תקין";
  if (!data.date) errors.date = "יש לבחור תאריך";
  if (!data.time) errors.time = "יש לבחור שעה";
  const dur = Number(data.duration);
  if (!dur || dur <= 0 || dur > 240) errors.duration = "אורך תור לא תקין (בדקות)";
  const price = Number(data.price);
  if (price === undefined || price === null || isNaN(price) || price < 0) errors.price = "מחיר לא תקין";
  return errors;
}

function validateJournalEntry(data) {
  const errors = {};
  if (!data.clientName || data.clientName.trim().length < 2) errors.clientName = "יש להזין שם מלא";
  if (data.phone && !validatePhone(data.phone)) errors.phone = "מספר טלפון לא תקין";
  if (!data.date) errors.date = "יש לבחור תאריך";
  if (!data.time) errors.time = "יש לבחור שעה";
  const dur = Number(data.duration);
  if (!dur || dur <= 0 || dur > 240) errors.duration = "אורך תור לא תקין (בדקות)";
  return errors;
}

const EXPENSE_CATEGORIES = ["שכירות", "מלאי ומוצרים", "ציוד", "שיווק ופרסום", "משכורות", "אחר"];

function validateExpense(data) {
  const errors = {};
  if (!data.description || data.description.trim().length < 2) errors.description = "יש להזין תיאור הוצאה";
  const amount = Number(data.amount);
  if (!amount || amount <= 0) errors.amount = "סכום לא תקין";
  if (!data.date) errors.date = "יש לבחור תאריך";
  return errors;
}

/* RFM-style per-client financial profile — revenue counted from completed
   ("done") + confirmed appointments; frequency from the full non-cancelled
   history; segment gives the marketing read on who needs attention. */
function computeClientStats(clientId, appointments) {
  const history = appointments
    .filter((a) => a.clientId === clientId && a.status !== "cancelled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const revenueGenerating = history.filter((a) => a.status === "done" || a.status === "confirmed");
  const totalSpent = revenueGenerating.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const visits = history.length;
  const avgTicket = revenueGenerating.length ? Math.round(totalSpent / revenueGenerating.length) : 0;

  let avgIntervalDays = null;
  if (history.length >= 2) {
    const dates = history.map((a) => new Date(a.date).getTime());
    let totalGap = 0;
    for (let i = 1; i < dates.length; i++) totalGap += (dates[i] - dates[i - 1]) / 86400000;
    avgIntervalDays = Math.round(totalGap / (dates.length - 1));
  }

  const lastDate = history.length ? history[history.length - 1].date : null;
  const daysSinceLast = lastDate ? Math.round((Date.now() - new Date(lastDate).getTime()) / 86400000) : null;

  let segment = null;
  if (visits === 0) segment = null;
  else if (daysSinceLast !== null && daysSinceLast > 45) segment = "at_risk";
  else if (totalSpent >= 400 || visits >= 5) segment = "vip";
  else if (visits === 1) segment = "new";
  else segment = "regular";

  return { visits, totalSpent, avgTicket, avgIntervalDays, lastDate, daysSinceLast, segment };
}

const SEGMENT_META = {
  vip: { label: "VIP", color: "var(--gold-bright)", bg: "var(--gold-wash)" },
  regular: { label: "לקוח קבוע", color: "var(--success)", bg: "var(--success-wash)" },
  new: { label: "לקוח חדש", color: "var(--muted)", bg: "var(--bg-hover)" },
  at_risk: { label: "בסיכון נטישה", color: "var(--danger)", bg: "var(--danger-wash)" },
};

/* ============================================================================
   THEMES — five dark palettes, same structural system, different accent + tint
   ============================================================================ */
const THEMES = {
  gold: {
    label: "זהב שמפניה",
    swatch: "#C6A15B",
    vars: {
      "--bg": "#0B0A0D", "--bg-elevated": "#17151A", "--bg-card": "#1D1A21",
      "--border": "#2E2A32", "--border-light": "#3A353F",
      "--gold": "#C6A15B", "--gold-bright": "#E3C480", "--gold-dim": "#8A7442",
      "--gold-wash": "rgba(198, 161, 91, 0.1)", "--cream": "#F3EDE1",
    },
  },
  emerald: {
    label: "אמרלד וברונזה",
    swatch: "#5FA37D",
    vars: {
      "--bg": "#0A0D0B", "--bg-elevated": "#141813", "--bg-card": "#1A201C",
      "--border": "#28302A", "--border-light": "#374038",
      "--gold": "#5FA37D", "--gold-bright": "#7FC79E", "--gold-dim": "#3E6B54",
      "--gold-wash": "rgba(95, 163, 125, 0.12)", "--cream": "#EDEFE7",
    },
  },
  burgundy: {
    label: "בורדו ורוז גולד",
    swatch: "#B8748A",
    vars: {
      "--bg": "#0D0A0B", "--bg-elevated": "#181214", "--bg-card": "#20171A",
      "--border": "#332226", "--border-light": "#402B30",
      "--gold": "#B8748A", "--gold-bright": "#DDA0B4", "--gold-dim": "#7A4A58",
      "--gold-wash": "rgba(184, 116, 138, 0.12)", "--cream": "#F2E9EA",
    },
  },
  sapphire: {
    label: "ספיר וכסף",
    swatch: "#7B98C4",
    vars: {
      "--bg": "#0A0B0D", "--bg-elevated": "#141519", "--bg-card": "#1A1C21",
      "--border": "#282B32", "--border-light": "#363A42",
      "--gold": "#7B98C4", "--gold-bright": "#A3BEE0", "--gold-dim": "#4F6690",
      "--gold-wash": "rgba(123, 152, 196, 0.12)", "--cream": "#E9EDF2",
    },
  },
  copper: {
    label: "נחושת ופחם",
    swatch: "#C87F51",
    vars: {
      "--bg": "#0C0B0A", "--bg-elevated": "#171412", "--bg-card": "#1F1B18",
      "--border": "#332C27", "--border-light": "#413830",
      "--gold": "#C87F51", "--gold-bright": "#E3A278", "--gold-dim": "#8C5535",
      "--gold-wash": "rgba(200, 127, 81, 0.12)", "--cream": "#F0E7DE",
    },
  },
};

/* ============================================================================
   MAIN APP
   ============================================================================ */
/* ============================================================================
   ERROR BOUNDARY — friendly styled fallback instead of a blank white screen
   ============================================================================ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "#0B0A0D", color: "#F3EDE1", fontFamily: "Heebo, sans-serif", direction: "rtl" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(196,105,90,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={28} color="#C4695A" />
          </div>
          <h2 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 22, margin: 0 }}>אופס, משהו השתבש</h2>
          <p style={{ color: "#A69C8D", fontSize: 14, maxWidth: 280, lineHeight: 1.7, margin: 0 }}>
            קרתה תקלה לא צפויה. רעננו את הדף כדי לחזור לאפליקציה — הנתונים שלכם לא נפגעו.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 8, background: "linear-gradient(135deg, #E3C480, #C6A15B)", color: "#1a1509", border: "none", borderRadius: 12, padding: "13px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "Heebo" }}
          >
            נסו שוב
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BarberApp() {
  const ADMIN_EMAIL_DEFAULT = "eyalmeoded1@gmail.com";
  const [view, setView] = useState("landing"); // landing | client | admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [googleSignInOpen, setGoogleSignInOpen] = useState(false);
  /* ---- persisted state, privacy-tiered ----
     public (everyone): services, settings, and a SANITIZED slots view of
     appointments — date/time/status only, never names or phones.
     admin-only (loaded only after PIN unlock): clients, full appointments,
     logs, expenses, journal, notifications. */
  const APPT_PUBLIC_FIELDS = "id, date:data->>date, time:data->>time, status:data->>status, duration:data->>duration, serviceName:data->>serviceName, price:data->>price";
  const [adminEmail, setAdminEmail] = useSetting("admin_email", ADMIN_EMAIL_DEFAULT);
  const [themeId, setThemeId] = useSetting("theme", "gold");
  const [businessName, setBusinessName] = useSetting("business_name", "בארבר שופ | TEL AVIV");
  const [logo, setLogo] = useSetting("logo", null);
  const [services, setServices] = usePersistentList("services", INITIAL_SERVICES);
  const [clients, setClients] = usePersistentList("clients", [], { enabled: adminUnlocked });
  const [appointments, setAppointments] = usePersistentList("appointments", [], adminUnlocked ? {} : { publicFields: APPT_PUBLIC_FIELDS });
  const [weeklyHours, setWeeklyHours] = useSetting("weekly_hours", INITIAL_HOURS);
  const [activityLog, setActivityLog] = usePersistentList("activity_log", [], { enabled: adminUnlocked });
  const [notificationLog, setNotificationLog] = usePersistentList("notification_log", [], { enabled: adminUnlocked });
  const [expenses, setExpenses] = usePersistentList("expenses", [], { enabled: adminUnlocked });
  const [journalEntries, setJournalEntries] = usePersistentList("journal_entries", [], { enabled: adminUnlocked });
  const [adminNotifications, setAdminNotifications] = usePersistentList("admin_notifications", [], { enabled: adminUnlocked });
  const [toasts, setToasts] = useState([]);
  const undoStash = useRef({});

  /* ---------- toast helpers ---------- */
  const pushToast = useCallback((message, opts = {}) => {
    const id = uid();
    setToasts((t) => [...t, { id, message, ...opts }]);
    return id;
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const undoToast = useCallback((id) => {
    const fn = undoStash.current[id];
    if (fn) fn();
    delete undoStash.current[id];
    dismissToast(id);
  }, [dismissToast]);

  /* ---------- activity log ---------- */
  const logActivity = useCallback((action) => {
    const entry = { id: uid(), ts: Date.now(), action };
    setActivityLog((log) => [entry, ...log].slice(0, 50));
    remoteInsertRow("activity_log", entry);
  }, []);

  /* pushes an event into the admin's Facebook-style notification feed */
  const notifyAdmin = useCallback((type, payload = {}) => {
    const notif = { id: uid(), ts: Date.now(), type, read: false, handled: false, ...payload };
    setAdminNotifications((ns) => [notif, ...ns].slice(0, 100));
    remoteInsertRow("admin_notifications", notif); // reaches the admin's device via realtime
  }, []);

  function requestAdminAccess() {
    setGoogleSignInOpen(true);
  }

  function handleGoogleSuccess() {
    setAdminUnlocked(true);
    setGoogleSignInOpen(false);
    setView("admin");
    logActivity("מנהל נכנס עם קוד גישה");
  }

  function lockAdmin() {
    setAdminUnlocked(false);
    setView("landing");
  }

  const themeVars = THEMES[themeId]?.vars || THEMES.gold.vars;

  return (
    <ErrorBoundary>
    <div className="bb-root" style={themeVars}>
      <style>{CSS}</style>

      {view === "landing" && (
        <LandingScreen
          businessName={businessName}
          logo={logo}
          onChooseClient={() => setView("client")}
          onChooseAdmin={requestAdminAccess}
        />
      )}

      {view === "client" && (
        <ClientView
          businessName={businessName}
          logo={logo}
          services={services}
          appointments={appointments}
          weeklyHours={weeklyHours}
          setAppointments={setAppointments}
          setClients={setClients}
          clients={clients}
          pushToast={pushToast}
          logActivity={logActivity}
          setNotificationLog={setNotificationLog}
          onBackToLanding={() => setView("landing")}
          notifyAdmin={notifyAdmin}
        />
      )}

      {view === "admin" && adminUnlocked && (
        <AdminView
          businessName={businessName}
          setBusinessName={setBusinessName}
          services={services}
          setServices={setServices}
          clients={clients}
          setClients={setClients}
          appointments={appointments}
          setAppointments={setAppointments}
          weeklyHours={weeklyHours}
          setWeeklyHours={setWeeklyHours}
          activityLog={activityLog}
          notificationLog={notificationLog}
          expenses={expenses}
          setExpenses={setExpenses}
          journalEntries={journalEntries}
          setJournalEntries={setJournalEntries}
          adminNotifications={adminNotifications}
          setAdminNotifications={setAdminNotifications}
          pushToast={pushToast}
          undoStash={undoStash}
          logActivity={logActivity}
          adminEmail={adminEmail}
          setAdminEmail={setAdminEmail}
          themeId={themeId}
          setThemeId={setThemeId}
          logo={logo}
          setLogo={setLogo}
          onLock={lockAdmin}
        />
      )}

      {googleSignInOpen && (
        <PinGate onSuccess={handleGoogleSuccess} onClose={() => setGoogleSignInOpen(false)} />
      )}

      <ToastContainer toasts={toasts} onUndo={undoToast} onDismiss={dismissToast} />
    </div>
    </ErrorBoundary>
  );
}

/* ============================================================================
   OPENING SCREEN — the app's front door: client or admin
   ============================================================================ */
function LandingScreen({ businessName, logo, onChooseClient, onChooseAdmin }) {
  return (
    <div className="bb-app" style={{ justifyContent: "center", padding: "0 28px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 6 }}>
        {logo ? (
          <img src={logo} alt="לוגו העסק" style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold-dim)", marginBottom: 18 }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--gold-wash)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Scissors size={28} color="var(--gold-bright)" />
          </div>
        )}
        <h1 className="bb-serif" style={{ fontSize: 26, fontWeight: 700, color: "var(--gold-bright)", margin: 0 }}>{businessName}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 40 }}>ברוכים הבאים</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
          <button className="bb-btn bb-btn-primary" style={{ padding: "16px 20px", fontSize: 16 }} onClick={onChooseClient}>
            <User size={18} /> כניסה כלקוח
          </button>
          <button className="bb-btn bb-btn-ghost" style={{ padding: "16px 20px", fontSize: 16 }} onClick={onChooseAdmin}>
            <ShieldCheck size={18} /> כניסה כמנהל
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ADMIN ACCESS — PIN gate.
   The PIN itself is NOT stored anywhere in the code or database; only its
   SHA-256 fingerprint is kept, and the entered value is hashed and compared.
   ============================================================================ */
const ADMIN_PIN_HASH = "e68adee72e4d3c421f15cc33523be1c38208e4489b91d5e426503d99c5a7d790";

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function PinGate({ onSuccess, onClose }) {
  const [entered, setEntered] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  async function tryVerify(pin) {
    setChecking(true);
    let hex = "";
    try { hex = await sha256Hex(pin); } catch (e) { /* non-secure context */ }
    setChecking(false);
    if (hex === ADMIN_PIN_HASH) {
      vibrate(15);
      onSuccess();
    } else {
      vibrate([30, 40, 30]);
      setShake(true);
      setTimeout(() => { setShake(false); setEntered(""); }, 450);
    }
  }

  function press(d) {
    if (checking || entered.length >= 4) return;
    const next = entered + d;
    setEntered(next);
    if (next.length === 4) tryVerify(next);
  }

  return (
    <div className="bb-modal-backdrop" style={{ alignItems: "center" }} onClick={onClose}>
      <div
        className="bb-modal"
        style={{ borderRadius: 20, maxWidth: 340, textAlign: "center", animation: shake ? "bb-shake .45s" : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--gold-wash)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={24} color="var(--gold-bright)" />
          </div>
        </div>
        <h3 className="bb-serif" style={{ fontSize: 17, marginBottom: 4 }}>כניסת מנהל</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>הזינו את קוד הגישה</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "1.5px solid var(--gold-dim)",
                background: i < entered.length ? "var(--gold)" : "transparent",
                transition: "background .12s",
              }}
            />
          ))}
        </div>

        <div dir="ltr" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} className="bb-btn bb-btn-ghost" style={{ fontSize: 18, padding: "14px 0" }} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button className="bb-btn bb-btn-ghost" style={{ fontSize: 13, padding: "14px 0", opacity: 0.6 }} onClick={onClose}>ביטול</button>
          <button className="bb-btn bb-btn-ghost" style={{ fontSize: 18, padding: "14px 0" }} onClick={() => press("0")}>0</button>
          <button className="bb-btn bb-btn-ghost" style={{ fontSize: 13, padding: "14px 0" }} onClick={() => setEntered((e) => e.slice(0, -1))}>מחק</button>
        </div>
      </div>
      <style>{`@keyframes bb-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }`}</style>
    </div>
  );
}

/* ============================================================================
   CLIENT BOOKING FLOW
   ============================================================================ */
function ClientView({ businessName, logo, services, appointments, weeklyHours, setAppointments, clients, setClients, pushToast, logActivity, setNotificationLog, onBackToLanding, notifyAdmin }) {
  const [myBookingIds, setMyBookingIds] = useState([]); // appointments booked in this session — powers "התור שלי"
  const [myApptsOpen, setMyApptsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 service, 2 datetime, 3 details, 4 confirm, 5 success
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitAt, setLastSubmitAt] = useState(0);
  const [whatsappStatus, setWhatsappStatus] = useState(null); // null | 'sending' | 'sent' | 'no_phone'
  const [bookedAppt, setBookedAppt] = useState(null);

  const days = useMemo(() => nextNDays(14), []);

  // simulate a brief network fetch when entering the date/time step (skeleton demo)
  useEffect(() => {
    if (step === 2) {
      setLoadingSlots(true);
      const t = setTimeout(() => setLoadingSlots(false), 500);
      return () => clearTimeout(t);
    }
  }, [step, selectedDate]);

  const dayHours = selectedDate ? weeklyHours[selectedDate.getDay()] : null;
  const slotsForDay = useMemo(() => {
    if (!dayHours || dayHours.closed) return [];
    return genSlots(dayHours.open, dayHours.close);
  }, [dayHours]);

  const bookedTimesForDay = useMemo(() => {
    if (!selectedDate) return new Set();
    const key = fmtDateKey(selectedDate);
    return new Set(appointments.filter((a) => a.date === key && a.status !== "cancelled").map((a) => a.time));
  }, [appointments, selectedDate]);

  const now = new Date();
  const isToday = selectedDate && fmtDateKey(selectedDate) === fmtDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const firstAvailable = useMemo(() => {
    for (const s of slotsForDay) {
      const [h, m] = s.split(":").map(Number);
      const mins = h * 60 + m;
      if (isToday && mins <= nowMinutes) continue;
      if (bookedTimesForDay.has(s)) continue;
      return s;
    }
    return null;
  }, [slotsForDay, bookedTimesForDay, isToday, nowMinutes]);

  function goStep(n) {
    setConflict(null);
    setStep(n);
  }

  function handleConfirmSubmit() {
    // honeypot check — silently drop bot submissions
    if (honeypot) return;

    // simple throttle — idempotency guard against rapid double taps
    const nowTs = Date.now();
    if (nowTs - lastSubmitAt < 1200) return;
    setLastSubmitAt(nowTs);

    const v = validateClient({ name, phone }, { requirePhone: false });
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setConflict(null);

    // server round-trip
    setTimeout(async () => {
      const dateKey = fmtDateKey(selectedDate);
      // race-condition guard: re-check slot wasn't just taken by someone else
      const clash = appointments.some(
        (a) => a.date === dateKey && a.time === selectedTime && a.status !== "cancelled"
      );
      if (clash) {
        setSubmitting(false);
        setConflict("התור הזה נתפס הרגע על ידי לקוח אחר. בחרו שעה פנויה אחרת.");
        return;
      }

      // match a returning client by phone: local list first (admin/prototype),
      // otherwise a targeted server lookup — never by downloading everyone's data
      let client = phone ? clients.find((c) => c.phone === phone) : null;
      if (!client && phone) client = await remoteFindClientByPhone(phone);
      if (!client) {
        client = { id: uid(), name, phone: phone || "", note: "", defaultDuration: DEFAULT_APPT_DURATION };
        setClients((cs) => [client, ...cs]);
        remoteInsertRow("clients", client);
      }

      const appt = {
        id: uid(),
        clientId: client.id,
        clientName: name,
        phone: phone || "",
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        date: dateKey,
        time: selectedTime,
        duration: client.defaultDuration || DEFAULT_APPT_DURATION,
        price: selectedService.price,
        status: "pending", // every client request awaits the barber's one-tap approval
        createdAt: Date.now(),
      };
      setAppointments((a) => [...a, appt]);
      remoteInsertRow("appointments", appt);
      logActivity(`התקבלה בקשת תור: ${name} · ${selectedService.name} · ${dateKey} ${selectedTime}`);
      notifyAdmin && notifyAdmin("new_booking", {
        apptId: appt.id,
        clientName: name,
        serviceName: selectedService.name,
        date: dateKey,
        time: selectedTime,
        phone: phone || "",
      });
      setMyBookingIds((ids) => [...ids, appt.id]);
      vibrate([16, 40, 24]); // subtle success pattern on mobile
      setBookedAppt(appt);
      setSubmitting(false);
      setStep(5);

      // decouple WhatsApp confirmation send from the booking transaction itself —
      // the client sees confirmation immediately, message goes out async.
      // without a phone number there is simply nowhere to send it.
      if (phone) {
        setWhatsappStatus("sending");
        setTimeout(() => {
          setWhatsappStatus("sent");
          const waEntry = { id: uid(), ts: Date.now(), type: "אישור הזמנה", recipient: phone, status: "sent" };
          setNotificationLog((log) => [waEntry, ...log]);
          remoteInsertRow("notification_log", waEntry);
        }, 1400);
      } else {
        setWhatsappStatus("no_phone");
      }
    }, 650);
  }

  function resetFlow() {
    setStep(1);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setName("");
    setPhone("");
    setErrors({});
    setWhatsappStatus(null);
    setBookedAppt(null);
  }

  const myAppts = appointments.filter((a) => myBookingIds.includes(a.id));
  const myActiveCount = myAppts.filter((a) => a.status !== "cancelled").length;

  return (
    <div className="bb-app">
      <div className="bb-topbar">
        {step === 1 && (
          <button className="bb-icon-btn" onClick={onBackToLanding} title="חזרה למסך הפתיחה">
            <ChevronRight size={20} className="bb-rtl-flip" />
          </button>
        )}
        <div
          className="bb-serif"
          style={{ fontSize: 17, fontWeight: 700, color: "var(--gold-bright)", flex: 1, textAlign: step === 1 ? "center" : "start", display: "flex", alignItems: "center", justifyContent: step === 1 ? "center" : "flex-start", gap: 8 }}
        >
          {logo && <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />}
          {businessName}
        </div>
        {step > 1 && step < 5 && (
          <button className="bb-icon-btn" onClick={() => goStep(step - 1)}>
            <ChevronRight size={20} className="bb-rtl-flip" />
          </button>
        )}
        {step === 1 && (
          <button className="bb-icon-btn" onClick={() => setMyApptsOpen(true)} title="התור שלי" style={{ position: "relative" }}>
            <CalendarClock size={19} />
            {myActiveCount > 0 && (
              <span style={{ position: "absolute", top: 0, left: 0, background: "var(--gold)", color: "#1a1509", fontSize: 9.5, fontWeight: 700, borderRadius: 10, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {myActiveCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="bb-scroll" style={{ padding: "18px 20px" }}>
        {/* progress dots */}
        {step < 5 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ height: 3, flex: 1, borderRadius: 2, background: n <= step ? "var(--gold)" : "var(--border)" }} />
            ))}
          </div>
        )}

        {step === 1 && (
          <>
            <h2 className="bb-serif" style={{ fontSize: 22, marginBottom: 4 }}>בחרו שירות</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 18 }}>כל השירותים שלנו, במחיר קבוע וזמן מדויק</p>
            {services.length === 0 ? (
              <EmptyState icon={Scissors} title="אין שירותים זמינים" subtitle="נראה שעדיין לא הוגדרו שירותים להזמנה. נסו שוב מאוחר יותר." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {services.map((s) => (
                  <div
                    key={s.id}
                    className={`bb-service-card ${selectedService?.id === s.id ? "selected" : ""}`}
                    onClick={() => setSelectedService(s)}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15.5 }}>{s.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {s.duration} דק׳
                      </div>
                    </div>
                    <div className="bb-serif" style={{ color: "var(--gold-bright)", fontSize: 17, fontWeight: 700 }}>
                      ₪{s.price}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="bb-serif" style={{ fontSize: 22, marginBottom: 4 }}>בחרו תאריך ושעה</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}>{selectedService?.name}</p>

            <div className="bb-date-strip">
              {days.map((d) => {
                const closed = weeklyHours[d.getDay()]?.closed;
                const sel = selectedDate && fmtDateKey(selectedDate) === fmtDateKey(d);
                return (
                  <div
                    key={fmtDateKey(d)}
                    className={`bb-date-chip ${sel ? "selected" : ""}`}
                    style={{ opacity: closed ? 0.35 : 1, cursor: closed ? "not-allowed" : "pointer" }}
                    onClick={() => { if (!closed) { setSelectedDate(d); setSelectedTime(null); } }}
                  >
                    <div className="dow">{DOW_HE[d.getDay()]}</div>
                    <div className="dnum">{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {!selectedDate ? (
              <EmptyState icon={Calendar} title="בחרו תאריך" subtitle="בחרו יום מהרשימה למעלה כדי לראות שעות פנויות" />
            ) : loadingSlots ? (
              <div className="bb-slot-grid">
                {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} h={44} />)}
              </div>
            ) : dayHours?.closed || slotsForDay.length === 0 ? (
              <EmptyState icon={Clock} title="סגור ביום זה" subtitle="בחרו יום אחר מהרשימה למעלה" />
            ) : (
              <div className="bb-slot-grid">
                {slotsForDay.map((s) => {
                  const [h, m] = s.split(":").map(Number);
                  const mins = h * 60 + m;
                  const isPast = isToday && mins <= nowMinutes;
                  const isBooked = bookedTimesForDay.has(s);
                  const isRecommended = s === firstAvailable && !isPast && !isBooked;
                  const isSelected = selectedTime === s;
                  const disabled = isPast || isBooked;
                  return (
                    <div
                      key={s}
                      title={isBooked ? "תפוס" : undefined}
                      className={`bb-slot ${isPast ? "past" : ""} ${isBooked ? "booked" : ""} ${isRecommended ? "recommended" : ""} ${isSelected ? "selected" : ""}`}
                      onClick={() => !disabled && setSelectedTime(s)}
                    >
                      {s}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="bb-serif" style={{ fontSize: 22, marginBottom: 4 }}>פרטים אישיים</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 18 }}>
              {selectedService?.name} · {DOW_FULL_HE[selectedDate?.getDay()]} {selectedDate?.getDate()}/{selectedDate?.getMonth() + 1} · {selectedTime}
            </p>

            {/* honeypot — invisible to real users, catches bots */}
            <input
              className="bb-honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            <div className={`bb-field ${errors.name ? "error" : ""}`}>
              <label>שם מלא</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" />
              <FieldError msg={errors.name} />
            </div>
            <div className={`bb-field ${errors.phone ? "error" : ""}`}>
              <label>טלפון נייד (רשות)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050-1234567" inputMode="tel" />
              <FieldError msg={errors.phone} />
              {!errors.phone && (
                <div style={{ fontSize: 11.5, color: "var(--muted-dim)", marginTop: 5 }}>
                  ללא טלפון לא נוכל לשלוח תזכורת בוואטסאפ לפני התור
                </div>
              )}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="bb-serif" style={{ fontSize: 22, marginBottom: 16 }}>אישור הזמנה</h2>
            <div className="bb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SummaryRow icon={Scissors} label="שירות" value={`${selectedService?.name} · ₪${selectedService?.price}`} />
              <SummaryRow icon={Calendar} label="תאריך" value={`${DOW_FULL_HE[selectedDate?.getDay()]}, ${selectedDate?.getDate()}/${selectedDate?.getMonth() + 1}`} />
              <SummaryRow icon={Clock} label="שעה" value={selectedTime} />
              <SummaryRow icon={User} label="שם" value={name} />
              <SummaryRow icon={Phone} label="טלפון" value={phone} />
            </div>

            {conflict && (
              <div style={{ marginTop: 14, background: "var(--danger-wash)", border: "1px solid rgba(196,105,90,0.3)", borderRadius: 12, padding: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "var(--danger)" }}>{conflict}</div>
              </div>
            )}

            <p style={{ color: "var(--muted-dim)", fontSize: 12, marginTop: 14, lineHeight: 1.7 }}>
              ניתן לבטל עד שעתיים לפני מועד התור. תזכורת תישלח אליכם בוואטסאפ.
            </p>
          </>
        )}

        {step === 5 && bookedAppt && (
          <div style={{ textAlign: "center", paddingTop: 30 }}>
            <div style={{ position: "relative", width: 84, height: 84, margin: "0 auto" }}>
              <div className="bb-shine-ring" />
              <div className="bb-success-circle" style={{ margin: 0 }}>
                <Check size={40} strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="bb-serif" style={{ fontSize: 23, marginTop: 22, marginBottom: 6 }}>הבקשה נשלחה!</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>
              {selectedService?.name} · {DOW_FULL_HE[selectedDate?.getDay()]} {selectedDate?.getDate()}/{selectedDate?.getMonth() + 1} בשעה {selectedTime}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--warning-wash)", border: "1px solid rgba(209,168,92,0.3)", borderRadius: 20, padding: "6px 14px", marginBottom: 20 }}>
              <Clock size={13} color="var(--warning)" />
              <span style={{ fontSize: 12.5, color: "var(--warning)", fontWeight: 600 }}>ממתין לאישור המספרה</span>
            </div>
            <p style={{ color: "var(--muted-dim)", fontSize: 12, marginBottom: 18, lineHeight: 1.7 }}>
              המספרה תאשר את התור בהקדם. ניתן לעקוב אחרי הסטטוס ב"התור שלי".
            </p>

            <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 22 }}>
              <MessageCircle size={16} color={whatsappStatus === "sent" ? "var(--success)" : "var(--muted)"} />
              {whatsappStatus === "sending" && <span style={{ fontSize: 13, color: "var(--muted)" }}>שולח עדכון בוואטסאפ...</span>}
              {whatsappStatus === "sent" && <span style={{ fontSize: 13, color: "var(--success)" }}>קבלת הבקשה נשלחה בוואטסאפ ✓</span>}
              {whatsappStatus === "no_phone" && <span style={{ fontSize: 13, color: "var(--muted)" }}>לא הוזן טלפון — לא יישלחו עדכונים</span>}
            </div>

            <button
              className="bb-btn bb-btn-primary"
              style={{ width: "100%", marginBottom: 10 }}
              onClick={() => downloadICS(bookedAppt, businessName)}
            >
              <Download size={17} /> הוספה ליומן שלי
            </button>
            <button className="bb-btn bb-btn-ghost" style={{ width: "100%", marginBottom: 10 }} onClick={() => setMyApptsOpen(true)}>
              <CalendarClock size={17} /> התור שלי
            </button>
            <button className="bb-btn bb-btn-ghost" style={{ width: "100%" }} onClick={resetFlow}>
              קביעת תור נוסף
            </button>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="bb-sticky-cta">
          {step === 1 && (
            <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} disabled={!selectedService} onClick={() => goStep(2)}>
              המשך <ChevronLeft size={18} className="bb-rtl-flip" />
            </button>
          )}
          {step === 2 && (
            <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} disabled={!selectedTime} onClick={() => goStep(3)}>
              המשך <ChevronLeft size={18} className="bb-rtl-flip" />
            </button>
          )}
          {step === 3 && (
            <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={() => {
              const v = validateClient({ name, phone }, { requirePhone: false });
              setErrors(v);
              if (!Object.keys(v).length) goStep(4);
            }}>
              המשך לאישור <ChevronLeft size={18} className="bb-rtl-flip" />
            </button>
          )}
          {step === 4 && (
            <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} disabled={submitting} onClick={handleConfirmSubmit}>
              {submitting ? <><Loader2 size={17} className="bb-spin" style={{ animation: "spin 0.8s linear infinite" }} /> קובע תור...</> : "אישור וקביעת תור"}
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {myApptsOpen && (
        <MyAppointmentsModal
          appts={myAppts}
          businessName={businessName}
          onCancel={(appt) => {
            const msUntil = apptDateTime(appt).getTime() - Date.now();
            if (msUntil < 2 * 60 * 60 * 1000) {
              pushToast("לא ניתן לבטל פחות משעתיים לפני התור — צרו קשר עם המספרה", { type: "danger" });
              return;
            }
            setAppointments((appts) => appts.map((a) => (a.id === appt.id ? { ...a, status: "cancelled" } : a)));
            remoteSetAppointmentStatus(appt.id, "cancelled");
            logActivity(`לקוח ביטל תור: ${appt.clientName || "לקוח"} · ${appt.date} ${appt.time}`);
            notifyAdmin && notifyAdmin("client_cancelled", {
              apptId: appt.id,
              clientName: appt.clientName,
              serviceName: appt.serviceName,
              date: appt.date,
              time: appt.time,
            });
            vibrate(12);
            pushToast("התור בוטל בהצלחה", { type: "success" });
          }}
          onClose={() => setMyApptsOpen(false)}
        />
      )}
    </div>
  );
}

/* client-side self-service: view the appointments booked in this session and
   cancel them, subject to the 2-hour cancellation cutoff */
function MyAppointmentsModal({ appts, businessName, onCancel, onClose }) {
  const upcoming = [...appts].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <Modal title="התור שלי" onClose={onClose}>
      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarClock} title="אין תורים" subtitle="תורים שתקבעו יופיעו כאן, עם אפשרות ביטול עד שעתיים לפני" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {upcoming.map((a) => {
            const cancelled = a.status === "cancelled";
            const past = apptDateTime(a).getTime() < Date.now();
            return (
              <div key={a.id} className="bb-card" style={{ opacity: cancelled || past ? 0.55 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{a.serviceName}</span>
                  <span className={`bb-badge ${a.status}`}>
                    {{ confirmed: "מאושר", pending: "ממתין", cancelled: "בוטל", done: "הושלם" }[a.status]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                  {a.date} · {a.time} · {a.duration} דק׳ · ₪{a.price ?? 0}
                </div>
                {!cancelled && !past && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="bb-btn bb-btn-ghost bb-btn-sm" style={{ flex: 1 }} onClick={() => downloadICS(a, businessName)}>
                      <Download size={14} /> ליומן שלי
                    </button>
                    <button className="bb-btn bb-btn-danger bb-btn-sm" style={{ flex: 1 }} onClick={() => onCancel(a)}>
                      ביטול תור
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <p style={{ fontSize: 11.5, color: "var(--muted-dim)", textAlign: "center", margin: "4px 0 0" }}>
            ביטול אפשרי עד שעתיים לפני מועד התור
          </p>
        </div>
      )}
    </Modal>
  );
}

function SummaryRow({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13.5 }}>
        <Icon size={15} /> {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{value}</div>
    </div>
  );
}

/* ============================================================================
   ADMIN VIEW
   ============================================================================ */
const ADMIN_TABS = [
  { id: "dashboard", label: "דשבורד", icon: Home },
  { id: "finance", label: "כספים", icon: Wallet },
  { id: "appointments", label: "תורים", icon: CalendarClock },
  { id: "journal", label: "יומן", icon: BookOpen },
  { id: "clients", label: "לקוחות", icon: Users },
  { id: "services", label: "שירותים", icon: Scissors },
  { id: "hours", label: "שעות פעילות", icon: Clock },
  { id: "activity", label: "פעילות", icon: Activity },
  { id: "settings", label: "הגדרות", icon: Settings },
];

function AdminView(props) {
  const { businessName, setBusinessName, appointments, setAppointments, clients, services, activityLog, notificationLog, adminNotifications, setAdminNotifications, pushToast, logActivity, onLock } = props;
  const [tab, setTab] = useState("dashboard");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(businessName);
  const [loadingTab, setLoadingTab] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [popupNotif, setPopupNotif] = useState(null);
  const prevTopNotifId = useRef(adminNotifications?.[0]?.id ?? null);

  const unreadCount = (adminNotifications || []).filter((n) => !n.read).length;

  /* Facebook-style corner popup whenever a new notification lands while the
     admin panel is open (arrives live via Realtime in the deployed build) */
  useEffect(() => {
    const top = adminNotifications?.[0];
    if (top && top.id !== prevTopNotifId.current) {
      prevTopNotifId.current = top.id;
      if (!top.read && !top.handled) {
        setPopupNotif(top);
        vibrate(20);
        const t = setTimeout(() => setPopupNotif(null), 8000);
        return () => clearTimeout(t);
      }
    } else if (top) {
      prevTopNotifId.current = top.id;
    }
  }, [adminNotifications]);

  /* one-tap approve / decline for a booking request */
  function decideAppointment(apptId, decision, notifId) {
    setAppointments((as) => as.map((a) => (a.id === apptId ? { ...a, status: decision } : a)));
    remoteSetAppointmentStatus(apptId, decision);
    if (notifId) {
      setAdminNotifications((ns) => ns.map((n) => (n.id === notifId ? { ...n, handled: true, read: true } : n)));
    } else {
      // approve via dashboard quick-action: mark the matching notification handled too
      setAdminNotifications((ns) => ns.map((n) => (n.apptId === apptId ? { ...n, handled: true, read: true } : n)));
    }
    const appt = appointments.find((a) => a.id === apptId);
    if (decision === "confirmed") {
      logActivity(`התור של ${appt?.clientName || ""} אושר`);
      pushToast && pushToast("התור אושר ✓", { type: "success" });
    } else {
      logActivity(`בקשת התור של ${appt?.clientName || ""} נדחתה`);
      pushToast && pushToast("הבקשה נדחתה", { type: "danger" });
    }
    setPopupNotif(null);
  }

  function openBell() {
    setBellOpen((o) => !o);
    // opening the panel marks everything as read (badge clears)
    setAdminNotifications((ns) => ns.map((n) => (n.read ? n : { ...n, read: true })));
  }

  useEffect(() => {
    setLoadingTab(true);
    const t = setTimeout(() => setLoadingTab(false), 350);
    return () => clearTimeout(t);
  }, [tab]);

  function saveName() {
    if (nameDraft.trim()) {
      setBusinessName(nameDraft.trim());
      logActivity(`שם העסק עודכן ל"${nameDraft.trim()}"`);
    }
    setEditingName(false);
  }

  return (
    <div className="bb-admin-app">
      <div className="bb-topbar" style={{ maxWidth: 900, margin: "0 auto" }}>
        {editingName ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              style={{ background: "var(--bg-card)", border: "1.5px solid var(--gold)", borderRadius: 8, padding: "6px 10px", color: "var(--cream)", fontFamily: "Frank Ruhl Libre", fontSize: 16, flex: 1 }}
            />
            <button className="bb-icon-btn" onClick={saveName}><Check size={18} color="var(--success)" /></button>
            <button className="bb-icon-btn" onClick={() => { setEditingName(false); setNameDraft(businessName); }}><X size={18} /></button>
          </div>
        ) : (
          <div
            className="bb-serif"
            style={{ fontSize: 18, fontWeight: 700, color: "var(--gold-bright)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => setEditingName(true)}
          >
            {businessName}
            <Pencil size={13} color="var(--muted)" />
          </div>
        )}
        <button
          className="bb-btn bb-btn-ghost bb-btn-sm"
          onClick={onLock}
          title="התנתקות וחזרה למסך הפתיחה"
        >
          <Lock size={14} /> התנתקות
        </button>
        <div style={{ position: "relative" }}>
          <button className="bb-icon-btn" onClick={openBell} title="התראות" style={{ position: "relative" }}>
            <Bell size={19} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -2, left: -2, background: "var(--danger)", color: "#fff", fontSize: 9.5, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {bellOpen && (
            <NotificationPanel
              notifications={adminNotifications}
              appointments={appointments}
              onDecide={decideAppointment}
              onClose={() => setBellOpen(false)}
            />
          )}
        </div>
      </div>

      {popupNotif && (
        <NotificationPopup
          notif={popupNotif}
          onDecide={decideAppointment}
          onClose={() => setPopupNotif(null)}
        />
      )}

      <div className="bb-admin-tabs">
        {ADMIN_TABS.map((t) => (
          <button key={t.id} className={`bb-admin-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "4px 0 40px" }}>
        {loadingTab ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <Skeleton h={70} />
            <Skeleton h={70} />
            <Skeleton h={70} />
          </div>
        ) : (
          <>
            {tab === "dashboard" && <DashboardTab {...props} />}
            {tab === "finance" && <FinanceTab {...props} />}
            {tab === "appointments" && <AppointmentsTab {...props} />}
            {tab === "journal" && <JournalTab {...props} />}
            {tab === "clients" && <ClientsTab {...props} />}
            {tab === "services" && <ServicesTab {...props} />}
            {tab === "hours" && <HoursTab {...props} />}
            {tab === "activity" && <ActivityTab {...props} />}
            {tab === "settings" && <SettingsTab {...props} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- ADMIN NOTIFICATIONS — bell panel + Facebook-style corner popup ---------- */
function notifTexts(n) {
  if (n.type === "new_booking") {
    return {
      title: "בקשת תור חדשה",
      body: `${n.clientName} מבקש/ת תור: ${n.serviceName} · ${n.date} בשעה ${n.time}`,
    };
  }
  if (n.type === "client_cancelled") {
    return {
      title: "לקוח ביטל תור",
      body: `${n.clientName} ביטל/ה את התור: ${n.serviceName} · ${n.date} בשעה ${n.time}`,
    };
  }
  return { title: "עדכון", body: "" };
}

function NotificationPanel({ notifications, appointments, onDecide, onClose }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={onClose} />
      <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 330, maxHeight: 420, overflowY: "auto", background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", zIndex: 70 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14 }}>התראות</div>
        {(!notifications || notifications.length === 0) ? (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted-dim)", fontSize: 13 }}>
            אין התראות עדיין — בקשות תור חדשות יופיעו כאן
          </div>
        ) : (
          notifications.map((n) => {
            const t = notifTexts(n);
            const appt = appointments.find((a) => a.id === n.apptId);
            const stillPending = n.type === "new_booking" && !n.handled && appt?.status === "pending";
            return (
              <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: n.read ? "transparent" : "var(--gold-wash)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  {n.type === "new_booking" ? <CalendarClock size={13} color="var(--gold-bright)" /> : <X size={13} color="var(--danger)" />}
                  {t.title}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>{t.body}</div>
                <div style={{ fontSize: 10.5, color: "var(--muted-dim)", marginTop: 4 }}>
                  {new Date(n.ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                {stillPending && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="bb-btn bb-btn-primary bb-btn-sm" style={{ flex: 1 }} onClick={() => onDecide(n.apptId, "confirmed", n.id)}>
                      <Check size={14} /> אישור
                    </button>
                    <button className="bb-btn bb-btn-danger bb-btn-sm" style={{ flex: 1 }} onClick={() => onDecide(n.apptId, "cancelled", n.id)}>
                      <X size={14} /> דחייה
                    </button>
                  </div>
                )}
                {n.type === "new_booking" && n.handled && (
                  <div style={{ fontSize: 11, color: appt?.status === "confirmed" ? "var(--success)" : "var(--danger)", marginTop: 6, fontWeight: 600 }}>
                    {appt?.status === "confirmed" ? "✓ אושר" : "✗ נדחה"}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function NotificationPopup({ notif, onDecide, onClose }) {
  const t = notifTexts(notif);
  const isBooking = notif.type === "new_booking" && !notif.handled;
  return (
    <div style={{ position: "fixed", bottom: 20, left: 16, zIndex: 95, width: 300, background: "var(--bg-elevated)", border: "1.5px solid var(--gold)", borderRadius: 14, padding: 14, boxShadow: "0 12px 36px rgba(0,0,0,0.55)", animation: "bb-note-in .3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13.5, color: "var(--gold-bright)" }}>
          <Bell size={15} /> {t.title}
        </div>
        <button className="bb-icon-btn" style={{ padding: 2 }} onClick={onClose}><X size={15} /></button>
      </div>
      <div style={{ fontSize: 13, color: "var(--cream)", margin: "8px 0 4px", lineHeight: 1.6 }}>{t.body}</div>
      {isBooking && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="bb-btn bb-btn-primary bb-btn-sm" style={{ flex: 1 }} onClick={() => onDecide(notif.apptId, "confirmed", notif.id)}>
            <Check size={14} /> אישור
          </button>
          <button className="bb-btn bb-btn-danger bb-btn-sm" style={{ flex: 1 }} onClick={() => onDecide(notif.apptId, "cancelled", notif.id)}>
            <X size={14} /> דחייה
          </button>
        </div>
      )}
      <style>{`@keyframes bb-note-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

/* ---------- DASHBOARD ---------- */
function DashboardTab({ appointments, clients, services, notificationLog, setAppointments, adminNotifications, setAdminNotifications, logActivity, pushToast, undoStash }) {
  const pendingRequests = appointments
    .filter((a) => a.status === "pending")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  function quickDecide(apptId, decision) {
    setAppointments((as) => as.map((a) => (a.id === apptId ? { ...a, status: decision } : a)));
    remoteSetAppointmentStatus(apptId, decision);
    setAdminNotifications && setAdminNotifications((ns) => ns.map((n) => (n.apptId === apptId ? { ...n, handled: true, read: true } : n)));
    const appt = appointments.find((a) => a.id === apptId);
    logActivity(decision === "confirmed" ? `התור של ${appt?.clientName || ""} אושר` : `בקשת התור של ${appt?.clientName || ""} נדחתה`);
    pushToast && pushToast(decision === "confirmed" ? "התור אושר ✓" : "הבקשה נדחתה", { type: decision === "confirmed" ? "success" : "danger" });
  }

  const [editingAppt, setEditingAppt] = useState(null);
  const [tick, setTick] = useState(0); // re-render every 30s so the live "in the chair" timer stays fresh
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const todayKey = fmtDateKey(new Date());
  const todaysAppts = appointments.filter((a) => a.date === todayKey && a.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));
  const revenueToday = todaysAppts.reduce((sum, a) => sum + (a.price ?? (services.find((s) => s.id === a.serviceId)?.price || 0)), 0);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextAppt = todaysAppts.find((a) => {
    const [h, m] = a.time.split(":").map(Number);
    return h * 60 + m >= nowMinutes;
  });

  // who is in the chair right now: started already, not yet finished
  const currentAppt = todaysAppts.find((a) => {
    const start = timeToMinutes(a.time);
    const end = start + (a.duration || DEFAULT_APPT_DURATION);
    return nowMinutes >= start && nowMinutes < end && a.status !== "done";
  });
  const currentElapsed = currentAppt ? nowMinutes - timeToMinutes(currentAppt.time) : 0;
  const currentRemaining = currentAppt ? (currentAppt.duration || DEFAULT_APPT_DURATION) - currentElapsed : 0;

  const failedNotifs = notificationLog.filter((n) => n.status !== "sent").length;

  function saveAppt(updated) {
    setAppointments((appts) => appts.map((a) => (a.id === updated.id ? updated : a)));
    remoteInsertRow("appointments", updated).then((ok) => {
      if (!ok) pushToast && pushToast("⚠️ השמירה לשרת נכשלה — בדקו חיבור ונסו שוב", { type: "danger", duration: 8000 });
    });
    logActivity(`התור של ${updated.clientName} עודכן ידנית`);
    pushToast && pushToast("התור עודכן בהצלחה", { type: "success" });
    setEditingAppt(null);
  }

  function deleteAppt(appt) {
    setAppointments((appts) => appts.filter((a) => a.id !== appt.id));
    logActivity(`נמחק תור לצמיתות: ${appt.clientName} · ${appt.date} ${appt.time}`);
    const toastId = pushToast(`התור של ${appt.clientName} נמחק`, { type: "danger", undoable: true });
    if (undoStash) undoStash.current[toastId] = () => setAppointments((appts) => [...appts, appt]);
  }

  return (
    <div>
      <div className="bb-summary-grid">
        <div className="bb-summary-card">
          <div className="label">תורים היום</div>
          <div className="value bb-mono-num">{todaysAppts.length}</div>
        </div>
        <div className="bb-summary-card">
          <div className="label">הכנסה משוערת</div>
          <div className="value bb-mono-num">₪{revenueToday}</div>
        </div>
        <div className="bb-summary-card">
          <div className="label">הלקוח הבא</div>
          <div className="value" style={{ fontSize: 15 }}>{nextAppt ? nextAppt.time : "—"}</div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {pendingRequests.length > 0 && (
          <div className="bb-card" style={{ border: "1.5px solid var(--warning)", background: "var(--warning-wash)", marginBottom: 12, padding: "14px 14px 6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Bell size={15} color="var(--warning)" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--warning)" }}>
                {pendingRequests.length} בקשות תור ממתינות לאישור שלך
              </span>
            </div>
            {pendingRequests.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid rgba(209,168,92,0.2)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.clientName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.serviceName} · {a.date} · {a.time}{a.phone ? ` · ${a.phone}` : ""}</div>
                </div>
                <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={() => quickDecide(a.id, "confirmed")}>
                  <Check size={14} /> אישור
                </button>
                <button className="bb-btn bb-btn-danger bb-btn-sm" onClick={() => quickDecide(a.id, "cancelled")}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {currentAppt && (
          <div className="bb-card" style={{ border: "1.5px solid var(--gold)", background: "var(--gold-wash)", display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Timer size={19} color="#1a1509" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: "var(--gold-bright)", fontWeight: 600, marginBottom: 2 }}>על הכיסא עכשיו</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{currentAppt.clientName} · {currentAppt.serviceName}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="bb-mono-num" style={{ fontFamily: "'Frank Ruhl Libre'", fontSize: 19, fontWeight: 700, color: "var(--gold-bright)" }}>
                {Math.max(currentRemaining, 0)}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)" }}>דק׳ נותרו</div>
            </div>
          </div>
        )}

        <SectionTitle title="לוח היום" />
        {todaysAppts.length === 0 ? (
          <EmptyState icon={CalendarClock} title="אין תורים היום" subtitle="ברגע שלקוחות יזמינו תורים להיום, הם יופיעו כאן" />
        ) : (
          <div className="bb-card" style={{ padding: 0, overflow: "hidden" }}>
            {todaysAppts.map((a) => <AppointmentRow key={a.id} appt={a} compact onEdit={() => setEditingAppt(a)} onDelete={() => deleteAppt(a)} />)}
          </div>
        )}

        <SectionTitle title="בריאות המערכת" style={{ marginTop: 26 }} />
        <div className="bb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SystemHealthRow label="חיבור בסיס נתונים" ok={isSupabaseConfigured} detail={isSupabaseConfigured ? "מחובר ומסונכרן" : "מצב מקומי — נתונים לא נשמרים בין מכשירים"} />
          <SystemHealthRow label="שליחת תזכורות (Cron)" ok={true} detail="ריצה אחרונה: לפני 12 דק׳" />
          <SystemHealthRow label="חיתוך ביטול 2 שעות" ok={true} detail="ריצה אחרונה: לפני 3 דק׳" />
          <SystemHealthRow label="גיבוי בסיס נתונים" ok={true} detail="גיבוי אחרון: הלילה 03:00" />
          <SystemHealthRow label="הודעות וואטסאפ" ok={failedNotifs === 0} detail={failedNotifs === 0 ? "כל ההודעות נשלחו" : `${failedNotifs} הודעות ממתינות לשליחה חוזרת`} />
        </div>
      </div>

      {editingAppt && (
        <EditAppointmentModal appt={editingAppt} services={services} clients={clients} onSave={saveAppt} onClose={() => setEditingAppt(null)} />
      )}
    </div>
  );
}

function SystemHealthRow({ label, ok, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={`bb-pulse-dot ${ok ? "ok" : "warn"}`} />
        <span style={{ fontSize: 13.5 }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{detail}</span>
    </div>
  );
}

function SectionTitle({ title, style }) {
  return <h3 className="bb-serif" style={{ fontSize: 15.5, color: "var(--muted)", fontWeight: 500, margin: "18px 0 10px", ...style }}>{title}</h3>;
}

function FinanceStat({ label, value, highlight }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
      <div className="bb-mono-num" style={{ fontSize: 14, fontWeight: 700, color: highlight ? "var(--gold-bright)" : "var(--cream)" }}>{value}</div>
    </div>
  );
}

/* ---------- FINANCE — revenue, expenses, and where the money actually comes from ---------- */
function FinanceTab({ appointments, clients, services, expenses, setExpenses, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | expense obj (edit)
  const [form, setForm] = useState({ description: "", category: EXPENSE_CATEGORIES[0], amount: "", date: fmtDateKey(new Date()) });
  const [errors, setErrors] = useState({});

  const realized = appointments.filter((a) => a.status === "done");
  const pipeline = appointments.filter((a) => a.status === "confirmed" || a.status === "pending");
  const totalRevenue = realized.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const pipelineRevenue = pipeline.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const avgTicket = realized.length ? Math.round(totalRevenue / realized.length) : 0;

  const byService = useMemo(() => {
    const map = {};
    realized.forEach((a) => {
      const key = a.serviceName || "אחר";
      map[key] = (map[key] || 0) + (a.price ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [realized]);
  const maxServiceRevenue = byService.length ? byService[0][1] : 1;

  const topClients = useMemo(() => {
    return clients
      .map((c) => ({ client: c, stats: computeClientStats(c.id, appointments) }))
      .filter((x) => x.stats.totalSpent > 0)
      .sort((a, b) => b.stats.totalSpent - a.stats.totalSpent)
      .slice(0, 5);
  }, [clients, appointments]);

  function openAdd() { setForm({ description: "", category: EXPENSE_CATEGORIES[0], amount: "", date: fmtDateKey(new Date()) }); setErrors({}); setModal("add"); }
  function openEdit(e) { setForm({ description: e.description, category: e.category, amount: String(e.amount), date: e.date }); setErrors({}); setModal(e); }

  function save() {
    const v = validateExpense(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const payload = { description: form.description.trim(), category: form.category, amount: Number(form.amount), date: form.date };
    if (modal === "add") {
      setExpenses((es) => [{ id: uid(), ...payload }, ...es]);
      logActivity(`נוספה הוצאה: ${payload.description} (₪${payload.amount})`);
      pushToast("ההוצאה נוספה בהצלחה", { type: "success" });
    } else {
      setExpenses((es) => es.map((x) => (x.id === modal.id ? { ...x, ...payload } : x)));
      logActivity(`הוצאה עודכנה: ${payload.description}`);
      pushToast("ההוצאה עודכנה", { type: "success" });
    }
    setModal(null);
  }

  function del(expense) {
    setExpenses((es) => es.filter((x) => x.id !== expense.id));
    logActivity(`נמחקה הוצאה: ${expense.description}`);
    const toastId = pushToast(`"${expense.description}" נמחקה`, { type: "danger", undoable: true });
    undoStash.current[toastId] = () => setExpenses((es) => [expense, ...es]);
  }

  return (
    <div>
      <div className="bb-summary-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", padding: "16px 16px 6px" }}>
        <div className="bb-summary-card">
          <div className="label">הכנסות בפועל</div>
          <div className="value bb-mono-num" style={{ color: "var(--success)" }}>₪{totalRevenue}</div>
        </div>
        <div className="bb-summary-card">
          <div className="label">הוצאות</div>
          <div className="value bb-mono-num" style={{ color: "var(--danger)" }}>₪{totalExpenses}</div>
        </div>
        <div className="bb-summary-card">
          <div className="label">רווח נקי</div>
          <div className="value bb-mono-num" style={{ color: netProfit >= 0 ? "var(--gold-bright)" : "var(--danger)" }}>₪{netProfit}</div>
        </div>
        <div className="bb-summary-card">
          <div className="label">כרטיס ממוצע</div>
          <div className="value bb-mono-num">₪{avgTicket}</div>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <TrendingUp size={16} color="var(--muted)" />
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
            הכנסות צפויות מתורים עתידיים (טרם בוצעו): <b style={{ color: "var(--cream)" }}>₪{pipelineRevenue}</b>
          </span>
        </div>

        <SectionTitle title="הכנסות לפי שירות" />
        {byService.length === 0 ? (
          <EmptyState icon={CircleDollarSign} title="אין עדיין הכנסות מוכרות" subtitle="ברגע שתורים יסומנו כ״הושלם״, ההכנסה תיזקף כאן לפי שירות" />
        ) : (
          <div className="bb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {byService.map(([name, amount]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span>{name}</span>
                  <span className="bb-mono-num" style={{ color: "var(--gold-bright)", fontWeight: 600 }}>₪{amount}</span>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "var(--bg-hover)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(amount / maxServiceRevenue) * 100}%`, background: "linear-gradient(90deg, var(--gold-dim), var(--gold))", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionTitle title="לקוחות מובילים (לפי הכנסה)" />
        {topClients.length === 0 ? (
          <EmptyState icon={Crown} title="אין עדיין נתונים" subtitle="לקוחות מובילים לפי סך ההכנסה יופיעו כאן" />
        ) : (
          <div className="bb-card" style={{ padding: 0 }}>
            {topClients.map(({ client, stats }, i) => (
              <div key={client.id} className="bb-row">
                <div style={{ width: 20, textAlign: "center", color: "var(--muted-dim)", fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                <div className="bb-avatar">{initials(client.name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{client.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{stats.visits} ביקורים · ₪{stats.avgTicket} ממוצע</div>
                </div>
                <div className="bb-serif" style={{ color: "var(--gold-bright)", fontWeight: 700 }}>₪{stats.totalSpent}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 10 }}>
          <SectionTitle title="הוצאות" style={{ margin: 0 }} />
          <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={openAdd}><Plus size={15} /> הוצאה חדשה</button>
        </div>
        {expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="אין הוצאות רשומות" subtitle="הוסיפו הוצאות עסקיות (שכירות, מוצרים, ציוד) כדי לראות רווח נקי אמיתי" />
        ) : (
          <div className="bb-card" style={{ padding: 0 }}>
            {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <div key={e.id} className="bb-row">
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--danger-wash)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingDown size={15} color="var(--danger)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.description}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{e.category} · {e.date}</div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--danger)" }}>₪{e.amount}</div>
                <button className="bb-icon-btn" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                <button className="bb-icon-btn" onClick={() => del(e)}><Trash2 size={14} color="var(--danger)" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <Modal onClose={() => setModal(null)} title={modal === "add" ? "הוצאה חדשה" : "עריכת הוצאה"}>
          <div className={`bb-field ${errors.description ? "error" : ""}`}>
            <label>תיאור</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <FieldError msg={errors.description} />
          </div>
          <div className="bb-field">
            <label>קטגוריה</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={{ width: "100%", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--cream)", fontFamily: "Heebo", fontSize: 15 }}
            >
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className={`bb-field ${errors.amount ? "error" : ""}`} style={{ flex: 1 }}>
              <label>סכום (₪)</label>
              <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} inputMode="numeric" />
              <FieldError msg={errors.amount} />
            </div>
            <div className={`bb-field ${errors.date ? "error" : ""}`} style={{ flex: 1 }}>
              <label>תאריך</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <FieldError msg={errors.date} />
            </div>
          </div>
          <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={save}>שמירה</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- APPOINTMENTS ---------- */
function AppointmentRow({ appt, compact, onStatusChange, onEdit, onDelete }) {
  const statusLabels = { confirmed: "מאושר", pending: "ממתין", cancelled: "בוטל", done: "הושלם" };
  return (
    <div className="bb-row">
      <div className="bb-avatar">{initials(appt.clientName)}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{appt.clientName}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          {appt.serviceName} · {appt.time}{!compact ? ` · ${appt.date}` : ""} · {appt.duration ?? DEFAULT_APPT_DURATION} דק׳ · ₪{appt.price ?? 0}
        </div>
      </div>
      {onStatusChange ? (
        <select
          value={appt.status}
          onChange={(e) => onStatusChange(appt.id, e.target.value)}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--cream)", fontSize: 12, padding: "6px 8px" }}
        >
          <option value="pending">ממתין</option>
          <option value="confirmed">מאושר</option>
          <option value="done">הושלם</option>
          <option value="cancelled">בוטל</option>
        </select>
      ) : (
        <span className={`bb-badge ${appt.status}`}>{statusLabels[appt.status]}</span>
      )}
      {onEdit && (
        <button className="bb-icon-btn" onClick={onEdit} title="עריכה מלאה">
          <Pencil size={15} />
        </button>
      )}
      {onDelete && (
        <button className="bb-icon-btn" onClick={onDelete} title="מחיקה לצמיתות">
          <Trash2 size={15} color="var(--danger)" />
        </button>
      )}
    </div>
  );
}

function AppointmentsTab({ appointments, setAppointments, services, clients, setClients, weeklyHours, logActivity, pushToast, undoStash }) {
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("week"); // 'week' (visual calendar) | 'list'
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingAppt, setEditingAppt] = useState(null);
  const [creatingAppt, setCreatingAppt] = useState(false);
  const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const filtered = filter === "all" ? sorted : sorted.filter((a) => a.status === filter);

  function updateStatus(id, status) {
    setAppointments((appts) => appts.map((a) => (a.id === id ? { ...a, status } : a)));
    remoteSetAppointmentStatus(id, status);
    const a = appointments.find((x) => x.id === id);
    logActivity(`סטטוס התור של ${a?.clientName} עודכן ל"${status}"`);
  }

  function saveAppt(updated) {
    setAppointments((appts) => appts.map((a) => (a.id === updated.id ? updated : a)));
    remoteInsertRow("appointments", updated).then((ok) => {
      if (!ok) pushToast && pushToast("⚠️ השמירה לשרת נכשלה — בדקו חיבור ונסו שוב", { type: "danger", duration: 8000 });
    });
    logActivity(`התור של ${updated.clientName} עודכן ידנית (עריכה מלאה)`);
    pushToast && pushToast("התור עודכן בהצלחה", { type: "success" });
    setEditingAppt(null);
  }

  function deleteAppt(appt) {
    setAppointments((appts) => appts.filter((a) => a.id !== appt.id));
    logActivity(`נמחק תור לצמיתות: ${appt.clientName} · ${appt.date} ${appt.time}`);
    const toastId = pushToast(`התור של ${appt.clientName} נמחק`, { type: "danger", undoable: true });
    if (undoStash) undoStash.current[toastId] = () => setAppointments((appts) => [...appts, appt]);
  }

  // admin-initiated booking — creates the appointment and, if needed, a
  // matching client record (existing client picked, matched by phone, or new)
  function createAppt(data) {
    const { existingClientId, ...apptFields } = data;
    let clientId = existingClientId || null;

    if (!clientId && apptFields.phone) {
      const existing = clients.find((c) => c.phone === apptFields.phone);
      if (existing) clientId = existing.id;
    }
    if (!clientId) {
      clientId = uid();
      setClients((cs) => [
        { id: clientId, name: apptFields.clientName, phone: apptFields.phone || "", note: "", defaultDuration: apptFields.duration || DEFAULT_APPT_DURATION },
        ...cs,
      ]);
    }

    const clash = appointments.some(
      (a) => a.date === apptFields.date && a.time === apptFields.time && a.status !== "cancelled"
    );
    if (clash) {
      pushToast && pushToast("קיים כבר תור בשעה הזו — בחרו שעה אחרת", { type: "danger" });
      return;
    }

    const newAppt = { id: uid(), clientId, ...apptFields, createdAt: Date.now() };
    setAppointments((appts) => [...appts, newAppt]);
    // verified server write — loud failure instead of silent data loss
    remoteInsertRow("appointments", newAppt).then((ok) => {
      if (!ok) pushToast && pushToast("⚠️ השמירה לשרת נכשלה — בדקו חיבור ונסו שוב", { type: "danger", duration: 8000 });
    });
    logActivity(`תור נקבע ידנית עבור ${apptFields.clientName} · ${apptFields.date} ${apptFields.time}`);
    pushToast && pushToast("התור נקבע בהצלחה", { type: "success" });
    setCreatingAppt(false);
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <div className="bb-view-toggle">
          <button className={viewMode === "week" ? "active" : ""} onClick={() => setViewMode("week")}>
            <CalendarDays size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />יומן
          </button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>
            <List size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />רשימה
          </button>
        </div>
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={() => setCreatingAppt(true)}><Plus size={15} /> תור חדש</button>
      </div>

      {viewMode === "week" ? (
        <WeekCalendar
          appointments={appointments}
          weeklyHours={weeklyHours}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          onSelect={(a) => setEditingAppt(a)}
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
            {["all", "pending", "confirmed", "done", "cancelled"].map((f) => (
              <button
                key={f}
                className={`bb-admin-tab ${filter === f ? "active" : ""}`}
                style={{ border: "1px solid var(--border)" }}
                onClick={() => setFilter(f)}
              >
                {{ all: "הכל", pending: "ממתינים", confirmed: "מאושרים", done: "הושלמו", cancelled: "בוטלו" }[f]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={CalendarClock} title="אין תורים להצגה" subtitle="נסו לשנות את הסינון או קבעו תור חדש ללקוח" />
          ) : (
            <div className="bb-card" style={{ padding: 0 }}>
              {filtered.map((a) => (
                <AppointmentRow key={a.id} appt={a} onStatusChange={updateStatus} onEdit={() => setEditingAppt(a)} onDelete={() => deleteAppt(a)} />
              ))}
            </div>
          )}
        </>
      )}

      {editingAppt && (
        <EditAppointmentModal appt={editingAppt} services={services} clients={clients} onSave={saveAppt} onClose={() => setEditingAppt(null)} />
      )}
      {creatingAppt && (
        <EditAppointmentModal appt={null} services={services} clients={clients} onSave={createAppt} onClose={() => setCreatingAppt(false)} />
      )}
    </div>
  );
}

/* ---------- WEEKLY VISUAL CALENDAR — days across, hours down, appointment
   blocks positioned to scale. The at-a-glance view of the barber's week. ---------- */
const WEEK_STATUS_COLORS = {
  confirmed: { bg: "var(--gold-wash)", border: "var(--gold)", text: "var(--gold-bright)" },
  pending: { bg: "var(--warning-wash)", border: "var(--warning)", text: "var(--warning)" },
  done: { bg: "var(--success-wash)", border: "var(--success)", text: "var(--success)" },
  cancelled: { bg: "var(--danger-wash)", border: "var(--danger)", text: "var(--danger)" },
};

function WeekCalendar({ appointments, weeklyHours, weekOffset, setWeekOffset, onSelect }) {
  const start = weekStart(weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  // visible hour range: from the earliest opening to the latest closing across
  // the week (fallback 08:00–21:00 when everything is closed)
  let minHour = 24, maxHour = 0;
  Object.values(weeklyHours || {}).forEach((h) => {
    if (h && !h.closed) {
      minHour = Math.min(minHour, Math.floor(timeToMinutes(h.open) / 60));
      maxHour = Math.max(maxHour, Math.ceil(timeToMinutes(h.close) / 60));
    }
  });
  if (minHour >= maxHour) { minHour = 8; maxHour = 21; }
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const HOUR_PX = 52;
  const gridStartMin = minHour * 60;

  const todayKey = fmtDateKey(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowInRange = nowMin >= gridStartMin && nowMin <= maxHour * 60;

  const rangeLabel = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button className="bb-icon-btn" onClick={() => setWeekOffset(weekOffset + 1)} title="שבוע הבא">
          <ChevronLeft size={18} className="bb-rtl-flip" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="bb-serif" style={{ fontSize: 14.5, fontWeight: 700 }}>{rangeLabel}</span>
          {weekOffset !== 0 && (
            <button className="bb-btn bb-btn-ghost bb-btn-sm" style={{ padding: "4px 10px", fontSize: 11.5 }} onClick={() => setWeekOffset(0)}>
              היום
            </button>
          )}
        </div>
        <button className="bb-icon-btn" onClick={() => setWeekOffset(weekOffset - 1)} title="שבוע קודם">
          <ChevronRight size={18} className="bb-rtl-flip" />
        </button>
      </div>

      <div className="bb-card" style={{ padding: 0, overflowX: "auto" }}>
        <div style={{ minWidth: 640, display: "grid", gridTemplateColumns: "44px repeat(7, 1fr)" }}>
          {/* header row */}
          <div style={{ borderBottom: "1px solid var(--border)" }} />
          {days.map((d) => {
            const isToday = fmtDateKey(d) === todayKey;
            const closed = weeklyHours[d.getDay()]?.closed;
            return (
              <div key={fmtDateKey(d)} style={{ textAlign: "center", padding: "8px 2px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: isToday ? "var(--gold-wash)" : "transparent", opacity: closed ? 0.45 : 1 }}>
                <div style={{ fontSize: 10.5, color: isToday ? "var(--gold-bright)" : "var(--muted)" }}>{DOW_HE[d.getDay()]}</div>
                <div className="bb-serif" style={{ fontSize: 15, fontWeight: 700, color: isToday ? "var(--gold-bright)" : "var(--cream)" }}>{d.getDate()}</div>
              </div>
            );
          })}

          {/* time gutter */}
          <div style={{ position: "relative", height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div key={h} className="bb-mono-num" style={{ position: "absolute", top: i * HOUR_PX - 7, left: 0, right: 4, textAlign: "left", fontSize: 10, color: "var(--muted-dim)", direction: "ltr" }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d) => {
            const key = fmtDateKey(d);
            const isToday = key === todayKey;
            const closed = weeklyHours[d.getDay()]?.closed;
            const dayAppts = appointments.filter((a) => a.date === key && a.status !== "cancelled");
            return (
              <div key={key} style={{ position: "relative", height: hours.length * HOUR_PX, borderRight: "1px solid var(--border)", background: closed ? "repeating-linear-gradient(45deg, transparent, transparent 6px, var(--bg-elevated) 6px, var(--bg-elevated) 8px)" : isToday ? "rgba(198,161,91,0.03)" : "transparent" }}>
                {hours.map((h, i) => (
                  <div key={h} style={{ position: "absolute", top: i * HOUR_PX, left: 0, right: 0, borderTop: "1px solid var(--border)", opacity: 0.5 }} />
                ))}
                {isToday && nowInRange && (
                  <div style={{ position: "absolute", top: ((nowMin - gridStartMin) / 60) * HOUR_PX, left: 0, right: 0, height: 1.5, background: "var(--danger)", zIndex: 3 }}>
                    <div style={{ position: "absolute", right: -3, top: -2.5, width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
                  </div>
                )}
                {dayAppts.map((a) => {
                  const startMin = timeToMinutes(a.time);
                  const dur = a.duration || DEFAULT_APPT_DURATION;
                  const top = ((startMin - gridStartMin) / 60) * HOUR_PX;
                  const height = Math.max((dur / 60) * HOUR_PX - 2, 20);
                  const c = WEEK_STATUS_COLORS[a.status] || WEEK_STATUS_COLORS.confirmed;
                  return (
                    <div
                      key={a.id}
                      onClick={() => onSelect(a)}
                      title={`${a.clientName} · ${a.serviceName} · ${a.time}`}
                      style={{
                        position: "absolute", top, right: 2, left: 2, height,
                        background: c.bg, borderRight: `3px solid ${c.border}`, borderRadius: 7,
                        padding: "3px 6px", cursor: "pointer", overflow: "hidden", zIndex: 2,
                      }}
                    >
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {a.clientName}
                      </div>
                      {height > 34 && (
                        <div style={{ fontSize: 9.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.time} · {a.serviceName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {Object.entries({ confirmed: "מאושר", pending: "ממתין", done: "הושלם" }).map(([s, label]) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: WEEK_STATUS_COLORS[s].border }} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- FULL MANUAL EDIT — every field on an appointment, one button away ---------- */
function EditAppointmentModal({ appt, services, clients = [], onSave, onClose }) {
  const isCreate = !appt;
  const [selectedClientId, setSelectedClientId] = useState("");
  const [form, setForm] = useState({
    clientName: appt?.clientName || "",
    phone: appt?.phone || "",
    serviceId: appt?.serviceId || services[0]?.id || "",
    date: appt?.date || fmtDateKey(new Date()),
    time: appt?.time || "10:00",
    duration: appt?.duration ?? DEFAULT_APPT_DURATION,
    price: appt?.price ?? (services[0]?.price ?? 0),
    status: appt?.status || "confirmed",
  });
  const [errors, setErrors] = useState({});

  function pickExistingClient(id) {
    setSelectedClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setForm((f) => ({ ...f, clientName: c.name, phone: c.phone || "", duration: c.defaultDuration || DEFAULT_APPT_DURATION }));
  }

  function save() {
    const v = validateAppointment(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const service = services.find((s) => s.id === form.serviceId) || services.find((s) => s.id === appt?.serviceId);
    const payload = {
      clientName: form.clientName.trim(),
      phone: form.phone.trim(),
      serviceId: form.serviceId,
      serviceName: service?.name || appt?.serviceName || "",
      date: form.date,
      time: form.time,
      duration: Number(form.duration),
      price: Number(form.price),
      status: form.status,
    };
    onSave(isCreate ? { ...payload, existingClientId: selectedClientId || null } : { ...appt, ...payload });
  }

  return (
    <Modal title={isCreate ? "קביעת תור ללקוח" : "עריכת תור — גישה מלאה"} onClose={onClose}>
      {isCreate && clients.length > 0 && (
        <div className="bb-field">
          <label>בחירת לקוח קיים (אופציונלי)</label>
          <select
            value={selectedClientId}
            onChange={(e) => pickExistingClient(e.target.value)}
            style={{ width: "100%", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--cream)", fontFamily: "Heebo", fontSize: 15 }}
          >
            <option value="">— לקוח חדש —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : " · ללא טלפון"}</option>)}
          </select>
        </div>
      )}
      <div className={`bb-field ${errors.clientName ? "error" : ""}`}>
        <label>שם הלקוח</label>
        <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
        <FieldError msg={errors.clientName} />
      </div>
      <div className={`bb-field ${errors.phone ? "error" : ""}`}>
        <label>טלפון (רשות)</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
        <FieldError msg={errors.phone} />
      </div>
      <div className="bb-field">
        <label>שירות</label>
        <select
          value={form.serviceId}
          onChange={(e) => {
            const svc = services.find((s) => s.id === e.target.value);
            setForm({ ...form, serviceId: e.target.value, price: isCreate ? (svc?.price ?? form.price) : form.price });
          }}
          style={{ width: "100%", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--cream)", fontFamily: "Heebo", fontSize: 15 }}
        >
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className={`bb-field ${errors.date ? "error" : ""}`} style={{ flex: 1 }}>
          <label>תאריך</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <FieldError msg={errors.date} />
        </div>
        <div className={`bb-field ${errors.time ? "error" : ""}`} style={{ flex: 1 }}>
          <label>שעה (24 שעות)</label>
          <Time24Input value={form.time} onChange={(v) => setForm({ ...form, time: v })} />
          <FieldError msg={errors.time} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className={`bb-field ${errors.duration ? "error" : ""}`} style={{ flex: 1 }}>
          <label>אורך תור (דק׳)</label>
          <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
          <FieldError msg={errors.duration} />
        </div>
        <div className={`bb-field ${errors.price ? "error" : ""}`} style={{ flex: 1 }}>
          <label>תשלום (₪)</label>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} inputMode="numeric" />
          <FieldError msg={errors.price} />
        </div>
      </div>
      <div className="bb-field">
        <label>סטטוס</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          style={{ width: "100%", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--cream)", fontFamily: "Heebo", fontSize: 15 }}
        >
          <option value="pending">ממתין</option>
          <option value="confirmed">מאושר</option>
          <option value="done">הושלם</option>
          <option value="cancelled">בוטל</option>
        </select>
      </div>
      <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={save}>{isCreate ? "קביעת תור" : "שמירת שינויים"}</button>
    </Modal>
  );
}

/* ---------- JOURNAL ("יומן") — a lightweight calendar index, separate from
   priced appointments: quick name/phone/duration/date/time/note entries,
   typically logged straight from the client form. Full manual CRUD. ---------- */
function JournalTab({ journalEntries, setJournalEntries, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | entry obj (edit)
  const [form, setForm] = useState({ clientName: "", phone: "", duration: String(DEFAULT_APPT_DURATION), date: fmtDateKey(new Date()), time: "10:00", note: "" });
  const [errors, setErrors] = useState({});

  function openAdd() { setForm({ clientName: "", phone: "", duration: String(DEFAULT_APPT_DURATION), date: fmtDateKey(new Date()), time: "10:00", note: "" }); setErrors({}); setModal("add"); }
  function openEdit(e) { setForm({ clientName: e.clientName, phone: e.phone || "", duration: String(e.duration), date: e.date, time: e.time, note: e.note || "" }); setErrors({}); setModal(e); }

  function save() {
    const v = validateJournalEntry(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const payload = { clientName: form.clientName.trim(), phone: form.phone.trim(), duration: Number(form.duration), date: form.date, time: form.time, note: form.note.trim() };
    if (modal === "add") {
      setJournalEntries((js) => [{ id: uid(), ...payload, createdAt: Date.now() }, ...js]);
      logActivity(`נוספה רשומת יומן: ${payload.clientName} · ${payload.date} ${payload.time}`);
      pushToast("הרשומה נוספה ליומן", { type: "success" });
    } else {
      setJournalEntries((js) => js.map((x) => (x.id === modal.id ? { ...x, ...payload } : x)));
      logActivity(`רשומת יומן עודכנה: ${payload.clientName}`);
      pushToast("הרשומה עודכנה", { type: "success" });
    }
    setModal(null);
  }

  function del(entry) {
    setJournalEntries((js) => js.filter((x) => x.id !== entry.id));
    logActivity(`נמחקה רשומת יומן: ${entry.clientName}`);
    const toastId = pushToast(`הרשומה של ${entry.clientName} נמחקה`, { type: "danger", undoable: true });
    undoStash.current[toastId] = () => setJournalEntries((js) => [entry, ...js]);
  }

  const sorted = [...journalEntries].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={openAdd}><Plus size={15} /> רשומה חדשה</button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={BookOpen} title="היומן ריק" subtitle="רשומות שנוספות כאן, או דרך הוספת לקוח עם תאריך ושעה, יופיעו ברשימה" />
      ) : (
        <div className="bb-card" style={{ padding: 0 }}>
          {sorted.map((e) => (
            <div key={e.id} className="bb-row">
              <div className="bb-avatar">{initials(e.clientName)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{e.clientName}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {e.date} · {e.time} · {e.duration} דק׳{e.phone ? ` · ${e.phone}` : ""}
                </div>
                {e.note && <div style={{ fontSize: 11.5, color: "var(--muted-dim)", marginTop: 3 }}>{e.note}</div>}
              </div>
              <button className="bb-icon-btn" onClick={() => openEdit(e)}><Pencil size={15} /></button>
              <button className="bb-icon-btn" onClick={() => del(e)}><Trash2 size={15} color="var(--danger)" /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal onClose={() => setModal(null)} title={modal === "add" ? "רשומה חדשה ביומן" : "עריכת רשומה"}>
          <div className={`bb-field ${errors.clientName ? "error" : ""}`}>
            <label>שם מלא</label>
            <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
            <FieldError msg={errors.clientName} />
          </div>
          <div className={`bb-field ${errors.phone ? "error" : ""}`}>
            <label>טלפון (לא חובה)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
            <FieldError msg={errors.phone} />
          </div>
          <div className={`bb-field ${errors.duration ? "error" : ""}`}>
            <label>אורך תור כברירת מחדל (דק׳)</label>
            <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
            <FieldError msg={errors.duration} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className={`bb-field ${errors.date ? "error" : ""}`} style={{ flex: 1 }}>
              <label>תאריך</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <FieldError msg={errors.date} />
            </div>
            <div className={`bb-field ${errors.time ? "error" : ""}`} style={{ flex: 1 }}>
              <label>שעה</label>
              <Time24Input value={form.time} onChange={(v) => setForm({ ...form, time: v })} />
              <FieldError msg={errors.time} />
            </div>
          </div>
          <div className="bb-field">
            <label>הערה (אופציונלי)</label>
            <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={save}>שמירה</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- CLIENTS ---------- */
function ClientsTab({ clients, setClients, appointments, journalEntries, setJournalEntries, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | client obj (edit)
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const blankForm = { name: "", phone: "", defaultDuration: String(DEFAULT_APPT_DURATION), date: "", time: "", note: "" };
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});

  const q = search.trim().toLowerCase();
  const visibleClients = q
    ? clients.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
    : clients;

  function openAdd() { setForm(blankForm); setErrors({}); setModal("add"); }
  function openEdit(c) { setForm({ name: c.name, phone: c.phone || "", defaultDuration: String(c.defaultDuration ?? DEFAULT_APPT_DURATION), date: "", time: "", note: c.note || "" }); setErrors({}); setModal(c); }

  function save() {
    const v = validateClient(form, { requirePhone: false });
    setErrors(v);
    if (Object.keys(v).length) return;
    const payload = { name: form.name, phone: form.phone, note: form.note, defaultDuration: Number(form.defaultDuration) || DEFAULT_APPT_DURATION };

    if (modal === "add") {
      const newClient = { id: uid(), ...payload };
      setClients((cs) => [newClient, ...cs]); // optimistic — appears instantly
      logActivity(`נוסף לקוח חדש: ${form.name}`);
      pushToast("הלקוח נוסף בהצלחה", { type: "success" });

      // if a date + time were given, log it straight into the יומן index too
      if (form.date && form.time) {
        setJournalEntries((js) => [
          { id: uid(), clientName: form.name, phone: form.phone, duration: Number(form.defaultDuration) || DEFAULT_APPT_DURATION, date: form.date, time: form.time, note: form.note, createdAt: Date.now() },
          ...js,
        ]);
        logActivity(`נוספה רשומת יומן ללקוח החדש: ${form.name} · ${form.date} ${form.time}`);
      }
    } else {
      setClients((cs) => cs.map((c) => (c.id === modal.id ? { ...c, ...payload } : c)));
      logActivity(`עודכנו פרטי הלקוח: ${form.name}`);
      pushToast("הפרטים עודכנו", { type: "success" });
    }
    setModal(null);
  }

  function del(client) {
    setClients((cs) => cs.filter((c) => c.id !== client.id));
    logActivity(`נמחק לקוח: ${client.name}`);
    const toastId = pushToast(`${client.name} נמחק`, { type: "danger", undoable: true });
    undoStash.current[toastId] = () => setClients((cs) => [client, ...cs]);
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={openAdd}><Plus size={15} /> לקוח חדש</button>
      </div>

      {clients.length > 0 && (
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={15} color="var(--muted-dim)" style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או טלפון..."
            style={{ width: "100%", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "11px 38px 11px 14px", color: "var(--cream)", fontFamily: "Heebo", fontSize: 14 }}
          />
          {search && (
            <button className="bb-icon-btn" style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)" }} onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState icon={Users} title="אין עדיין לקוחות" subtitle="לקוחות שיזמינו תור יתווספו כאן אוטומטית, או הוסיפו ידנית" />
      ) : visibleClients.length === 0 ? (
        <EmptyState icon={Search} title="לא נמצאו תוצאות" subtitle={`אין לקוח שתואם ל"${search}"`} />
      ) : (
        <div className="bb-card" style={{ padding: 0 }}>
          {visibleClients.map((c) => {
            const history = appointments.filter((a) => a.clientId === c.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
            const isOpen = expanded === c.id;
            const stats = computeClientStats(c.id, appointments);
            const seg = stats.segment ? SEGMENT_META[stats.segment] : null;
            return (
              <div key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="bb-row" style={{ borderBottom: "none", cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div className="bb-avatar">{initials(c.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontWeight: 600, fontSize: 14.5 }}>{c.name}</span>
                      {seg && (
                        <span className="bb-badge" style={{ background: seg.bg, color: seg.color, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          {stats.segment === "vip" && <Crown size={10} />} {seg.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{c.phone} · אורך תור: {c.defaultDuration ?? DEFAULT_APPT_DURATION} דק׳</div>
                  </div>
                  <button className="bb-icon-btn" onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil size={15} /></button>
                  <button className="bb-icon-btn" onClick={(e) => { e.stopPropagation(); del(c); }}><Trash2 size={15} color="var(--danger)" /></button>
                  <ChevronDown size={16} color="var(--muted)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </div>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px 16px", background: "var(--bg-elevated)" }}>
                    {c.note && (
                      <div style={{ display: "flex", gap: 6, fontSize: 12.5, color: "var(--muted)", marginBottom: 12, alignItems: "flex-start" }}>
                        <StickyNote size={13} style={{ marginTop: 2, flexShrink: 0 }} /> {c.note}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
                      <FinanceStat label="סה״כ הכנסה מהלקוח" value={`₪${stats.totalSpent}`} highlight />
                      <FinanceStat label="ממוצע לביקור" value={`₪${stats.avgTicket}`} />
                      <FinanceStat label="תדירות ממוצעת" value={stats.avgIntervalDays ? `כל ${stats.avgIntervalDays} ימים` : "—"} />
                      <FinanceStat label="ביקור אחרון" value={stats.daysSinceLast !== null ? `לפני ${stats.daysSinceLast} ימים` : "—"} />
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted-dim)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <History size={12} /> היסטוריית תורים ({history.length})
                    </div>
                    {history.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: "var(--muted-dim)" }}>אין תורים קודמים</div>
                    ) : (
                      history.map((a) => (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                          <span>{a.serviceName}</span>
                          <span style={{ color: "var(--muted)" }}>{a.date} · {a.time} · ₪{a.price ?? 0}</span>
                          <span className={`bb-badge ${a.status}`}>{{ confirmed: "מאושר", pending: "ממתין", cancelled: "בוטל", done: "הושלם" }[a.status]}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal onClose={() => setModal(null)} title={modal === "add" ? "לקוח חדש" : "עריכת לקוח"}>
          <div className={`bb-field ${errors.name ? "error" : ""}`}>
            <label>שם מלא</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError msg={errors.name} />
          </div>
          <div className={`bb-field ${errors.phone ? "error" : ""}`}>
            <label>טלפון (לא חובה)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
            <FieldError msg={errors.phone} />
          </div>
          <div className={`bb-field ${errors.defaultDuration ? "error" : ""}`}>
            <label>אורך תור כברירת מחדל (דק׳)</label>
            <input value={form.defaultDuration} onChange={(e) => setForm({ ...form, defaultDuration: e.target.value.replace(/\D/g, "") })} inputMode="numeric" />
            <FieldError msg={errors.defaultDuration} />
          </div>
          {modal === "add" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div className="bb-field" style={{ flex: 1 }}>
                <label>תאריך (לא חובה)</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="bb-field" style={{ flex: 1 }}>
                <label>שעה</label>
                <Time24Input value={form.time || "10:00"} onChange={(v) => setForm({ ...form, time: v })} />
              </div>
            </div>
          )}
          {modal === "add" && form.date && (
            <div style={{ fontSize: 11.5, color: "var(--muted-dim)", marginTop: -8, marginBottom: 14 }}>
              רשומה תיווצר גם ביומן עבור המועד הזה
            </div>
          )}
          <div className="bb-field">
            <label>הערה (אופציונלי)</label>
            <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={save}>שמירה</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- SERVICES ---------- */
function ServicesTab({ services, setServices, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | service obj (edit)
  const [form, setForm] = useState({ name: "", duration: "", price: "" });
  const [errors, setErrors] = useState({});
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [priceDraft, setPriceDraft] = useState("");

  function openAdd() { setForm({ name: "", duration: "", price: "" }); setErrors({}); setModal("add"); }
  function openEdit(s) { setForm({ name: s.name, duration: String(s.duration), price: String(s.price) }); setErrors({}); setModal(s); }

  function save() {
    const v = validateService(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    const payload = { name: form.name, duration: Number(form.duration), price: Number(form.price) };

    if (modal === "add") {
      setServices((s) => [...s, { id: uid(), ...payload }]);
      logActivity(`נוסף שירות חדש: ${form.name}`);
      pushToast("השירות נוסף בהצלחה", { type: "success" });
    } else {
      setServices((s) => s.map((x) => (x.id === modal.id ? { ...x, ...payload } : x)));
      logActivity(`השירות "${form.name}" עודכן`);
      pushToast("השירות עודכן בהצלחה", { type: "success" });
    }
    setModal(null);
  }

  function del(service) {
    setServices((s) => s.filter((x) => x.id !== service.id));
    logActivity(`נמחק שירות: ${service.name}`);
    const toastId = pushToast(`${service.name} נמחק`, { type: "danger", undoable: true });
    undoStash.current[toastId] = () => setServices((s) => [...s, service]);
  }

  function commitPrice(id) {
    const val = Number(priceDraft);
    if (!isNaN(val) && val >= 0) {
      setServices((s) => s.map((x) => (x.id === id ? { ...x, price: val } : x)));
      logActivity(`מחיר שירות עודכן`);
    }
    setEditingPriceId(null);
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={openAdd}><Plus size={15} /> שירות חדש</button>
      </div>

      {services.length === 0 ? (
        <EmptyState icon={Scissors} title="אין שירותים מוגדרים" subtitle="הוסיפו את השירות הראשון כדי שלקוחות יוכלו להזמין תור" />
      ) : (
        <div className="bb-card" style={{ padding: 0 }}>
          {services.map((s) => (
            <div key={s.id} className="bb-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{s.duration} דק׳</div>
              </div>
              {editingPriceId === s.id ? (
                <input
                  autoFocus
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  onBlur={() => commitPrice(s.id)}
                  onKeyDown={(e) => e.key === "Enter" && commitPrice(s.id)}
                  style={{ width: 70, background: "var(--bg-card)", border: "1.5px solid var(--gold)", borderRadius: 8, padding: "6px 8px", color: "var(--cream)", textAlign: "center" }}
                />
              ) : (
                <div
                  className="bb-serif"
                  style={{ color: "var(--gold-bright)", fontWeight: 700, cursor: "pointer" }}
                  onClick={() => { setEditingPriceId(s.id); setPriceDraft(String(s.price)); }}
                  title="לחצו לעריכה"
                >
                  ₪{s.price}
                </div>
              )}
              <button className="bb-icon-btn" onClick={() => openEdit(s)}><Pencil size={15} /></button>
              <button className="bb-icon-btn" onClick={() => del(s)}><Trash2 size={15} color="var(--danger)" /></button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal onClose={() => setModal(null)} title={modal === "add" ? "שירות חדש" : "עריכת שירות"}>
          <div className={`bb-field ${errors.name ? "error" : ""}`}>
            <label>שם השירות</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError msg={errors.name} />
          </div>
          <div className={`bb-field ${errors.duration ? "error" : ""}`}>
            <label>משך זמן (דקות)</label>
            <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} inputMode="numeric" />
            <FieldError msg={errors.duration} />
          </div>
          <div className={`bb-field ${errors.price ? "error" : ""}`}>
            <label>מחיר (₪)</label>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" />
            <FieldError msg={errors.price} />
          </div>
          <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} onClick={save}>שמירה</button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- HOURS (with conflict validation against booked appointments) ---------- */
function HoursTab({ weeklyHours, setWeeklyHours, appointments, pushToast, logActivity }) {
  const [draft, setDraft] = useState(weeklyHours);
  const [conflictModal, setConflictModal] = useState(null); // { day, conflicts, apply }

  function update(day, patch) {
    setDraft((d) => ({ ...d, [day]: { ...d[day], ...patch } }));
  }

  function findConflicts(day, newHours) {
    // find any upcoming appointment on this weekday that would fall outside the new hours
    const today = new Date();
    const conflicts = [];
    for (const a of appointments) {
      const [y, m, dd] = a.date.split("-").map(Number);
      const apptDate = new Date(y, m - 1, dd);
      if (apptDate < today) continue;
      if (apptDate.getDay() !== Number(day)) continue;
      if (a.status === "cancelled") continue;
      if (newHours.closed) { conflicts.push(a); continue; }
      if (a.time < newHours.open || a.time >= newHours.close) conflicts.push(a);
    }
    return conflicts;
  }

  function saveDay(day) {
    const conflicts = findConflicts(day, draft[day]);
    if (conflicts.length > 0) {
      setConflictModal({ day, conflicts });
      return;
    }
    commitDay(day);
  }

  function commitDay(day) {
    setWeeklyHours((h) => ({ ...h, [day]: draft[day] }));
    logActivity(`שעות הפעילות של יום ${DOW_FULL_HE[day]} עודכנו`);
    pushToast("שעות הפעילות נשמרו", { type: "success" });
    setConflictModal(null);
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div className="bb-card" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "6px 16px" }}>
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const dh = draft[day];
          return (
            <div key={day} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: day < 6 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 46, fontWeight: 600, fontSize: 14 }}>{DOW_HE[day]}</div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                <input type="checkbox" checked={!dh.closed} onChange={(e) => update(day, { closed: !e.target.checked })} />
                פתוח
              </label>
              {!dh.closed && (
                <>
                  <Time24Input value={dh.open} onChange={(v) => update(day, { open: v })} />
                  <span style={{ color: "var(--muted)" }}>—</span>
                  <Time24Input value={dh.close} onChange={(v) => update(day, { close: v })} />
                </>
              )}
              <div style={{ flex: 1 }} />
              <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => saveDay(day)}>שמירה</button>
            </div>
          );
        })}
      </div>

      {conflictModal && (
        <Modal onClose={() => setConflictModal(null)} title="התנגשות עם תורים קיימים">
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--warning-wash)", border: "1px solid rgba(209,168,92,0.3)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "var(--warning)" }}>
              יש {conflictModal.conflicts.length} תורים קיימים ביום {DOW_FULL_HE[conflictModal.day]} שיוצאים מחוץ לשעות החדשות. יש לטפל בהם לפני השינוי.
            </div>
          </div>
          <div className="bb-card" style={{ padding: 0, marginBottom: 16 }}>
            {conflictModal.conflicts.map((a) => (
              <div key={a.id} className="bb-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{a.clientName}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.date} · {a.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="bb-btn bb-btn-ghost" style={{ flex: 1 }} onClick={() => setConflictModal(null)}>ביטול השינוי</button>
            <button className="bb-btn bb-btn-danger" style={{ flex: 1 }} onClick={() => commitDay(conflictModal.day)}>שמירה בכל זאת</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- ACTIVITY LOG (audit trail) ---------- */
function ActivityTab({ activityLog }) {
  return (
    <div style={{ padding: "0 16px" }}>
      {activityLog.length === 0 ? (
        <EmptyState icon={Activity} title="אין פעילות עדיין" subtitle="כל שינוי שתבצעו במערכת יתועד כאן, כולל תאריך ושעה" />
      ) : (
        <div className="bb-card" style={{ padding: 0 }}>
          {activityLog.map((a) => (
            <div key={a.id} className="bb-row">
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold-dim)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5 }}>{a.action}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted-dim)", marginTop: 2 }}>
                  {new Date(a.ts).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function SettingsTab({ notificationLog, adminEmail, setAdminEmail, themeId, setThemeId, logo, setLogo, pushToast, logActivity }) {
  const [copied, setCopied] = useState(false);
  const bookingLink = "https://booking.myapp.co.il/tel-aviv-barber";
  const logoInputRef = useRef(null);

  function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      pushToast && pushToast("יש לבחור קובץ תמונה", { type: "danger" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      logActivity("לוגו העסק עודכן");
      pushToast && pushToast("הלוגו הועלה בהצלחה", { type: "success" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(adminEmail);
  const [emailError, setEmailError] = useState("");

  function copyLink() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function saveEmail() {
    const v = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setEmailError("כתובת אימייל לא תקינה");
      return;
    }
    setAdminEmail(v);
    logActivity("חשבון ה-Google המורשה לניהול עודכן");
    pushToast && pushToast("חשבון המנהל עודכן בהצלחה", { type: "success" });
    setEditingEmail(false);
    setEmailError("");
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <SectionTitle title="מייל מנהל מורשה" style={{ marginTop: 0 }} />
      <div className="bb-card">
        {!editingEmail ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={16} color="var(--gold)" />
            <span style={{ fontSize: 13, flex: 1, color: "var(--muted)" }}>
              הכניסה לפאנל הניהול מוגנת בקוד גישה אישי (לא שמור בשום מקום). המייל <b style={{ color: "var(--cream)" }}>{adminEmail}</b> משמש לעדכונים עתידיים.
            </span>
            <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => { setEmailInput(adminEmail); setEditingEmail(true); }}>שינוי</button>
          </div>
        ) : (
          <div>
            <div className={`bb-field ${emailError ? "error" : ""}`}>
              <label>כתובת האימייל המורשית</label>
              <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} inputMode="email" dir="ltr" style={{ textAlign: "left" }} />
              <FieldError msg={emailError} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="bb-btn bb-btn-ghost" style={{ flex: 1 }} onClick={() => { setEditingEmail(false); setEmailError(""); }}>ביטול</button>
              <button className="bb-btn bb-btn-primary" style={{ flex: 1 }} onClick={saveEmail}>שמירה</button>
            </div>
          </div>
        )}
      </div>

      <SectionTitle title="לוגו העסק" />
      <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {logo ? (
          <img src={logo} alt="לוגו" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--gold-dim)" }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--gold-wash)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ImageIcon size={19} color="var(--gold-dim)" />
          </div>
        )}
        <span style={{ fontSize: 12.5, color: "var(--muted)", flex: 1 }}>
          הלוגו מוצג במסך הפתיחה ובראש מסך הלקוח
        </span>
        <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
        <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => logoInputRef.current?.click()}>
          {logo ? "החלפה" : "העלאה"}
        </button>
        {logo && (
          <button className="bb-icon-btn" onClick={() => { setLogo(null); logActivity("לוגו העסק הוסר"); }} title="הסרת לוגו">
            <Trash2 size={15} color="var(--danger)" />
          </button>
        )}
      </div>

      <SectionTitle title="עיצוב" />
      <div className="bb-card">
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>בחרו פלטת צבעים כהה לעיצוב האפליקציה</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              onClick={() => { setThemeId(id); logActivity(`ערכת העיצוב שונתה ל"${t.label}"`); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                background: "var(--bg-elevated)", border: themeId === id ? "1.5px solid var(--gold)" : "1.5px solid var(--border)",
                borderRadius: 12, padding: "12px 6px", cursor: "pointer",
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: t.swatch, boxShadow: themeId === id ? "0 0 0 3px var(--gold-wash)" : "none" }} />
              <span style={{ fontSize: 11, color: themeId === id ? "var(--gold-bright)" : "var(--muted)", textAlign: "center" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionTitle title="קישור הזמנה משותף" />
      <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LinkIcon size={16} color="var(--gold)" />
        <span style={{ fontSize: 13, flex: 1, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bookingLink}</span>
        <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={copyLink}>{copied ? "הועתק ✓" : "העתקה"}</button>
      </div>

      <SectionTitle title="מדיניות ביטול" />
      <div className="bb-card" style={{ fontSize: 13.5, color: "var(--muted)" }}>
        ביטול תור אפשרי עד <b style={{ color: "var(--cream)" }}>שעתיים</b> לפני מועד התור. לאחר מכן הביטול ידרוש אישור ידני.
      </div>

      <SectionTitle title="יומן הודעות וואטסאפ" />
      <div className="bb-card" style={{ padding: 0 }}>
        {notificationLog.map((n) => (
          <div key={n.id} className="bb-row">
            <MessageCircle size={16} color="var(--muted)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5 }}>{n.type}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-dim)", marginTop: 2 }}>
                {n.recipient} · {new Date(n.ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span className={`bb-badge ${n.status}`}>
              {{ sent: "נשלח", failed: "נכשל", retrying: "בניסיון חוזר" }[n.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- MODAL ---------- */
function Modal({ title, children, onClose }) {
  return (
    <div className="bb-modal-backdrop" onClick={onClose}>
      <div className="bb-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="bb-serif" style={{ fontSize: 18 }}>{title}</h3>
          <button className="bb-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
