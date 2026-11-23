import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Scissors, Calendar, Clock, User, Phone, Settings, Home, Users,
  Plus, Trash2, Pencil, Check, X, ChevronRight, ChevronLeft,
  AlertTriangle, RotateCcw, Activity, Bell, ShieldCheck, MessageCircle,
  TrendingUp, Server, DatabaseBackup, Loader2, ChevronDown, Link as LinkIcon,
  CircleDollarSign, CalendarClock, History, StickyNote, Lock,
  Wallet, Receipt, TrendingDown, Crown, BookOpen,
  Search, Download, CalendarDays, Timer, Image as ImageIcon, List,
  CheckCheck, Zap, ScanFace, Banknote, Undo2
} from "lucide-react";

import { usePersistentList, useSetting } from "../lib/usePersistentState";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

/* ---- privacy-aware server writes ----
   In client mode the app deliberately does NOT load other people's data
   (names/phones). These helpers perform the few targeted writes/lookups a
   client needs, directly against the server. No-ops in the prototype. */
async function remoteInsertRow(table, item) {
  if (!(isSupabaseConfigured && supabase)) return { ok: true };
  try {
    const { error } = await supabase.from(table).upsert({ id: item.id, data: item });
    if (error) console.error(`save failed on ${table}:`, error);
    // 23505 = unique violation -> the slot is already taken by another row
    if (error && (error.code === "23505" || /duplicate|unique/i.test(error.message || ""))) {
      return { ok: false, reason: "השעה הזו כבר תפוסה על ידי תור אחר" };
    }
    return error ? { ok: false, reason: error.message || "שגיאת שרת" } : { ok: true };
  } catch (e) {
    return { ok: false, reason: e?.message || "אין חיבור לרשת" };
  }
}

async function remoteSetAppointmentStatus(id, status) {
  if (!(isSupabaseConfigured && supabase)) return true;
  try {
    const { data } = await supabase.from("appointments").select("data").eq("id", id).maybeSingle();
    if (data?.data) await supabase.from("appointments").upsert({ id, data: { ...data.data, status } });
    return true;
  } catch (e) { return false; }
}

/* Secure server functions (supabase/security-step1.sql).
   Returns { missing: true } when the function isn't installed yet, so the app
   can fall back to the old direct writes until the SQL step has been run. */
async function remoteRpc(fn, args) {
  if (!(isSupabaseConfigured && supabase)) return { missing: true };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const notInstalled = error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message || "");
      return notInstalled ? { missing: true } : { ok: false, reason: error.message || "שגיאת שרת" };
    }
    return data || { ok: false, reason: "שגיאת שרת" };
  } catch (e) {
    return { ok: false, reason: e?.message || "אין חיבור לרשת" };
  }
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
  --muted-dim: #8C8274;
  --on-gold: #1a1509;
  --accent-2: #5AA9E6;
  --on-accent-2: #0B0A0D;
  --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70;
  --series-4: #c98500; --series-5: #d55181; --series-6: #0ca30c; --series-7: #9085e9;
  --exp-1: #E5675B; --exp-2: #B9473D; --exp-3: #F29A8F; --exp-4: #8E352E; --exp-5: #F6C3BC; --exp-6: #D4846F;
  --topbar-bg: rgba(11,10,13,0.92);
  --r-sm: 10px;
  --r-md: 12px;
  --r-lg: 16px;
  --tap: 40px;
  --success: #6FAE8B;
  --success-wash: rgba(111, 174, 139, 0.12);
  --danger: #C4695A;
  --danger-wash: rgba(196, 105, 90, 0.12);
  --warning: #E08F4A;
  --warning-wash: rgba(224, 143, 74, 0.13);

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
.bb-topbar { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--topbar-bg); backdrop-filter: blur(10px); z-index: 30; }
.bb-view-toggle { display: flex; gap: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-md); padding: 4px; }
.bb-view-toggle button { border: none; background: transparent; color: var(--muted); font-family: 'Heebo'; font-size: 13.5px; padding: 8px 14px; min-height: 36px; border-radius: var(--r-sm); cursor: pointer; transition: all .15s; }
.bb-view-toggle button.active { background: var(--gold); color: var(--on-gold); font-weight: 600; }

/* ---------- buttons ---------- */
.bb-btn { font-family: 'Heebo'; font-weight: 600; font-size: 15px; border-radius: var(--r-md); min-height: 44px; padding: 14px 20px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform .12s, opacity .12s, background .15s; }
.bb-btn:active { transform: scale(0.97); }
.bb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bb-btn-primary { background: linear-gradient(135deg, var(--gold-bright), var(--gold)); color: var(--on-gold); }
.bb-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.bb-btn-ghost { background: var(--bg-card); color: var(--cream); border: 1px solid var(--border-light); }
.bb-btn-ghost:hover { background: var(--bg-hover); }
.bb-btn-danger { background: var(--danger-wash); color: var(--danger); border: 1px solid rgba(196,105,90,0.3); }
.bb-btn-sm { padding: 8px 14px; font-size: 13.5px; border-radius: var(--r-sm); min-height: var(--tap); }
.bb-icon-btn { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: var(--r-sm); min-width: var(--tap); min-height: var(--tap); display: flex; align-items: center; justify-content: center; transition: all .15s; }
.bb-icon-btn:hover { background: var(--bg-hover); color: var(--cream); }

/* ---------- sticky CTA bar (mobile booking flow) ---------- */
.bb-sticky-cta { position: sticky; bottom: 0; left: 0; right: 0; padding: 14px 20px calc(14px + env(safe-area-inset-bottom)); background: linear-gradient(to top, var(--bg) 60%, transparent); border-top: 1px solid var(--border); backdrop-filter: blur(8px); z-index: 20; }

/* ---------- cards & lists ---------- */
.bb-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px; }
.bb-service-card { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--r-lg); padding: 16px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
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
.bb-slot { border-radius: var(--r-md); padding: 12px 6px; text-align: center; font-size: 14px; font-weight: 500; border: 1.5px solid var(--border); background: var(--bg-card); color: var(--cream); cursor: pointer; position: relative; transition: all .15s; }
.bb-slot.past { color: var(--muted-dim); text-decoration: line-through; cursor: not-allowed; opacity: 0.4; border-color: var(--border); }
.bb-slot.booked { color: var(--muted-dim); text-decoration: line-through; cursor: not-allowed; background: transparent; border-style: dashed; }
.bb-slot.recommended { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
.bb-slot.recommended::after { content: 'הכי קרוב'; position: absolute; top: -9px; right: 50%; transform: translateX(50%); background: var(--gold); color: var(--on-gold); font-size: 9px; padding: 2px 6px; border-radius: 6px; font-weight: 700; white-space: nowrap; }
.bb-slot.selected { background: var(--gold); border-color: var(--gold); color: var(--on-gold); font-weight: 700; }

/* ---------- date strip ---------- */
.bb-date-strip { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 12px; scrollbar-width: none; }
.bb-date-strip::-webkit-scrollbar { display: none; }
.bb-date-chip { min-width: 58px; flex-shrink: 0; text-align: center; padding: 10px 4px; border-radius: var(--r-md); border: 1.5px solid var(--border); background: var(--bg-card); cursor: pointer; transition: all .15s; }
.bb-date-chip .dow { font-size: 12px; color: var(--muted); }
.bb-date-chip .dnum { font-family: 'Frank Ruhl Libre'; font-size: 18px; font-weight: 700; margin-top: 2px; }
.bb-date-chip.selected { background: var(--gold); border-color: var(--gold); }
.bb-date-chip.selected .dow, .bb-date-chip.selected .dnum { color: var(--on-gold); }

/* ---------- form fields ---------- */
.bb-field { margin-bottom: 16px; }
.bb-field label { display: block; font-size: 13.5px; color: var(--muted); margin-bottom: 6px; }
.bb-field input, .bb-field textarea { width: 100%; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--r-md); padding: 12px 14px; color: var(--cream); font-family: 'Heebo'; font-size: 16px; transition: border-color .15s; }
.bb-field input:focus, .bb-field textarea:focus { outline: none; border-color: var(--gold); }
.bb-field.error input { border-color: var(--danger); }
.bb-field .err-msg { color: var(--danger); font-size: 12px; margin-top: 5px; display: flex; align-items: center; gap: 4px; }
.bb-honeypot { position: absolute; left: -9999px; opacity: 0; height: 0; width: 0; pointer-events: none; }

/* ---------- toasts ---------- */
.bb-toast-wrap { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; flex-direction: column; gap: 8px; width: calc(100% - 40px); max-width: 440px; }
@keyframes bb-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.bb-toast { animation: bb-toast-in .25s ease; background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
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
.bb-admin-tab { display: flex; align-items: center; gap: 6px; padding: 8px 14px; min-height: var(--tap); border-radius: var(--r-sm); background: transparent; border: none; color: var(--muted); font-family: 'Heebo'; font-size: 14.5px; cursor: pointer; white-space: nowrap; transition: all .15s; }
.bb-admin-tab.active { background: var(--gold-wash); color: var(--gold-bright); font-weight: 600; }
.bb-wk-col { container-type: inline-size; }
@container (max-width: 74px) { .bb-wk-time { display: none; } }
.bb-admin-tab.accent { color: var(--accent-2); font-weight: 700; box-shadow: inset 0 0 0 1.5px var(--accent-2); margin: 0 2px; }
.bb-admin-tab.accent.active { background: var(--accent-2); color: var(--on-accent-2); box-shadow: none; }
.bb-tab-count { background: var(--warning); color: var(--on-gold); border-radius: 10px; font-size: 11.5px; font-weight: 800; min-width: 20px; height: 20px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: center; }
.bb-pay-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--border); min-height: 68px; }
.bb-pay-row:last-child { border-bottom: none; }
.bb-pay-amount { display: flex; align-items: center; gap: 2px; background: var(--bg-elevated); border: 1.5px solid var(--border); border-radius: var(--r-sm); padding: 0 8px; height: 44px; }
.bb-pay-amount:focus-within { border-color: var(--gold); }
.bb-pay-amount input { width: 56px; background: transparent; border: none; outline: none; color: var(--cream); font-family: 'Heebo'; font-size: 17px; font-weight: 700; text-align: center; direction: ltr; }
.bb-pay-v { width: 48px; height: 44px; border-radius: var(--r-sm); border: none; background: var(--success); color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: transform .1s; }
.bb-pay-v:active { transform: scale(0.92); }
.bb-admin-tab:hover:not(.active) { background: var(--bg-card); color: var(--cream); }

/* ---------- dashboard summary cards ---------- */
.bb-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 16px; }
.bb-summary-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px 12px; }
.bb-summary-card .label { font-size: 12.5px; color: var(--muted); margin-bottom: 6px; }
.bb-summary-card .value { font-family: 'Frank Ruhl Libre'; font-size: 22px; font-weight: 700; color: var(--gold-bright); }

/* ---------- generic table-ish rows ---------- */
.bb-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border); gap: 12px; min-height: 64px; }
@media (max-width: 440px) {
  .bb-client-row { gap: 6px; padding: 12px 10px 12px 6px; }
  .bb-client-row .bb-avatar { display: none; }
  .bb-client-row .bb-icon-btn { min-width: 34px; }
  .bb-row[class*="st-"] { gap: 8px; padding: 12px 12px 12px 8px; }
  .bb-row[class*="st-"] .bb-avatar { display: none; }
  .bb-row[class*="st-"] .bb-icon-btn { min-width: 36px; }
}
.bb-row.st-confirmed { box-shadow: inset -3px 0 0 var(--success); }
.bb-row.st-pending { box-shadow: inset -3px 0 0 var(--warning); }
.bb-row.st-done { box-shadow: inset -3px 0 0 var(--gold); }
.bb-row.st-cancelled { box-shadow: inset -3px 0 0 var(--danger); opacity: 0.6; }
.bb-status-select { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--r-sm); color: var(--cream); font-family: 'Heebo'; font-size: 13px; font-weight: 600; padding: 8px 10px; min-height: var(--tap); }
.bb-status-select.st-confirmed { color: var(--success); border-color: var(--success-wash); background: var(--success-wash); }
.bb-status-select.st-pending { color: var(--warning); border-color: var(--warning-wash); background: var(--warning-wash); }
.bb-status-select.st-done { color: var(--gold-bright); border-color: var(--gold-wash); background: var(--gold-wash); }
.bb-status-select.st-cancelled { color: var(--danger); border-color: var(--danger-wash); background: var(--danger-wash); }
.bb-row:last-child { border-bottom: none; }
.bb-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--gold-wash); color: var(--gold-bright); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }

.bb-badge { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
.bb-badge::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.bb-badge.confirmed { background: var(--success-wash); color: var(--success); }
.bb-badge.pending { background: var(--warning-wash); color: var(--warning); }
.bb-badge.cancelled { background: var(--danger-wash); color: var(--danger); }
.bb-badge.done { background: var(--gold-wash); color: var(--gold-bright); }
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
.bb-root :focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.bb-root button:focus:not(:focus-visible) { outline: none; }
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

// default date for a new admin-created appointment:
// Sat/Sun/Mon -> upcoming Tuesday; Tue/Wed/Thu/Fri -> upcoming Friday
function defaultWorkDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun ... 5=Fri, 6=Sat
  const target = day === 6 || day === 0 || day === 1 ? 2 : 5;
  d.setDate(d.getDate() + ((target - day + 7) % 7));
  return d;
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

const SLOT_MINUTES = 20; // booking grid for clients — every 20 minutes

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
    cur += SLOT_MINUTES;
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
        <span style={{ fontSize: 12, color: "var(--muted-dim)" }}>שעות</span>
      </div>
      <span style={{ color: "var(--muted)", marginBottom: 14 }}>:</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <select value={m || "00"} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} style={timeSelectStyle}>
          {TIME24_MINUTES.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "var(--muted-dim)" }}>דקות</span>
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
  marble: {
    label: "שיש ופליז (בהיר)",
    swatch: "linear-gradient(135deg, #F4F0E8 50%, #9A7330 50%)",
    vars: {
      "--bg": "#F4F0E8", "--bg-elevated": "#FBF9F4", "--bg-card": "#FFFFFF", "--bg-hover": "#EFE9DE",
      "--border": "#E2DACB", "--border-light": "#D3C8B4",
      "--gold": "#9A7330", "--gold-bright": "#7A5A1C", "--gold-dim": "#C2A56B",
      "--gold-wash": "rgba(154, 115, 48, 0.1)", "--cream": "#1E1A14",
      "--muted": "#635A4D", "--muted-dim": "#7A7062",
      "--success": "#2E7A52", "--success-wash": "rgba(46, 122, 82, 0.1)",
      "--danger": "#B0463A", "--danger-wash": "rgba(176, 70, 58, 0.09)",
      "--warning": "#A85A14", "--warning-wash": "rgba(168, 90, 20, 0.1)",
      "--on-gold": "#FFFFFF", "--topbar-bg": "rgba(244, 240, 232, 0.92)",
      "--accent-2": "#1F6FB2", "--on-accent-2": "#FFFFFF",
      "--series-1": "#2a78d6", "--series-2": "#eb6834", "--series-3": "#1baf7a",
      "--series-4": "#eda100", "--series-5": "#e87ba4", "--series-6": "#008300", "--series-7": "#6250d6",
      "--exp-1": "#C8443A", "--exp-2": "#8F2C25", "--exp-3": "#E58A80", "--exp-4": "#6B211C", "--exp-5": "#F0B4AC", "--exp-6": "#B8644F",
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
  forest: {
    label: "ירוק יער וקרם",
    swatch: "linear-gradient(135deg, #173026 50%, #C9A25A 50%)",
    vars: {
      "--bg": "#0F211A", "--bg-elevated": "#142A21", "--bg-card": "#173026", "--bg-hover": "#1D3A2E",
      "--border": "#244236", "--border-light": "#2F5143",
      "--gold": "#C9A25A", "--gold-bright": "#E4C688", "--gold-dim": "#8C7340",
      "--gold-wash": "rgba(201, 162, 90, 0.12)", "--cream": "#EFE7D6",
      "--muted": "#A9B5A6", "--muted-dim": "#87958A",
      "--on-gold": "#1A1509", "--topbar-bg": "rgba(15, 33, 26, 0.92)",
    },
  },
  barber: {
    label: "ברבר קלאסי (בהיר)",
    swatch: "linear-gradient(135deg, #F2EBDD 33%, #8B1E1E 33% 66%, #1F3A5F 66%)",
    vars: {
      "--bg": "#F2EBDD", "--bg-elevated": "#F8F3E9", "--bg-card": "#FFFDF8", "--bg-hover": "#EBE2D1",
      "--border": "#E0D6C3", "--border-light": "#CFC2AA",
      "--gold": "#8B1E1E", "--gold-bright": "#6E1414", "--gold-dim": "#B86A6A",
      "--gold-wash": "rgba(139, 30, 30, 0.08)", "--cream": "#1C1C1C",
      "--muted": "#5E574C", "--muted-dim": "#776F62",
      "--success": "#2E6B4A", "--success-wash": "rgba(46, 107, 74, 0.1)",
      "--danger": "#A32626", "--danger-wash": "rgba(163, 38, 38, 0.08)",
      "--warning": "#A0601A", "--warning-wash": "rgba(160, 96, 26, 0.1)",
      "--on-gold": "#FFFFFF", "--topbar-bg": "rgba(242, 235, 221, 0.92)",
      "--accent-2": "#1F3A5F", "--on-accent-2": "#FFFFFF",
      "--series-1": "#2a78d6", "--series-2": "#eb6834", "--series-3": "#1baf7a",
      "--series-4": "#eda100", "--series-5": "#e87ba4", "--series-6": "#008300", "--series-7": "#6250d6",
      "--exp-1": "#C8443A", "--exp-2": "#8F2C25", "--exp-3": "#E58A80", "--exp-4": "#6B211C", "--exp-5": "#F0B4AC", "--exp-6": "#B8644F",
    },
  },
  leather: {
    label: "עור וקוניאק",
    swatch: "linear-gradient(135deg, #241911 50%, #C9782F 50%)",
    vars: {
      "--bg": "#17100B", "--bg-elevated": "#1E150E", "--bg-card": "#241911", "--bg-hover": "#2E2016",
      "--border": "#35261A", "--border-light": "#453222",
      "--gold": "#C9782F", "--gold-bright": "#E6A05C", "--gold-dim": "#8A5222",
      "--gold-wash": "rgba(201, 120, 47, 0.12)", "--cream": "#F4E9DC",
      "--muted": "#B9A491", "--muted-dim": "#94806E",
      "--on-gold": "#1A0E05", "--topbar-bg": "rgba(23, 16, 11, 0.92)",
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
            style={{ marginTop: 8, background: "linear-gradient(135deg, #E3C480, #C6A15B)", color: "var(--on-gold)", border: "none", borderRadius: 12, padding: "13px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "Heebo" }}
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
  const ADMIN_EMAIL_DEFAULT = ""; // set in Settings (stored in the database), never hard-coded in the public code
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
  const [appointments, setAppointments] = usePersistentList("appointments", [], adminUnlocked ? {} : {
    publicFields: "id,date,time,status,duration,serviceName,price",
    source: "appointment_slots",           // secure view: no names / phones
    fallbackFields: APPT_PUBLIC_FIELDS,    // until security-step1.sql is run
  });
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
  const adminRef = useRef(false);
  const logActivity = useCallback((action, opts = {}) => {
    const entry = { id: uid(), ts: Date.now(), action };
    setActivityLog((log) => [entry, ...log].slice(0, 50));
    if (adminRef.current || opts.forceRemote) remoteInsertRow("activity_log", entry);
  }, []);

  /* pushes an event into the admin's Facebook-style notification feed */
  const notifyAdmin = useCallback((type, payload = {}, opts = {}) => {
    const notif = { id: uid(), ts: Date.now(), type, read: false, handled: false, ...payload };
    setAdminNotifications((ns) => [notif, ...ns].slice(0, 100));
    if (adminRef.current || opts.forceRemote) remoteInsertRow("admin_notifications", notif); // reaches the admin's device via realtime
  }, []);

  function requestAdminAccess() {
    setGoogleSignInOpen(true);
  }

  const [serverLoginOpen, setServerLoginOpen] = useState(false);

  function finishAdminUnlock() {
    adminRef.current = true;
    setAdminUnlocked(true);
    setGoogleSignInOpen(false);
    setServerLoginOpen(false);
    setView("admin");
    logActivity("מנהל נכנס");
  }

  // after the PIN / Face ID: make sure there is a real server session
  // (stays saved on this phone, so the password is needed only once)
  async function handleGoogleSuccess() {
    if (!(isSupabaseConfigured && supabase)) { finishAdminUnlock(); return; }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session) { finishAdminUnlock(); return; }
      // security SQL not installed yet -> keep the old PIN-only entry working
      const { error } = await supabase.rpc("is_admin");
      if (error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message || ""))) {
        finishAdminUnlock();
        return;
      }
    } catch (e) { /* fall through to login */ }
    setGoogleSignInOpen(false);
    setServerLoginOpen(true);
  }

  function lockAdmin() {
    adminRef.current = false;
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
      {serverLoginOpen && (
        <AdminServerLogin defaultEmail={adminEmail} onSuccess={finishAdminUnlock} onClose={() => setServerLoginOpen(false)} />
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

/* ---------- Face ID / fingerprint unlock (WebAuthn passkey on this device) ----------
   Uses the phone's own biometric check (Face ID on iPhone, fingerprint/face on Android).
   Nothing biometric ever leaves the phone; we only keep the passkey's id on this device.
   The 4-digit code always keeps working as the fallback. */
const BIO_KEY = "bb_admin_passkey_id";

function b64urlFromBuf(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bufFromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function getSavedPasskey() {
  try { return window.localStorage.getItem(BIO_KEY); } catch (e) { return null; }
}
async function biometricSupported() {
  try {
    return !!(window.PublicKeyCredential && window.isSecureContext &&
      (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()));
  } catch (e) { return false; }
}
async function registerBiometric() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Barber Admin", id: window.location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "admin", displayName: "מנהל המספרה" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
      timeout: 60000,
    },
  });
  if (!cred) throw new Error("no credential");
  try { window.localStorage.setItem(BIO_KEY, b64urlFromBuf(cred.rawId)); } catch (e) {}
  return true;
}
async function verifyBiometric() {
  const id = getSavedPasskey();
  if (!id) return false;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: bufFromB64url(id) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  // the authenticator sets the "user verified" flag only after Face ID / fingerprint passed
  const flags = new Uint8Array(assertion.response.authenticatorData)[32];
  return !!(flags & 0x04);
}

/* One-time server login (Supabase Auth). The database only opens its
   private tables to this signed-in admin — the PIN/Face ID alone can't. */
function AdminServerLogin({ defaultEmail, onSuccess, onClose }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e && e.preventDefault();
    if (!email.trim() || !password) { setErr("נא למלא מייל וסיסמה"); return; }
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setErr(/invalid/i.test(error.message) ? "מייל או סיסמה שגויים" : error.message);
        setBusy(false);
        return;
      }
      const chk = await supabase.rpc("is_admin");
      if (!chk.error && chk.data === false) {
        await supabase.auth.signOut();
        setErr("המשתמש הזה לא מוגדר כמנהל");
        setBusy(false);
        return;
      }
      vibrate(15);
      onSuccess();
    } catch (e2) {
      setErr("אין חיבור לשרת");
      setBusy(false);
    }
  }

  return (
    <div className="bb-modal-backdrop" style={{ alignItems: "center" }} onClick={onClose}>
      <form className="bb-modal" style={{ borderRadius: 20, maxWidth: 360 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--gold-wash)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={22} color="var(--gold-bright)" />
          </div>
        </div>
        <h3 className="bb-serif" style={{ fontSize: 17, marginBottom: 4, textAlign: "center" }}>חיבור מאובטח לשרת</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18, textAlign: "center", lineHeight: 1.6 }}>
          פעם אחת בכל טלפון. אחרי זה מספיק הקוד או זיהוי הפנים.
        </p>
        <div className="bb-field">
          <label>מייל</label>
          <input type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="bb-field">
          <label>סיסמה</label>
          <input type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        {err && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</div>}
        <button type="submit" className="bb-btn bb-btn-primary" style={{ width: "100%", marginBottom: 8 }} disabled={busy}>
          {busy ? "מתחבר..." : "כניסה"}
        </button>
        <button type="button" className="bb-btn bb-btn-ghost" style={{ width: "100%" }} onClick={onClose}>ביטול</button>
      </form>
    </div>
  );
}

function PinGate({ onSuccess, onClose }) {
  const [entered, setEntered] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [offerBio, setOfferBio] = useState(false); // after a correct code: "use Face ID next time?"
  const [bioError, setBioError] = useState("");

  useEffect(() => {
    let alive = true;
    biometricSupported().then((ok) => { if (alive) { setBioAvailable(ok); setBioSaved(ok && !!getSavedPasskey()); } });
    return () => { alive = false; };
  }, []);

  // the saved Face ID may be gone (other browser, cleared, new phone):
  // forget it, so after the code the app offers to set it up again
  function forgetBiometric(msg) {
    try { window.localStorage.removeItem(BIO_KEY); } catch (e) {}
    setBioSaved(false);
    setBioError(msg);
  }

  async function tryBiometric() {
    setBioError("");
    try {
      if (await verifyBiometric()) { vibrate(15); onSuccess(); return; }
      forgetBiometric("הזיהוי לא הצליח. הכניסו את הקוד, ונפעיל זיהוי פנים מחדש");
    } catch (e) {
      forgetBiometric("זיהוי הפנים לא נמצא בטלפון הזה. הכניסו את הקוד, ונפעיל אותו מחדש");
    }
  }

  async function enableBiometric() {
    setBioError("");
    try {
      await registerBiometric();
      vibrate(15);
      onSuccess();
    } catch (e) {
      setBioError("לא הצלחנו להפעיל זיהוי — נכנסים עם הקוד");
      setTimeout(onSuccess, 1200);
    }
  }

  async function tryVerify(pin) {
    setChecking(true);
    let hex = "";
    try { hex = await sha256Hex(pin); } catch (e) { /* non-secure context */ }
    setChecking(false);
    if (hex === ADMIN_PIN_HASH) {
      vibrate(15);
      if (bioAvailable && !bioSaved) { setOfferBio(true); return; }
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
        {offerBio ? (
          <>
            <h3 className="bb-serif" style={{ fontSize: 17, marginBottom: 6 }}>להיכנס בפעם הבאה עם זיהוי פנים?</h3>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 18, lineHeight: 1.6 }}>
              Face ID באייפון, או טביעת אצבע / זיהוי פנים באנדרואיד.<br />הקוד ימשיך לעבוד תמיד.
            </p>
            <button className="bb-btn bb-btn-primary" style={{ width: "100%", marginBottom: 8 }} onClick={enableBiometric}>
              <ScanFace size={18} /> כן, הפעל זיהוי
            </button>
            <button className="bb-btn bb-btn-ghost" style={{ width: "100%" }} onClick={onSuccess}>לא עכשיו</button>
            {bioError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{bioError}</div>}
          </>
        ) : (
        <>
        <h3 className="bb-serif" style={{ fontSize: 17, marginBottom: 4 }}>כניסת מנהל</h3>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: bioSaved ? 12 : 20 }}>הזינו את קוד הגישה</p>

        {bioSaved && (
          <>
            <button className="bb-btn bb-btn-primary" style={{ width: "100%", marginBottom: 6 }} onClick={tryBiometric}>
              <ScanFace size={18} /> כניסה עם זיהוי פנים
            </button>
            <button className="bb-btn bb-btn-ghost bb-btn-sm" style={{ width: "100%", marginBottom: 12, fontSize: 12.5 }}
              onClick={() => forgetBiometric("הכניסו את הקוד, ונפעיל זיהוי פנים מחדש בטלפון הזה")}>
              זיהוי הפנים לא עובד? הפעלה מחדש
            </button>
          </>
        )}
        {bioError && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: -8, marginBottom: 12 }}>{bioError}</div>}

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
        </>
        )}
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
  const [cancelTokens, setCancelTokens] = useState({});
  const [bookedDebt, setBookedDebt] = useState(null); // { amount, count } returned by the server after booking // id -> secret token, lets this client (only) cancel their own booking
  const [myApptsOpen, setMyApptsOpen] = useState(false);
  const [step, setStep] = useState(2); // service step skipped: 2 datetime, 3 details, 4 confirm, 5 success
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

  // only days the shop is open (closed days are hidden, not greyed out)
  const days = useMemo(
    () => nextNDays(28).filter((d) => !weeklyHours?.[d.getDay()]?.closed).slice(0, 10),
    [weeklyHours]
  );

  // the only service clients book is "תספורת גבר" — picked automatically
  const defaultService = useMemo(
    () => services.find((s) => (s.name || "").trim() === "תספורת גבר") || services[0] || null,
    [services]
  );
  useEffect(() => {
    if (!selectedService && defaultService) setSelectedService(defaultService);
  }, [defaultService, selectedService]);

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
    const dayAppts = appointments.filter((a) => a.date === key && a.status !== "cancelled");
    const taken = new Set(dayAppts.map((a) => a.time));
    slotsForDay.forEach((slot) => {
      const sMin = timeToMinutes(slot);
      const eMin = sMin + SLOT_MINUTES;
      if (dayAppts.some((a) => {
        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + (a.duration || DEFAULT_APPT_DURATION);
        return aStart < eMin && aEnd > sMin;
      })) taken.add(slot);
    });
    return taken;
  }, [appointments, selectedDate, slotsForDay]);

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

  // earliest free 20-min slot across the upcoming working days
  const nearestFree = useMemo(() => {
    const nowD = new Date();
    const nowKey = fmtDateKey(nowD);
    const nowMin = nowD.getHours() * 60 + nowD.getMinutes();
    for (const d of days) {
      const h = weeklyHours?.[d.getDay()];
      if (!h || h.closed) continue;
      const key = fmtDateKey(d);
      const dayAppts = appointments.filter((a) => a.date === key && a.status !== "cancelled");
      for (const slot of genSlots(h.open, h.close)) {
        const sMin = timeToMinutes(slot);
        if (key === nowKey && sMin <= nowMin) continue;
        const taken = dayAppts.some((a) => {
          const aStart = timeToMinutes(a.time);
          return aStart < sMin + SLOT_MINUTES && aStart + (a.duration || DEFAULT_APPT_DURATION) > sMin;
        });
        if (!taken) return { date: d, time: slot };
      }
    }
    return null;
  }, [days, weeklyHours, appointments]);

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
      const selMin = timeToMinutes(selectedTime);
      const clash = appointments.some((a) => {
        if (a.date !== dateKey || a.status === "cancelled") return false;
        const aStart = timeToMinutes(a.time);
        const aEnd = aStart + (a.duration || DEFAULT_APPT_DURATION);
        return aStart < selMin + SLOT_MINUTES && aEnd > selMin;
      });
      if (clash) {
        setSubmitting(false);
        setConflict("התור הזה נתפס הרגע על ידי לקוח אחר. בחרו שעה פנויה אחרת.");
        return;
      }

      // secure path: one closed server function validates, checks overlaps,
      // creates the client + appointment and notifies the admin
      const rpc = await remoteRpc("request_booking", {
        p_name: name, p_phone: phone || "", p_date: dateKey, p_time: selectedTime, p_service_id: selectedService.id,
      });
      if (!rpc.missing) {
        if (!rpc.ok) {
          setSubmitting(false);
          setConflict(rpc.reason === "taken" ? "התור הזה נתפס הרגע על ידי לקוח אחר. בחרו שעה פנויה אחרת." : rpc.reason);
          return;
        }
        const appt = rpc.appointment;
        setAppointments((a) => [...a, appt]);
        setMyBookingIds((ids) => [...ids, appt.id]);
        setCancelTokens((t) => ({ ...t, [appt.id]: appt.cancelToken }));
        setBookedDebt(rpc.debt && Number(rpc.debt.amount) > 0 ? { amount: Number(rpc.debt.amount), count: Number(rpc.debt.count) || 0 } : null);
        vibrate([16, 40, 24]);
        setBookedAppt(appt);
        setSubmitting(false);
        setStep(5);
        if (phone) {
          setWhatsappStatus("sending");
          setTimeout(() => setWhatsappStatus("sent"), 1400);
        } else {
          setWhatsappStatus("no_phone");
        }
        return;
      }

      // legacy path (until security-step1.sql is run)
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
      logActivity(`התקבלה בקשת תור: ${name} · ${selectedService.name} · ${dateKey} ${selectedTime}`, { forceRemote: true });
      notifyAdmin && notifyAdmin("new_booking", {
        apptId: appt.id,
        clientName: name,
        serviceName: selectedService.name,
        date: dateKey,
        time: selectedTime,
        phone: phone || "",
      }, { forceRemote: true });
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
    setBookedDebt(null);
    setStep(2);
    setSelectedService(defaultService);
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
        {step === 2 && (
          <button className="bb-icon-btn" onClick={onBackToLanding} title="חזרה למסך הפתיחה">
            <ChevronRight size={20} className="bb-rtl-flip" />
          </button>
        )}
        <div
          className="bb-serif"
          style={{ fontSize: 17, fontWeight: 700, color: "var(--gold-bright)", flex: 1, textAlign: step === 2 ? "center" : "start", display: "flex", alignItems: "center", justifyContent: step === 2 ? "center" : "flex-start", gap: 8 }}
        >
          {logo && <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }} />}
          {businessName}
        </div>
        {step > 2 && step < 5 && (
          <button className="bb-icon-btn" onClick={() => goStep(step - 1)}>
            <ChevronRight size={20} className="bb-rtl-flip" />
          </button>
        )}
        {step === 2 && (
          <button className="bb-icon-btn" onClick={() => setMyApptsOpen(true)} title="התור שלי" style={{ position: "relative" }}>
            <CalendarClock size={19} />
            {myActiveCount > 0 && (
              <span style={{ position: "absolute", top: 0, left: 0, background: "var(--gold)", color: "var(--on-gold)", fontSize: 12, fontWeight: 700, borderRadius: 10, minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
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
            {[2, 3, 4].map((n) => (
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

            {nearestFree && (
              <button
                className="bb-card"
                onClick={() => { setSelectedDate(nearestFree.date); setSelectedTime(nearestFree.time); goStep(3); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, marginBottom: 16, border: "1.5px solid var(--gold)", background: "var(--gold-wash)", cursor: "pointer", textAlign: "start", font: "inherit", color: "inherit" }}
              >
                <Zap size={20} color="var(--gold-bright)" />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12, color: "var(--gold-bright)", fontWeight: 600 }}>התור הפנוי הקרוב</span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15.5 }}>
                    {DOW_FULL_HE[nearestFree.date.getDay()]} {nearestFree.date.getDate()}/{nearestFree.date.getMonth() + 1} · <span className="bb-mono-num">{nearestFree.time}</span>
                  </span>
                </span>
                <ChevronLeft size={18} className="bb-rtl-flip" color="var(--gold-bright)" />
              </button>
            )}

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
                <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: 5 }}>
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--warning-wash)", border: "1px solid var(--warning-wash)", borderRadius: 20, padding: "6px 14px", marginBottom: 20 }}>
              <Clock size={13} color="var(--warning)" />
              <span style={{ fontSize: 12.5, color: "var(--warning)", fontWeight: 600 }}>ממתין לאישור המספרה</span>
            </div>
            <p style={{ color: "var(--muted-dim)", fontSize: 12, marginBottom: 18, lineHeight: 1.7 }}>
              המספרה תאשר את התור בהקדם. ניתן לעקוב אחרי הסטטוס ב"התור שלי".
            </p>

            {bookedDebt && (
              <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, background: "var(--warning-wash)", borderColor: "var(--warning)", textAlign: "start" }}>
                <Banknote size={22} color="var(--warning)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    יתרה לתשלום: <span className="bb-mono-num">₪{bookedDebt.amount.toLocaleString("he-IL")}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                    {bookedDebt.count === 1 ? "מתור קודם אחד" : `מ-${bookedDebt.count} תורים קודמים`} · אפשר להסדיר בתור הבא
                  </div>
                </div>
              </div>
            )}

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
            <button className="bb-btn bb-btn-primary" style={{ width: "100%" }} disabled={!selectedTime || !selectedService} onClick={() => goStep(3)}>
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
          onCancel={async (appt) => {
            const msUntil = apptDateTime(appt).getTime() - Date.now();
            if (msUntil < 2 * 60 * 60 * 1000) {
              pushToast("לא ניתן לבטל פחות משעתיים לפני התור — צרו קשר עם המספרה", { type: "danger" });
              return;
            }
            const rpc = await remoteRpc("cancel_my_appointment", { p_id: appt.id, p_token: cancelTokens[appt.id] || "" });
            if (!rpc.missing) {
              if (!rpc.ok) { pushToast(rpc.reason || "הביטול נכשל", { type: "danger" }); return; }
              setAppointments((appts) => appts.map((a) => (a.id === appt.id ? { ...a, status: "cancelled" } : a)));
              vibrate(12);
              pushToast("התור בוטל בהצלחה", { type: "success" });
              return;
            }
            setAppointments((appts) => appts.map((a) => (a.id === appt.id ? { ...a, status: "cancelled" } : a)));
            remoteSetAppointmentStatus(appt.id, "cancelled");
            logActivity(`לקוח ביטל תור: ${appt.clientName || "לקוח"} · ${appt.date} ${appt.time}`, { forceRemote: true });
            notifyAdmin && notifyAdmin("client_cancelled", {
              apptId: appt.id,
              clientName: appt.clientName,
              serviceName: appt.serviceName,
              date: appt.date,
              time: appt.time,
            }, { forceRemote: true });
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
          <p style={{ fontSize: 12.5, color: "var(--muted-dim)", textAlign: "center", margin: "4px 0 0" }}>
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
  { id: "appointments", label: "תורים", icon: CalendarClock, accent: true },
  { id: "unpaid", label: "לתשלום", icon: Banknote },
  { id: "journal", label: "יומן", icon: BookOpen },
  { id: "finance", label: "כספים", icon: Wallet },
  { id: "clients", label: "לקוחות", icon: Users },
  { id: "services", label: "שירותים", icon: Scissors },
  { id: "hours", label: "שעות פעילות", icon: Clock },
  { id: "activity", label: "פעילות", icon: Activity },
  { id: "settings", label: "הגדרות", icon: Settings },
];

function AdminView(props) {
  const { businessName, setBusinessName, appointments, setAppointments, clients, services, activityLog, notificationLog, adminNotifications, setAdminNotifications, pushToast, logActivity, onLock } = props;
  const overdueUnpaidCount = useMemo(
    () => appointments.filter((a) => isUnpaid(a) && apptDateTime(a).getTime() <= Date.now()).length,
    [appointments]
  );
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
              <span style={{ position: "absolute", top: -2, left: -2, background: "var(--danger)", color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
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
          <button key={t.id} className={`bb-admin-tab ${tab === t.id ? "active" : ""} ${t.accent ? "accent" : ""}`} onClick={() => setTab(t.id)}>
            <t.icon size={15} /> {t.label}
            {t.id === "unpaid" && overdueUnpaidCount > 0 && (
              <span className="bb-tab-count">{overdueUnpaidCount}</span>
            )}
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
            {tab === "unpaid" && <UnpaidTab {...props} />}
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
                <div style={{ fontSize: 12, color: "var(--muted-dim)", marginTop: 4 }}>
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
                  <div style={{ fontSize: 12, color: appt?.status === "confirmed" ? "var(--success)" : "var(--danger)", marginTop: 6, fontWeight: 600 }}>
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

  function approveAllPending() {
    const ids = pendingRequests.map((a) => a.id);
    if (!ids.length) return;
    setAppointments((as) => as.map((a) => (ids.includes(a.id) ? { ...a, status: "confirmed" } : a)));
    ids.forEach((id) => remoteSetAppointmentStatus(id, "confirmed"));
    setAdminNotifications && setAdminNotifications((ns) => ns.map((n) => (ids.includes(n.apptId) ? { ...n, handled: true, read: true } : n)));
    logActivity(`אושרו ${ids.length} בקשות תור בבת אחת`);
    vibrate(15);
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
    remoteInsertRow("appointments", updated).then((res) => {
      if (!res.ok) pushToast && pushToast(`⚠️ השמירה נכשלה: ${res.reason}`, { type: "danger", duration: 10000 });
    });
    logActivity(`התור של ${updated.clientName} עודכן ידנית`);
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
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--warning)", flex: 1 }}>
                {pendingRequests.length} בקשות תור ממתינות לאישור שלך
              </span>
              {pendingRequests.length > 1 && (
                <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={approveAllPending}>
                  <CheckCheck size={14} /> אשר הכל
                </button>
              )}
            </div>
            {pendingRequests.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--warning-wash)" }}>
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
              <Timer size={19} color="var(--on-gold)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: "var(--gold-bright)", fontWeight: 600, marginBottom: 2 }}>על הכיסא עכשיו</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{currentAppt.clientName} · {currentAppt.serviceName}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="bb-mono-num" style={{ fontFamily: "'Frank Ruhl Libre'", fontSize: 19, fontWeight: 700, color: "var(--gold-bright)" }}>
                {Math.max(currentRemaining, 0)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>דק׳ נותרו</div>
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
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>{label}</div>
      <div className="bb-mono-num" style={{ fontSize: 14, fontWeight: 700, color: highlight ? "var(--gold-bright)" : "var(--cream)" }}>{value}</div>
    </div>
  );
}

/* ---------- payment methods ---------- */
const PAY_METHODS = [
  { id: "cash", label: "מזומן", color: "var(--series-3)" },
  { id: "bit", label: "ביט", color: "var(--series-1)" },
  { id: "paybox", label: "פייבוקס", color: "var(--series-4)" },
];
const payLabel = (id) => PAY_METHODS.find((m) => m.id === id)?.label || "";

function PayMethodButtons({ value, onPick, size = "md" }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: "100%" }}>
      {PAY_METHODS.map((m) => (
        <button key={m.id} type="button" onClick={() => onPick(m.id)} className="bb-btn"
          style={{
            minHeight: size === "sm" ? 44 : 52, padding: "6px 4px", fontSize: size === "sm" ? 14.5 : 16, fontWeight: 700,
            background: value === m.id ? "var(--gold)" : "var(--bg-elevated)",
            color: value === m.id ? "var(--on-gold)" : "var(--cream)",
            border: `1.5px solid ${value === m.id ? "var(--gold)" : "var(--border-light)"}`,
          }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* small "how was it paid?" window — used when an appointment is set to "הושלם" */
function PayMethodModal({ appt, onPick, onClose }) {
  return (
    <div className="bb-modal-backdrop" style={{ alignItems: "center", zIndex: 9700 }} onClick={onClose}>
      <div className="bb-modal" style={{ borderRadius: 20, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div className="bb-serif" style={{ fontSize: 18, fontWeight: 700 }}>איך שולם?</div>
          <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
            {appt.clientName} · <span className="bb-mono-num">₪{Number(appt.price) || 0}</span>
          </div>
        </div>
        <PayMethodButtons onPick={onPick} />
        <button className="bb-btn bb-btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={onClose}>ביטול</button>
      </div>
    </div>
  );
}

/* ---------- UNPAID — every booked appointment whose payment wasn't confirmed yet ----------
   "Paid" in this app = status "done" with the final price (that's what Finance counts as revenue). */
function isUnpaid(a) {
  return a.status === "confirmed" || a.status === "pending";
}

function UnpaidTab({ appointments, setAppointments, services, pushToast, logActivity }) {
  const [amounts, setAmounts] = useState({}); // id -> edited amount (string)
  const [showFuture, setShowFuture] = useState(false);
  const [justPaid, setJustPaid] = useState([]); // [{ appt (before), amount }] — this session, for undo
  const [removing, setRemoving] = useState(null); // id of the row showing cancel/delete choices
  const [paying, setPaying] = useState(null); // id of the row asking "how was it paid?"
  const [removed, setRemoved] = useState([]); // [{ appt (before), kind: "cancel" | "delete" }] — for undo

  const nowTs = Date.now();
  const todayKey = fmtDateKey(new Date());
  const unpaid = appointments
    .filter(isUnpaid)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const overdue = unpaid.filter((a) => apptDateTime(a).getTime() <= nowTs);
  const laterToday = unpaid.filter((a) => a.date === todayKey && apptDateTime(a).getTime() > nowTs);
  const future = unpaid.filter((a) => a.date > todayKey);

  function defaultAmount(a) {
    if (a.price != null && a.price !== "") return Number(a.price);
    const svc = services.find((s) => s.id === a.serviceId || s.name === a.serviceName);
    return svc?.price ?? 0;
  }
  function amountOf(a) {
    const v = amounts[a.id];
    return v === undefined ? String(defaultAmount(a)) : v;
  }
  const totalOverdue = overdue.reduce((sum, a) => sum + (Number(amountOf(a)) || 0), 0);

  function save(updated) {
    setAppointments((as) => as.map((x) => (x.id === updated.id ? updated : x)));
    remoteInsertRow("appointments", updated).then((res) => {
      if (!res.ok) pushToast && pushToast(`⚠️ השמירה נכשלה: ${res.reason}`, { type: "danger", duration: 10000 });
    });
  }

  function markPaid(a, method) {
    const amount = Math.max(0, Math.round(Number(amountOf(a)) || 0));
    save({ ...a, status: "done", price: amount, paidAt: Date.now(), paymentMethod: method });
    setJustPaid((list) => [{ appt: a, amount, method }, ...list].slice(0, 20));
    setAmounts((m) => { const n = { ...m }; delete n[a.id]; return n; });
    setPaying(null);
    logActivity(`תשלום אושר: ${a.clientName} · ₪${amount} · ${payLabel(method)} · ${a.date} ${a.time}`);
    vibrate(15);
  }

  function cancelAppt(a) {
    save({ ...a, status: "cancelled" });
    setRemoved((list) => [{ appt: a, kind: "cancel" }, ...list].slice(0, 20));
    setRemoving(null);
    logActivity(`תור בוטל מטאב לתשלום: ${a.clientName} · ${a.date} ${a.time}`);
    vibrate(12);
  }

  function deleteApptForever(a) {
    setAppointments((as) => as.filter((x) => x.id !== a.id));
    setRemoved((list) => [{ appt: a, kind: "delete" }, ...list].slice(0, 20));
    setRemoving(null);
    logActivity(`נמחק תור לצמיתות: ${a.clientName} · ${a.date} ${a.time}`);
    vibrate(12);
  }

  function undoRemove(entry) {
    if (entry.kind === "delete") {
      setAppointments((as) => [...as, entry.appt]);
      remoteInsertRow("appointments", entry.appt);
    } else {
      save(entry.appt);
    }
    setRemoved((list) => list.filter((e) => e !== entry));
    logActivity(`שוחזר תור: ${entry.appt.clientName} · ${entry.appt.date} ${entry.appt.time}`);
    vibrate(10);
  }

  function undoPaid(entry) {
    const { paidAt, paymentMethod, ...rest } = entry.appt;
    save({ ...rest });
    setJustPaid((list) => list.filter((e) => e !== entry));
    logActivity(`בוטל אישור תשלום: ${entry.appt.clientName} · ${entry.appt.date} ${entry.appt.time}`);
    vibrate(10);
  }

  function renderRow(a) {
    const d = new Date(a.date + "T12:00");
    if (paying === a.id) {
      return (
        <div className="bb-pay-row" key={a.id} style={{ background: "var(--success-wash)", flexWrap: "wrap", gap: 8 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
            איך {a.clientName} שילם? <span className="bb-mono-num" style={{ color: "var(--muted)", fontWeight: 600 }}>₪{amountOf(a)}</span>
          </div>
          <button className="bb-icon-btn" onClick={() => setPaying(null)} aria-label="חזרה"><X size={18} /></button>
          <PayMethodButtons size="sm" onPick={(method) => markPaid(a, method)} />
        </div>
      );
    }
    if (removing === a.id) {
      return (
        <div className="bb-pay-row" key={a.id} style={{ background: "var(--danger-wash)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 100%", fontSize: 14, fontWeight: 600 }}>
            מה לעשות עם התור של {a.clientName}?
          </div>
          <button className="bb-btn bb-btn-sm" style={{ flex: 1, background: "var(--bg-card)", border: "1.5px solid var(--danger)", color: "var(--danger)" }} onClick={() => cancelAppt(a)}>
            <X size={15} /> ביטול תור
          </button>
          <button className="bb-btn bb-btn-sm" style={{ flex: 1, background: "var(--danger)", color: "#fff", border: "none" }} onClick={() => deleteApptForever(a)}>
            <Trash2 size={15} /> מחיקה
          </button>
          <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => setRemoving(null)}>חזרה</button>
        </div>
      );
    }
    return (
      <div className="bb-pay-row" key={a.id}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {a.clientName || "לקוח"}
            {a.status === "pending" && <span className="bb-badge pending" style={{ marginInlineStart: 6, fontSize: 11 }}>לא אושר</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap" }}>
            {a.date === todayKey ? "היום" : `${DOW_HE[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`} · <span className="bb-mono-num" style={{ color: "var(--cream)", fontWeight: 600 }}>{a.time}</span>
          </div>
        </div>
        <label className="bb-pay-amount" title="סכום — אפשר לשנות">
          <span style={{ color: "var(--muted)", fontSize: 15 }}>₪</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={amountOf(a)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAmounts((m) => ({ ...m, [a.id]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && setPaying(a.id)}
            aria-label={`סכום לתשלום של ${a.clientName}`}
          />
        </label>
        <button className="bb-pay-v" onClick={() => { setRemoving(null); setPaying(a.id); }} aria-label={`אשר תשלום של ${a.clientName}`} title="אשר תשלום">
          <Check size={24} strokeWidth={3} />
        </button>
        <button className="bb-icon-btn" onClick={() => setRemoving(a.id)} aria-label={`ביטול או מחיקה של התור של ${a.clientName}`} title="ביטול / מחיקה">
          <X size={18} />
        </button>
      </div>
    );
  }

  function renderSection(title, items, tone) {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: tone || "var(--cream)" }}>{title}</span>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{items.length}</span>
        </div>
        <div className="bb-card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((a) => renderRow(a))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, background: overdue.length ? "var(--warning-wash)" : "var(--success-wash)", borderColor: "transparent" }}>
        <Banknote size={26} color={overdue.length ? "var(--warning)" : "var(--success)"} />
        <div style={{ flex: 1 }}>
          {overdue.length ? (
            <>
              <div className="bb-mono-num" style={{ fontSize: 22, fontWeight: 800 }}>₪{totalOverdue.toLocaleString("he-IL")}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{overdue.length === 1 ? "תור אחד שכבר עבר ועוד לא סומן כשולם" : `${overdue.length} תורים שכבר עברו ועוד לא סומנו כשולמו`}</div>
            </>
          ) : (
            <div style={{ fontWeight: 700, fontSize: 15 }}>הכל מסודר — אין תשלומים פתוחים על תורים שעברו</div>
          )}
        </div>
      </div>

      {renderSection("עברו — ממתינים לאישור תשלום", overdue, "var(--warning)")}
      {renderSection("בהמשך היום", laterToday)}

      {future.length > 0 && (
        showFuture ? (
          renderSection("תורים עתידיים", future)
        ) : (
          <button className="bb-btn bb-btn-ghost" style={{ width: "100%", marginBottom: 16 }} onClick={() => setShowFuture(true)}>
            הצג גם תורים עתידיים ({future.length})
          </button>
        )
      )}

      {justPaid.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--success)", padding: "0 4px 8px" }}>שולמו עכשיו</div>
          <div className="bb-card" style={{ padding: 0, overflow: "hidden" }}>
            {justPaid.map((e, i) => (
              <div key={e.appt.id + i} className="bb-pay-row" style={{ minHeight: 52, opacity: 0.85 }}>
                <Check size={18} color="var(--success)" />
                <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                  <b>{e.appt.clientName}</b> · <span className="bb-mono-num">₪{e.amount}</span>{e.method ? ` · ${payLabel(e.method)}` : ""}
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}> · {e.appt.time}</span>
                </div>
                <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => undoPaid(e)}>
                  <Undo2 size={14} /> ביטול
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {removed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--danger)", padding: "0 4px 8px" }}>הוסרו עכשיו</div>
          <div className="bb-card" style={{ padding: 0, overflow: "hidden" }}>
            {removed.map((e, i) => (
              <div key={e.appt.id + "r" + i} className="bb-pay-row" style={{ minHeight: 52, opacity: 0.85 }}>
                {e.kind === "delete" ? <Trash2 size={16} color="var(--danger)" /> : <X size={16} color="var(--danger)" />}
                <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                  <b>{e.appt.clientName}</b>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}> · {e.kind === "delete" ? "נמחק" : "בוטל"} · {e.appt.time}</span>
                </div>
                <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => undoRemove(e)}>
                  <Undo2 size={14} /> שחזור
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!unpaid.length && !justPaid.length && !removed.length && (
        <EmptyState icon={Banknote} title="אין תורים שממתינים לתשלום" subtitle="כל תור שנקבע יופיע כאן עד שתאשר את התשלום שלו" />
      )}
    </div>
  );
}

/* ---------- FINANCE — revenue, expenses, and where the money actually comes from ---------- */
const MONTHS_HE_SHORT = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
const MONTHS_HE_FULL = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
// colour follows the category (fixed order), never its rank
const EXPENSE_COLORS = ["var(--exp-1)", "var(--exp-2)", "var(--exp-3)", "var(--exp-4)", "var(--exp-5)", "var(--exp-6)"];
const fmtILS = (n) => `₪${Math.round(n).toLocaleString("he-IL")}`;
function monthKeyOf(dateStr) { return (dateStr || "").slice(0, 7); } // "YYYY-MM"
function monthLabel(key, full) {
  const [y, m] = key.split("-").map(Number);
  return full ? `${MONTHS_HE_FULL[m - 1]} ${y}` : MONTHS_HE_SHORT[m - 1];
}

/* grouped bars: revenue vs expenses per month.
   Tap / hover a bar -> small window with the amount. Tap the month name -> filter the tab to that month. */
function MonthlyBars({ months, selected, onSelect }) {
  const [tip, setTip] = useState(null); // { key, kind: "revenue" | "expenses" }
  const W = 340, H = 170, padB = 24, padT = 10, padX = 4, padL = 40; // left gutter holds the ₪ axis labels
  const max = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.expenses)));
  const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); return Math.ceil(max / p) * p; })();
  const plotH = H - padB - padT;
  const slot = (W - padL - padX) / months.length;
  const barW = Math.min(18, (slot - 14) / 2);
  const y = (v) => padT + plotH - (v / nice) * plotH;
  const barPath = (x, v) => {
    const h = (v / nice) * plotH;
    if (h <= 0) return null;
    const r = Math.min(4, h);
    const top = padT + plotH - h, base = padT + plotH;
    return `M${x},${base} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + barW - r},${top} Q${x + barW},${top} ${x + barW},${top + r} L${x + barW},${base} Z`;
  };
  const tipMonth = tip && months.find((m) => m.key === tip.key);
  let tipPos = null;
  if (tipMonth) {
    const i = months.indexOf(tipMonth);
    const cx = padL + slot * i + slot / 2;
    const x = tip.kind === "revenue" ? cx - barW / 2 - 1 : cx + barW / 2 + 1;
    const v = tip.kind === "revenue" ? tipMonth.revenue : tipMonth.expenses;
    tipPos = { left: (x / W) * 100, top: (Math.min(y(v), padT + plotH - 4) / H) * 100, v };
  }
  return (
    <div style={{ position: "relative" }} onPointerLeave={(e) => { if (e.pointerType === "mouse") setTip(null); }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", direction: "ltr", touchAction: "manipulation" }} role="img" aria-label="הכנסות והוצאות לפי חודש"
        onClick={() => setTip(null)}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={W - padX} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={padL - 5} y={y(nice * f) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--muted-dim)" fontFamily="Heebo">{fmtILS(nice * f)}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padX} y1={padT + plotH} y2={padT + plotH} stroke="var(--border-light)" />
        {months.map((m, i) => {
          const cx = padL + slot * i + slot / 2;
          const dim = selected && selected !== m.key;
          const isSel = selected === m.key;
          const kinds = [
            { kind: "revenue", x: cx - barW - 1, v: m.revenue, color: "var(--success)" },
            { kind: "expenses", x: cx + 1, v: m.expenses, color: "var(--danger)" },
          ];
          return (
            <g key={m.key} className="bb-bar-month">
              <rect x={padL + slot * i} y={0} width={slot} height={H} fill={isSel ? "var(--gold-wash)" : "transparent"} rx="6" />
              {kinds.map((k) => {
                const d = barPath(k.x, k.v);
                const active = tip && tip.key === m.key && tip.kind === k.kind;
                return (
                  <g key={k.kind}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") setTip({ key: m.key, kind: k.kind }); }}
                    onClick={(e) => { e.stopPropagation(); setTip({ key: m.key, kind: k.kind }); }}
                    style={{ cursor: "pointer" }}>
                    {/* invisible hit area — wider and taller than the bar, easy to tap */}
                    <rect x={k.x - 3} y={padT} width={barW + 6} height={plotH} fill="transparent" />
                    {d && <path d={d} fill={k.color} opacity={dim && !active ? 0.35 : 1} stroke={active ? "var(--cream)" : "none"} strokeWidth="1.5" />}
                  </g>
                );
              })}
              <text x={cx} y={H - 7} textAnchor="middle" fontSize="11" fontFamily="Heebo" fontWeight={isSel ? 700 : 400}
                fill={isSel ? "var(--cream)" : "var(--muted)"} style={{ cursor: "pointer" }}
                onClick={(e) => { e.stopPropagation(); setTip(null); onSelect(isSel ? null : m.key); }}>{monthLabel(m.key)}</text>
            </g>
          );
        })}
      </svg>
      {tipMonth && tipPos && (
        <div role="status" style={{
          position: "absolute", left: `${tipPos.left}%`, top: `${tipPos.top}%`, transform: "translate(-50%, calc(-100% - 8px))",
          background: "var(--bg-elevated)", border: `1.5px solid ${tip.kind === "revenue" ? "var(--success)" : "var(--danger)"}`,
          borderRadius: 10, padding: "7px 10px", boxShadow: "0 6px 20px rgba(0,0,0,0.35)", pointerEvents: "none",
          whiteSpace: "nowrap", zIndex: 5, textAlign: "center",
        }}>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{monthLabel(tipMonth.key, true)} · {tip.kind === "revenue" ? "הכנסות" : "הוצאות"}</div>
          <div className="bb-mono-num" style={{ fontSize: 17, fontWeight: 800, color: "var(--cream)" }}>{fmtILS(tipPos.v)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
            {tip.kind === "revenue" ? `${tipMonth.revenueCount} תורים ששולמו` : `${tipMonth.expenseCount} הוצאות`}
          </div>
          {tip.kind === "revenue" && tipMonth.byMethod?.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--cream)", marginTop: 3, borderTop: "1px solid var(--border)", paddingTop: 3 }}>
              {tipMonth.byMethod.map((x) => `${x.label} ${fmtILS(x.amount)}`).join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* donut: expenses by category, with a legend that always shows amount + % */
function ExpenseDonut({ rows, total, centerLabel = "סה״כ הוצאות", centerValue = null }) {
  const [hover, setHover] = useState(null);
  const R = 62, T = 20, C = 2 * Math.PI * R;
  let acc = 0;
  const shown = hover ? rows.find((r) => r.cat === hover) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
      <svg viewBox="0 0 160 160" width="150" height="150" role="img" aria-label="פילוח הוצאות לפי קטגוריה" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 80 80)">
          {rows.map((r) => {
            const len = (r.amount / total) * C;
            const gap = rows.length > 1 ? 2 : 0; // 2px surface gap between slices
            const el = (
              <circle key={r.cat} cx="80" cy="80" r={R} fill="none" stroke={r.color} strokeWidth={hover === r.cat ? T + 4 : T}
                strokeDasharray={`${Math.max(0, len - gap)} ${C - Math.max(0, len - gap)}`} strokeDashoffset={-acc}
                onMouseEnter={() => setHover(r.cat)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === r.cat ? null : r.cat)}
                style={{ cursor: "pointer", transition: "stroke-width .15s" }}>
                <title>{`${r.cat} · ${fmtILS(r.amount)} · ${Math.round((r.amount / total) * 100)}%`}</title>
              </circle>
            );
            acc += len;
            return el;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="Heebo">{shown ? shown.cat : centerLabel}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--cream)" fontFamily="Heebo">{shown ? fmtILS(shown.amount) : (centerValue !== null ? (centerValue < 0 ? "-" : "") + fmtILS(Math.abs(centerValue)) : fmtILS(total))}</text>
      </svg>
      <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {rows.map((r) => (
          <div key={r.cat} onMouseEnter={() => setHover(r.cat)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === r.cat ? null : r.cat)}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", opacity: hover && hover !== r.cat ? 0.5 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.cat}</span>
            <span className="bb-mono-num" style={{ fontWeight: 700 }}>{fmtILS(r.amount)}</span>
            <span className="bb-mono-num" style={{ color: "var(--muted)", width: 36, textAlign: "left" }}>{Math.round((r.amount / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceTab({ appointments, clients, services, expenses, setExpenses, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | expense obj (edit)
  const [form, setForm] = useState({ description: "", category: EXPENSE_CATEGORIES[0], amount: "", date: fmtDateKey(new Date()) });
  const [errors, setErrors] = useState({});
  const [month, setMonth] = useState(null); // "YYYY-MM" or null = all time

  // last 6 months (incl. current) for the bar chart
  const monthly = useMemo(() => {
    const now = new Date();
    const keys = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    return keys.map((key) => {
      const done = appointments.filter((a) => a.status === "done" && monthKeyOf(a.date) === key);
      const exps = expenses.filter((e) => monthKeyOf(e.date) === key);
      return {
        key,
        revenue: done.reduce((s2, a) => s2 + (Number(a.price) || 0), 0),
        revenueCount: done.length,
        byMethod: PAY_METHODS.map((pm) => ({ ...pm, amount: done.filter((a) => a.paymentMethod === pm.id).reduce((s2, a) => s2 + (Number(a.price) || 0), 0) })).filter((x) => x.amount > 0),
        expenses: exps.reduce((s2, e) => s2 + (Number(e.amount) || 0), 0),
        expenseCount: exps.length,
      };
    });
  }, [appointments, expenses]);

  const inMonth = (dateStr) => !month || monthKeyOf(dateStr) === month;
  const realized = appointments.filter((a) => a.status === "done" && inMonth(a.date));
  const pipeline = appointments.filter((a) => (a.status === "confirmed" || a.status === "pending") && inMonth(a.date));
  const periodExpenses = expenses.filter((e) => inMonth(e.date));
  const totalRevenue = realized.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const methodRows = [
    ...PAY_METHODS.map((pm) => {
      const list = realized.filter((a) => a.paymentMethod === pm.id);
      return { ...pm, count: list.length, amount: list.reduce((s2, a) => s2 + (Number(a.price) || 0), 0) };
    }),
    (() => {
      const list = realized.filter((a) => !PAY_METHODS.some((pm) => pm.id === a.paymentMethod));
      return { id: "none", label: "לא צוין", color: "var(--muted-dim)", count: list.length, amount: list.reduce((s2, a) => s2 + (Number(a.price) || 0), 0) };
    })(),
  ].filter((r) => r.count > 0);
  const pipelineRevenue = pipeline.reduce((sum, a) => sum + (a.price ?? 0), 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const expenseRows = EXPENSE_CATEGORIES
    .map((cat, i) => ({ cat, color: EXPENSE_COLORS[i] || "var(--muted)", amount: periodExpenses.filter((e) => (EXPENSE_CATEGORIES.includes(e.category) ? e.category : "אחר") === cat).reduce((s2, e) => s2 + (Number(e.amount) || 0), 0) }))
    .filter((r) => r.amount > 0);
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
      <div style={{ padding: "12px 16px 0" }}>
        <div className="bb-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{month ? monthLabel(month, true) : "6 חודשים אחרונים"}</div>
            {month ? (
              <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={() => setMonth(null)}>כל התקופה</button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>לחיצה על חודש = פירוט שלו</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--success)" }} /> הכנסות</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--danger)" }} /> הוצאות</span>
          </div>
          <MonthlyBars months={monthly} selected={month} onSelect={setMonth} />
        </div>
      </div>

      <div className="bb-summary-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", padding: "12px 16px 6px" }}>
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

        <SectionTitle title={`הכנסות מול הוצאות${month ? " · " + monthLabel(month, true) : ""}`} />
        {totalRevenue + totalExpenses === 0 ? (
          <EmptyState icon={CircleDollarSign} title="אין עדיין נתונים לתקופה הזו" subtitle="תורים ששולמו והוצאות שתוסיפו יופיעו כאן" />
        ) : (
          <div className="bb-card">
            <ExpenseDonut
              rows={[
                { cat: "הכנסות", color: "var(--success)", amount: totalRevenue },
                { cat: "הוצאות", color: "var(--danger)", amount: totalExpenses },
              ].filter((r) => r.amount > 0)}
              total={totalRevenue + totalExpenses}
              centerLabel={netProfit >= 0 ? "רווח" : "הפסד"}
              centerValue={netProfit}
            />
          </div>
        )}

        <SectionTitle title={`הכנסות לפי אמצעי תשלום${month ? " · " + monthLabel(month, true) : ""}`} />
        {methodRows.length === 0 ? (
          <EmptyState icon={Banknote} title="אין תשלומים בתקופה הזו" subtitle="כל תשלום שתאשרו יסומן כמזומן, ביט או פייבוקס ויופיע כאן" />
        ) : (
          <div className="bb-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {methodRows.map((r) => {
              const pct = totalRevenue > 0 ? Math.round((r.amount / totalRevenue) * 100) : 0;
              return (
                <div key={r.id}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0, alignSelf: "center" }} />
                    <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.count === 1 ? "תשלום אחד" : `${r.count} תשלומים`}</span>
                    <span className="bb-mono-num" style={{ fontWeight: 800, fontSize: 15 }}>{fmtILS(r.amount)}</span>
                    <span className="bb-mono-num" style={{ fontSize: 12.5, color: "var(--muted)", width: 34, textAlign: "left" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--bg-hover)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: r.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SectionTitle title={`פילוח הוצאות${month ? " · " + monthLabel(month, true) : ""}`} />
        {expenseRows.length === 0 ? (
          <EmptyState icon={Receipt} title="אין הוצאות בתקופה הזו" subtitle="הוצאות שתוסיפו למטה יתחלקו כאן לפי קטגוריה" />
        ) : (
          <div className="bb-card"><ExpenseDonut rows={expenseRows} total={totalExpenses} /></div>
        )}

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
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{stats.visits} ביקורים · ₪{stats.avgTicket} ממוצע</div>
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
        {periodExpenses.length === 0 ? (
          <EmptyState icon={Receipt} title={month ? "אין הוצאות בחודש הזה" : "אין הוצאות רשומות"} subtitle="הוסיפו הוצאות עסקיות (שכירות, מוצרים, ציוד) כדי לראות רווח נקי אמיתי" />
        ) : (
          <div className="bb-card" style={{ padding: 0 }}>
            {[...periodExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <div key={e.id} className="bb-row">
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--danger-wash)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingDown size={15} color="var(--danger)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.description}</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{e.category} · {e.date}</div>
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
    <div className={`bb-row st-${appt.status}`}>
      <div className="bb-avatar">{initials(appt.clientName)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.clientName}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span className="bb-mono-num" style={{ color: "var(--cream)", fontWeight: 600 }}>{appt.time}</span>
          {!compact && (() => { const d = new Date(appt.date + "T12:00"); return ` · ${DOW_HE[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; })()}
          {(appt.duration ?? DEFAULT_APPT_DURATION) !== DEFAULT_APPT_DURATION ? ` · ${appt.duration} דק׳` : ""}
          {appt.status === "done" && appt.paymentMethod ? ` · ${payLabel(appt.paymentMethod)}` : ""}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.serviceName}</div>
      </div>
      {onStatusChange ? (
        <select
          value={appt.status}
          onChange={(e) => onStatusChange(appt.id, e.target.value)}
          className={`bb-status-select st-${appt.status}`}
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

  const [askPay, setAskPay] = useState(null); // appointment waiting for "how was it paid?"

  function updateStatus(id, status) {
    const a = appointments.find((x) => x.id === id);
    if (status === "done" && a && a.status !== "done") { setAskPay(a); return; }
    setAppointments((appts) => appts.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, status };
      if (status !== "done") delete next.paymentMethod;
      return next;
    }));
    remoteSetAppointmentStatus(id, status);
    logActivity(`סטטוס התור של ${a?.clientName} עודכן ל"${status}"`);
  }

  function confirmPaid(a, method) {
    const updated = { ...a, status: "done", paymentMethod: method, paidAt: Date.now() };
    setAppointments((appts) => appts.map((x) => (x.id === a.id ? updated : x)));
    remoteInsertRow("appointments", updated);
    logActivity(`תשלום אושר: ${a.clientName} · ₪${Number(a.price) || 0} · ${payLabel(method)}`);
    setAskPay(null);
    vibrate(15);
  }

  function saveAppt(updated) {
    setAppointments((appts) => appts.map((a) => (a.id === updated.id ? updated : a)));
    remoteInsertRow("appointments", updated).then((res) => {
      if (!res.ok) pushToast && pushToast(`⚠️ השמירה נכשלה: ${res.reason}`, { type: "danger", duration: 10000 });
    });
    logActivity(`התור של ${updated.clientName} עודכן ידנית (עריכה מלאה)`);
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
    remoteInsertRow("appointments", newAppt).then((res) => {
      if (!res.ok) pushToast && pushToast(`⚠️ השמירה נכשלה: ${res.reason}`, { type: "danger", duration: 10000 });
    });
    logActivity(`תור נקבע ידנית עבור ${apptFields.clientName} · ${apptFields.date} ${apptFields.time}`);
    setCreatingAppt(false);
  }

  return (
    <div style={{ padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 }}>
        <div className="bb-view-toggle">
          <button className={viewMode === "week" ? "active" : ""} onClick={() => setViewMode("week")}>
            <CalendarDays size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />יומן
          </button>
          <button className={viewMode === "day" ? "active" : ""} onClick={() => setViewMode("day")}>
            <CalendarClock size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />יום
          </button>
          <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}>
            <List size={13} style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }} />רשימה
          </button>
        </div>
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={() => setCreatingAppt(true)}><Plus size={15} /> תור חדש</button>
      </div>

      {viewMode === "day" ? (
        <DayView
          appointments={appointments}
          weeklyHours={weeklyHours}
          onSelect={(a) => setEditingAppt(a)}
          onCreateAt={(date, time) => setCreatingAppt({ date, time })}
        />
      ) : viewMode === "week" ? (
        <WeekCalendar
          appointments={appointments}
          weeklyHours={weeklyHours}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          onSelect={(a) => setEditingAppt(a)}
          onCreateAt={(date, time) => setCreatingAppt({ date, time })}
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
      {askPay && <PayMethodModal appt={askPay} onPick={(m) => confirmPaid(askPay, m)} onClose={() => setAskPay(null)} />}
      {creatingAppt && (
        <EditAppointmentModal appt={null} initial={typeof creatingAppt === "object" ? creatingAppt : null} services={services} clients={clients} onSave={createAppt} onClose={() => setCreatingAppt(false)} />
      )}
    </div>
  );
}

/* ---------- WEEKLY VISUAL CALENDAR — days across, hours down, appointment
   blocks positioned to scale. The at-a-glance view of the barber's week. ---------- */
const WEEK_STATUS_COLORS = {
  confirmed: { bg: "var(--success-wash)", border: "var(--success)", text: "var(--success)" },
  pending: { bg: "var(--warning-wash)", border: "var(--warning)", text: "var(--warning)" },
  done: { bg: "var(--gold-wash)", border: "var(--gold)", text: "var(--gold-bright)" },
  cancelled: { bg: "var(--danger-wash)", border: "var(--danger)", text: "var(--danger)" },
};

function WeekCalendar({ appointments, weeklyHours, weekOffset, setWeekOffset, onSelect, onCreateAt }) {
  const start = weekStart(weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekKeys = days.map(fmtDateKey);
  const weekAppts = appointments.filter((a) => weekKeys.includes(a.date) && a.status !== "cancelled");

  // visible hour range: only the hours this week actually uses (1h margin each side),
  // so 20-min appointments get real height. An empty week falls back to opening hours.
  let minHour = 24, maxHour = 0;
  weekAppts.forEach((a) => {
    const s = timeToMinutes(a.time);
    const e = s + (Number(a.duration) || DEFAULT_APPT_DURATION);
    minHour = Math.min(minHour, Math.floor(s / 60) - 1);
    maxHour = Math.max(maxHour, Math.ceil(e / 60) + 1);
  });
  if (!weekAppts.length) {
    Object.values(weeklyHours || {}).forEach((h) => {
      if (h && !h.closed) {
        minHour = Math.min(minHour, Math.floor(timeToMinutes(h.open) / 60));
        maxHour = Math.max(maxHour, Math.ceil(timeToMinutes(h.close) / 60));
      }
    });
  }
  if (minHour >= maxHour) { minHour = 8; maxHour = 21; }
  minHour = Math.max(0, minHour);
  maxHour = Math.min(24, Math.max(maxHour, minHour + 4)); // at least 4 hours visible
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);
  const gridStartMin = minHour * 60;

  // fit the whole week on one screen: hour height is computed from the space
  // left below the grid's top edge, so nothing needs scrolling on a phone
  const gridRef = useRef(null);
  const [hourPx, setHourPx] = useState(40);
  useEffect(() => {
    function fit() {
      const el = gridRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const avail = window.innerHeight - top - 44 - 34; // day header row + legend/margin
      const px = Math.floor(avail / Math.max(hours.length, 1));
      // 60px/hour = 20px per 20-min appointment: enough for one clear line.
      // If the week is too long to fit, the grid scrolls a bit instead of stacking names.
      setHourPx(Math.max(60, Math.min(80, px)));
    }
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("orientationchange", fit); };
  }, [hours.length]);
  const HOUR_PX = hourPx;

  const todayKey = fmtDateKey(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowInRange = nowMin >= gridStartMin && nowMin <= maxHour * 60;

  const rangeLabel = `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`;

  // closed days with no appointments shrink to a thin strip so working days get the width
  const isNarrow = (d) => weeklyHours[d.getDay()]?.closed && !weekAppts.some((a) => a.date === fmtDateKey(d));
  const cols = "30px " + days.map((d) => (isNarrow(d) ? "18px" : "minmax(0, 1fr)")).join(" ");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button className="bb-icon-btn" onClick={() => setWeekOffset(weekOffset + 1)} title="שבוע הבא">
          <ChevronLeft size={18} className="bb-rtl-flip" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="bb-serif" style={{ fontSize: 14.5, fontWeight: 700 }}>{rangeLabel}</span>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{weekAppts.length} תורים</span>
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

      <div className="bb-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols }}>
          {/* header row */}
          <div style={{ borderBottom: "1px solid var(--border)" }} />
          {days.map((d) => {
            const isToday = fmtDateKey(d) === todayKey;
            const closed = weeklyHours[d.getDay()]?.closed;
            const narrow = isNarrow(d);
            return (
              <div key={fmtDateKey(d)} style={{ textAlign: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: isToday ? "var(--gold-wash)" : "transparent", opacity: closed ? 0.45 : 1, minWidth: 0 }}>
                <div style={{ fontSize: narrow ? 9 : 10.5, color: isToday ? "var(--gold-bright)" : "var(--muted)" }}>{narrow ? DOW_HE[d.getDay()].slice(0, 1) : DOW_HE[d.getDay()]}</div>
                {!narrow && <div className="bb-serif" style={{ fontSize: 14, fontWeight: 700, color: isToday ? "var(--gold-bright)" : "var(--cream)" }}>{d.getDate()}</div>}
              </div>
            );
          })}

          {/* time gutter */}
          <div ref={gridRef} style={{ position: "relative", height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div key={h} className="bb-mono-num" style={{ position: "absolute", top: i * HOUR_PX - (i === 0 ? 0 : 6), left: 0, right: 3, textAlign: "left", fontSize: 9.5, color: "var(--muted-dim)", direction: "ltr" }}>
                {String(h).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d) => {
            const key = fmtDateKey(d);
            const isToday = key === todayKey;
            const closed = weeklyHours[d.getDay()]?.closed;
            const dayAppts = weekAppts.filter((a) => a.date === key);
            return (
              <div key={key}
                onClick={(e) => {
                  if (!onCreateAt) return;
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  let mins = gridStartMin + Math.floor(((y / HOUR_PX) * 60) / SLOT_MINUTES) * SLOT_MINUTES;
                  mins = Math.max(gridStartMin, Math.min(mins, maxHour * 60 - SLOT_MINUTES));
                  const t = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
                  vibrate(10);
                  onCreateAt(key, t);
                }}
                className="bb-wk-col"
                style={{ position: "relative", minWidth: 0, height: hours.length * HOUR_PX, borderRight: "1px solid var(--border)", cursor: onCreateAt ? "copy" : "default", background: closed ? "repeating-linear-gradient(45deg, transparent, transparent 6px, var(--bg-elevated) 6px, var(--bg-elevated) 8px)" : isToday ? "rgba(198,161,91,0.03)" : "transparent" }}>
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
                  const dur = Number(a.duration) || DEFAULT_APPT_DURATION;
                  const top = ((startMin - gridStartMin) / 60) * HOUR_PX + 1;
                  const height = Math.max((dur / 60) * HOUR_PX - 2, 14); // 2px gap: back-to-back appointments never touch
                  const c = WEEK_STATUS_COLORS[a.status] || WEEK_STATUS_COLORS.confirmed;
                  return (
                    <div
                      key={a.id}
                      onClick={(e) => { e.stopPropagation(); onSelect(a); }}
                      title={`${a.clientName} · ${a.serviceName} · ${a.time}`}
                      style={{
                        position: "absolute", top, right: 1, left: 1, height,
                        background: c.bg, borderRight: `3px solid ${c.border}`, borderRadius: 5,
                        padding: "0 4px", cursor: "pointer", overflow: "hidden", zIndex: 2,
                        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: c.text, overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                        {(a.clientName || "").trim().split(/\s+/)[0]}
                      </span>
                      <span className="bb-mono-num bb-wk-time" style={{ fontSize: 10.5, color: "var(--muted)", flexShrink: 0, marginInlineStart: "auto" }}>
                        {a.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {onCreateAt && (
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted-dim)", marginTop: 6 }}>לחיצה על מקום ריק ביומן = תור חדש באותה שעה</div>
      )}
      <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {Object.entries({ confirmed: "מאושר", pending: "ממתין", done: "הושלם" }).map(([s, label]) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: WEEK_STATUS_COLORS[s].border }} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- DAY VIEW — one day, big hour rail, tappable free slots, swipe between days ---------- */
function DayView({ appointments, weeklyHours, onSelect, onCreateAt }) {
  const isOpen = (d) => !weeklyHours?.[d.getDay()]?.closed;
  const startDay = (() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) { if (isOpen(d)) return d; d.setDate(d.getDate() + 1); }
    return new Date();
  })();
  const [day, setDay] = useState(startDay);
  const touch = useRef(null);
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const key = fmtDateKey(day);
  const todayKey = fmtDateKey(new Date());
  const hours = weeklyHours?.[day.getDay()] || { open: "09:00", close: "20:00", closed: false };
  const dayAppts = appointments
    .filter((a) => a.date === key && a.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));
  const expected = dayAppts.reduce((s2, a) => s2 + (Number(a.price) || 0), 0);

  // step to the previous / next open day
  function step(dir) {
    const d = new Date(day);
    for (let i = 0; i < 14; i++) {
      d.setDate(d.getDate() + dir);
      if (isOpen(d) || appointments.some((a) => a.date === fmtDateKey(d) && a.status !== "cancelled")) { setDay(new Date(d)); vibrate(8); return; }
    }
  }

  // week strip (Sun..Sat) around the selected day
  const weekStart = new Date(day); weekStart.setDate(day.getDate() - day.getDay());
  const strip = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });

  // timeline: opening hours, widened to any appointment outside them
  let startMin = hours.closed ? 9 * 60 : timeToMinutes(hours.open);
  let endMin = hours.closed ? 20 * 60 : timeToMinutes(hours.close);
  dayAppts.forEach((a) => {
    const s0 = timeToMinutes(a.time);
    startMin = Math.min(startMin, Math.floor(s0 / SLOT_MINUTES) * SLOT_MINUTES);
    endMin = Math.max(endMin, s0 + (Number(a.duration) || DEFAULT_APPT_DURATION));
  });
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = key === todayKey;
  const isPastDay = key < todayKey;

  // build the rows: appointment cards + free 20-min slots (future only)
  const items = [];
  let t = startMin;
  while (t < endMin) {
    const appt = dayAppts.find((a) => { const s0 = timeToMinutes(a.time); return s0 >= t && s0 < t + SLOT_MINUTES; });
    if (appt) {
      const s0 = timeToMinutes(appt.time);
      items.push({ kind: "appt", at: s0, appt });
      t = Math.max(t + SLOT_MINUTES, Math.ceil((s0 + (Number(appt.duration) || DEFAULT_APPT_DURATION)) / SLOT_MINUTES) * SLOT_MINUTES);
      continue;
    }
    const covered = dayAppts.some((a) => { const s0 = timeToMinutes(a.time); return s0 < t && s0 + (Number(a.duration) || DEFAULT_APPT_DURATION) > t; });
    if (!covered && !hours.closed && !isPastDay && !(isToday && t + SLOT_MINUTES <= nowMin)) items.push({ kind: "free", at: t });
    t += SLOT_MINUTES;
  }
  const byHour = {};
  items.forEach((it) => { const h = Math.floor(it.at / 60); (byHour[h] = byHour[h] || []).push(it); });
  const hourKeys = Object.keys(byHour).map(Number).sort((a, b) => a - b);
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const ST = WEEK_STATUS_COLORS;
  const stLabel = { pending: "ממתין", confirmed: "מאושר", done: "הושלם" };

  return (
    <div
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1); // swipe left = next day
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button className="bb-icon-btn" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} onClick={() => step(-1)} aria-label="יום קודם">
          <ChevronRight size={18} />
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {isToday ? "היום · " : ""}יום {DOW_FULL_HE[day.getDay()]}, {day.getDate()}/{day.getMonth() + 1}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
            {hours.closed && !dayAppts.length ? "המספרה סגורה" : `${dayAppts.length} תורים · ₪${expected.toLocaleString("he-IL")} צפוי`}
          </div>
        </div>
        <button className="bb-icon-btn" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} onClick={() => step(1)} aria-label="יום הבא">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* week strip */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {strip.map((d) => {
          const k = fmtDateKey(d);
          const on = k === key;
          const open = isOpen(d);
          const has = appointments.some((a) => a.date === k && a.status !== "cancelled");
          return (
            <button key={k} onClick={() => setDay(new Date(d))}
              style={{
                flex: 1, border: "none", cursor: "pointer", borderRadius: 12, padding: "7px 0", fontFamily: "Heebo",
                background: on ? "var(--gold)" : "transparent", color: on ? "var(--on-gold)" : "var(--muted)",
                opacity: !open && !has && !on ? 0.4 : 1,
              }}>
              <div style={{ fontSize: 12 }}>{DOW_HE[d.getDay()]}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: on ? "var(--on-gold)" : k === todayKey ? "var(--accent-2)" : "var(--cream)" }}>{d.getDate()}</div>
              <div style={{ width: 5, height: 5, borderRadius: "50%", margin: "2px auto 0", background: has ? (on ? "var(--on-gold)" : "var(--gold)") : "transparent" }} />
            </button>
          );
        })}
      </div>

      {/* timeline */}
      {hourKeys.length === 0 ? (
        <EmptyState icon={CalendarDays} title={hours.closed ? "המספרה סגורה ביום הזה" : "אין תורים ואין שעות פנויות"} subtitle="החליקו או לחצו על החצים כדי לעבור יום" />
      ) : (
        <div>
          {hourKeys.map((h) => (
            <div key={h} style={{ display: "flex", gap: 10, minHeight: 44 }}>
              <div className="bb-mono-num" style={{ width: 42, fontSize: 12.5, fontWeight: 700, color: "var(--muted-dim)", paddingTop: 6, direction: "ltr", textAlign: "center", flexShrink: 0 }}>
                {String(h).padStart(2, "0")}:00
              </div>
              <div style={{ flex: 1, minWidth: 0, borderTop: "1px solid var(--border)", padding: "5px 0", display: "flex", flexDirection: "column", gap: 5 }}>
                {byHour[h].map((it, idx) => {
                  const showNow = isToday && nowMin >= it.at && (idx === byHour[h].length - 1 || nowMin < byHour[h][idx + 1].at) && Math.floor(nowMin / 60) === h;
                  const nowLine = showNow ? (
                    <div key={"now" + it.at} style={{ height: 2, background: "var(--danger)", position: "relative", margin: "1px 0" }}>
                      <span style={{ position: "absolute", right: -5, top: -4, width: 10, height: 10, borderRadius: "50%", background: "var(--danger)" }} />
                    </div>
                  ) : null;
                  if (it.kind === "free") {
                    return (
                      <React.Fragment key={"f" + it.at}>
                        <button onClick={() => { vibrate(10); onCreateAt(key, hhmm(it.at)); }}
                          style={{ border: "1.5px dashed var(--border-light)", background: "transparent", borderRadius: 12, padding: "9px 12px", fontFamily: "Heebo", fontSize: 13.5, fontWeight: 600, color: "var(--muted)", textAlign: "start", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          <Plus size={15} /> <span className="bb-mono-num">{hhmm(it.at)}</span> פנוי
                        </button>
                        {nowLine}
                      </React.Fragment>
                    );
                  }
                  const a = it.appt;
                  const c = ST[a.status] || ST.confirmed;
                  const dur = Number(a.duration) || DEFAULT_APPT_DURATION;
                  return (
                    <React.Fragment key={a.id}>
                      <div onClick={() => onSelect(a)}
                        style={{ background: c.bg, borderInlineStart: `4px solid ${c.border}`, borderRadius: 12, padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, minHeight: 50 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.clientName}</div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                            <span className="bb-mono-num">{a.time}</span>
                            {dur !== DEFAULT_APPT_DURATION ? ` · ${dur} דק׳` : ""}
                            {a.status === "done" && a.paymentMethod ? ` · ${payLabel(a.paymentMethod)} ✓` : ""}
                          </div>
                        </div>
                        <span className={`bb-badge ${a.status}`} style={{ flexShrink: 0 }}>{stLabel[a.status] || a.status}</span>
                      </div>
                      {nowLine}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted-dim)", marginTop: 10 }}>החלקה לצדדים = יום קודם / הבא · לחיצה על "פנוי" = תור חדש</div>
    </div>
  );
}

/* ---------- FULL MANUAL EDIT — every field on an appointment, one button away ---------- */
function EditAppointmentModal({ appt, initial = null, services, clients = [], onSave, onClose }) {
  const isCreate = !appt;
  const [selectedClientId, setSelectedClientId] = useState("");
  const defaultSvc = services.find((s) => (s.name || "").trim() === "תספורת גבר") || services[0];
  const [form, setForm] = useState({
    clientName: appt?.clientName || "",
    phone: appt?.phone || "",
    serviceId: appt?.serviceId || defaultSvc?.id || "",
    date: appt?.date || initial?.date || fmtDateKey(defaultWorkDate()),
    time: appt?.time || initial?.time || "10:00",
    duration: appt?.duration ?? DEFAULT_APPT_DURATION,
    price: appt?.price ?? (defaultSvc?.price ?? 0),
    status: appt?.status || "confirmed",
    paymentMethod: appt?.paymentMethod || "",
  });
  const [errors, setErrors] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);

  // autocomplete: clients whose first name (or any later word) starts with what was typed
  const nameQuery = form.clientName.trim();
  const nameSuggestions = isCreate && nameQuery
    ? clients
        .map((c) => {
          const n = (c.name || "").trim();
          const rank = n.startsWith(nameQuery) ? 0 : n.split(/\s+/).some((w) => w.startsWith(nameQuery)) ? 1 : -1;
          return { c, rank };
        })
        .filter((x) => x.rank >= 0 && x.c.name.trim() !== nameQuery)
        .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name, "he"))
        .map((x) => x.c)
    : [];

  function pickExistingClient(id) {
    setSelectedClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setForm((f) => ({ ...f, clientName: c.name, phone: c.phone || "", duration: c.defaultDuration || DEFAULT_APPT_DURATION }));
  }

  function save() {
    const v = validateAppointment(form);
    if (form.status === "done" && !form.paymentMethod) v.paymentMethod = "בחרו איך שולם";
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
    if (form.status === "done") {
      payload.paymentMethod = form.paymentMethod;
      if (appt?.status !== "done" || !appt?.paidAt) payload.paidAt = Date.now();
    }
    const base = isCreate ? { ...payload, existingClientId: selectedClientId || null } : { ...appt, ...payload };
    if (form.status !== "done") { delete base.paymentMethod; delete base.paidAt; }
    onSave(base);
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
        <input
          value={form.clientName}
          autoComplete="off"
          onChange={(e) => {
            setForm({ ...form, clientName: e.target.value });
            if (isCreate) { setSelectedClientId(""); setShowSuggest(true); }
          }}
          onFocus={() => isCreate && setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        />
        {showSuggest && nameSuggestions.length > 0 && (
          <div style={{ marginTop: 6, background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10, maxHeight: 220, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "6px 12px 2px" }}>{nameSuggestions.length} לקוחות נמצאו</div>
            {nameSuggestions.map((c) => (
              <div
                key={c.id}
                onMouseDown={(e) => { e.preventDefault(); pickExistingClient(c.id); setShowSuggest(false); }}
                style={{ padding: "10px 12px", cursor: "pointer", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 8 }}
              >
                <span style={{ fontWeight: 700, color: "var(--cream)" }}>{c.name}</span>
                {c.phone && <span style={{ fontSize: 12, color: "var(--muted)", direction: "ltr" }}>{c.phone}</span>}
              </div>
            ))}
          </div>
        )}
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
      {form.status === "done" && (
        <div className="bb-field" style={{ background: "var(--success-wash)", borderRadius: 12, padding: 12 }}>
          <label style={{ fontWeight: 700 }}>איך שולם?</label>
          <PayMethodButtons size="sm" value={form.paymentMethod} onPick={(m) => setForm({ ...form, paymentMethod: m })} />
          <FieldError msg={errors.paymentMethod} />
        </div>
      )}
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
                {e.note && <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: 3 }}>{e.note}</div>}
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
function MergeClientsModal({ group, appointments, onConfirm, onClose }) {
  // default: keep the record with the most history
  const ranked = [...group].sort((a, b) => computeClientStats(b.id, appointments).visits - computeClientStats(a.id, appointments).visits);
  const [keepId, setKeepId] = useState(ranked[0]?.id);
  const [name, setName] = useState(ranked[0]?.name || "");
  const phones = Object.values(
    group.reduce((m, c) => { const k = normPhone(c.phone); if (k && !m[k]) m[k] = c.phone.trim(); return m; }, {})
  ); // same number written differently counts once
  const [phone, setPhone] = useState(ranked.find((c) => c.phone)?.phone || "");
  const combined = group.reduce(
    (acc, c) => { const st = computeClientStats(c.id, appointments); return { visits: acc.visits + st.visits, spent: acc.spent + st.totalSpent }; },
    { visits: 0, spent: 0 }
  );
  if (!group.length) return null;
  return (
    <Modal title="מיזוג לקוחות" onClose={onClose}>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
        {group.length} רשומות יהפכו ללקוח אחד. כל התורים והתשלומים עוברים אליו:
        <b style={{ color: "var(--cream)" }}> {combined.visits} ביקורים · ₪{combined.spent.toLocaleString("he-IL")}</b>
      </div>

      <div className="bb-field">
        <label>השם שיישאר</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {group.map((c) => (
            <button key={c.id} type="button" onClick={() => { setKeepId(c.id); setName(c.name); }}
              className="bb-btn bb-btn-sm" style={{ justifyContent: "space-between", background: name === c.name ? "var(--gold-wash)" : "var(--bg-elevated)", border: `1.5px solid ${name === c.name ? "var(--gold)" : "var(--border)"}`, color: "var(--cream)" }}>
              <span style={{ fontWeight: 700 }}>{c.name}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{computeClientStats(c.id, appointments).visits} ביקורים</span>
            </button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="או הקלידו שם אחר" />
      </div>

      {phones.length > 1 && (
        <div className="bb-field">
          <label>הטלפון שיישאר</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {phones.map((p) => (
              <button key={p} type="button" onClick={() => setPhone(p)} className="bb-btn bb-btn-sm"
                style={{ direction: "ltr", background: phone === p ? "var(--gold-wash)" : "var(--bg-elevated)", border: `1.5px solid ${phone === p ? "var(--gold)" : "var(--border)"}`, color: "var(--cream)" }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      <button className="bb-btn bb-btn-primary" style={{ width: "100%", marginTop: 6 }} disabled={name.trim().length < 2}
        onClick={() => onConfirm({ keepId, name, phone })}>
        <CheckCheck size={17} /> מזג ל"{name.trim() || "..."}"
      </button>
    </Modal>
  );
}

const normPhone = (p) => (p || "").replace(/[^0-9]/g, "").replace(/^972/, "0");
const normName = (n) => (n || "").trim().replace(/\s+/g, " ").toLowerCase();

function ClientsTab({ clients, setClients, appointments, setAppointments, journalEntries, setJournalEntries, pushToast, undoStash, logActivity }) {
  const [modal, setModal] = useState(null); // null | 'add' | client obj (edit)
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSel, setMergeSel] = useState([]); // client ids picked for merging
  const [mergeOpen, setMergeOpen] = useState(false);
  const [lastMerge, setLastMerge] = useState(null); // snapshot for undo

  // likely duplicates: same phone, or exactly the same name
  const dupGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    const by = (keyFn) => {
      const map = {};
      clients.forEach((c) => { const k = keyFn(c); if (k) (map[k] = map[k] || []).push(c); });
      Object.values(map).forEach((g) => {
        if (g.length < 2) return;
        const sig = g.map((c) => c.id).sort().join("|");
        if (!seen.has(sig)) { seen.add(sig); groups.push(g); }
      });
    };
    by((c) => (normPhone(c.phone).length >= 9 ? normPhone(c.phone) : null));
    by((c) => normName(c.name) || null);
    return groups;
  }, [clients]);

  function startMerge(ids) {
    setMergeSel(ids);
    setMergeOpen(true);
  }

  function applyMerge({ keepId, name, phone }) {
    const group = clients.filter((c) => mergeSel.includes(c.id));
    const keep = group.find((c) => c.id === keepId) || group[0];
    const others = group.filter((c) => c.id !== keep.id);
    const otherIds = new Set(others.map((c) => c.id));
    const allNames = new Set(group.map((c) => normName(c.name)));
    const notes = [...new Set(group.map((c) => (c.note || "").trim()).filter(Boolean))].join(" · ");
    const merged = { ...keep, name: name.trim(), phone: phone || "", note: notes };

    // appointments: by client id, plus old rows that only carried the name
    const touches = (a) => otherIds.has(a.clientId) || a.clientId === keep.id || (!a.clientId && allNames.has(normName(a.clientName)));
    const prevAppts = appointments.filter(touches);
    const prevJournal = (journalEntries || []).filter((j) => allNames.has(normName(j.clientName)));

    setAppointments((as) => as.map((a) => (touches(a) ? { ...a, clientId: keep.id, clientName: merged.name, phone: a.phone || merged.phone } : a)));
    if (setJournalEntries) setJournalEntries((js) => js.map((j) => (allNames.has(normName(j.clientName)) ? { ...j, clientName: merged.name } : j)));
    setClients((cs) => cs.filter((c) => !otherIds.has(c.id)).map((c) => (c.id === keep.id ? merged : c)));

    setLastMerge({ group, prevAppts, prevJournal, name: merged.name, count: group.length });
    logActivity(`מוזגו ${group.length} לקוחות לשם אחד: ${merged.name} (${group.map((c) => c.name).join(", ")})`);
    setMergeOpen(false);
    setMergeMode(false);
    setMergeSel([]);
    vibrate(15);
  }

  function undoMerge() {
    if (!lastMerge) return;
    const { group, prevAppts, prevJournal } = lastMerge;
    const apptById = new Map(prevAppts.map((a) => [a.id, a]));
    const jById = new Map(prevJournal.map((j) => [j.id, j]));
    const ids = new Set(group.map((c) => c.id));
    setAppointments((as) => as.map((a) => apptById.get(a.id) || a));
    if (setJournalEntries) setJournalEntries((js) => js.map((j) => jById.get(j.id) || j));
    setClients((cs) => [...group, ...cs.filter((c) => !ids.has(c.id))]);
    logActivity(`בוטל מיזוג: ${lastMerge.name}`);
    setLastMerge(null);
    vibrate(10);
  }
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const blankForm = { name: "", phone: "", defaultDuration: String(DEFAULT_APPT_DURATION), date: "", time: "", note: "" };
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});

  const q = search.trim().toLowerCase();
  const visibleClients = q
    ? clients.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
    : clients;

  const segCounts = useMemo(() => {
    const m = {};
    clients.forEach((c) => { const sg = computeClientStats(c.id, appointments).segment; if (sg) m[sg] = (m[sg] || 0) + 1; });
    return m;
  }, [clients, appointments]);

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 100%", minWidth: 0, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="bb-mono-num" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
              {q ? `${visibleClients.length}/${clients.length}` : clients.length}
            </span>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>{q ? "תואמים לחיפוש" : "לקוחות בסה״כ"}</span>
          </div>
          {!q && Object.keys(segCounts).length > 0 && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
              {["vip", "regular", "new", "at_risk"].filter((k) => segCounts[k]).map((k) => `${segCounts[k]} ${{ vip: "VIP", regular: "קבועים", new: "חדשים", at_risk: "בסיכון נטישה" }[k]}`).join(" · ")}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {clients.length > 1 && (
          <button className={`bb-btn bb-btn-sm ${mergeMode ? "bb-btn-primary" : "bb-btn-ghost"}`} onClick={() => { setMergeMode(!mergeMode); setMergeSel([]); }}>
            <Users size={15} /> {mergeMode ? "סיום מיזוג" : "מיזוג לקוחות"}
          </button>
        )}
        <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={openAdd}><Plus size={15} /> לקוח חדש</button>
      </div>

      {lastMerge && (
        <div className="bb-card" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, background: "var(--success-wash)", borderColor: "transparent" }}>
          <CheckCheck size={18} color="var(--success)" />
          <div style={{ flex: 1, fontSize: 14 }}>{lastMerge.count} לקוחות מוזגו ל<b>{lastMerge.name}</b></div>
          <button className="bb-btn bb-btn-ghost bb-btn-sm" onClick={undoMerge}><Undo2 size={14} /> ביטול</button>
        </div>
      )}

      {mergeMode && (
        <div className="bb-card" style={{ marginBottom: 14, background: "var(--gold-wash)", borderColor: "transparent", fontSize: 13.5, lineHeight: 1.6 }}>
          סמנו את כל הרשומות של אותו אדם (2 או יותר) ולחצו <b>מזג</b>. כל התורים והתשלומים יעברו לשם אחד.
        </div>
      )}

      {!mergeMode && dupGroups.length > 0 && (
        <div className="bb-card" style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px 6px", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={15} color="var(--warning)" /> נראה כמו אותו לקוח ({dupGroups.length})
          </div>
          {dupGroups.slice(0, 5).map((g) => (
            <div key={g.map((c) => c.id).join("|")} className="bb-row" style={{ minHeight: 52 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5 }}>
                {g.map((c) => c.name).join(" · ")}
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{normPhone(g[0].phone) && g.every((c) => normPhone(c.phone) === normPhone(g[0].phone)) ? `אותו טלפון: ${g[0].phone}` : "אותו שם"}</div>
              </div>
              <button className="bb-btn bb-btn-primary bb-btn-sm" onClick={() => startMerge(g.map((c) => c.id))}>מזג</button>
            </div>
          ))}
        </div>
      )}

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
                <div className="bb-row bb-client-row" style={{ borderBottom: "none", cursor: "pointer", background: mergeMode && mergeSel.includes(c.id) ? "var(--gold-wash)" : undefined }}
                  onClick={() => (mergeMode ? setMergeSel((sel) => (sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])) : setExpanded(isOpen ? null : c.id))}>
                  {mergeMode ? (
                    <div aria-hidden style={{ width: 26, height: 26, borderRadius: 7, border: `2px solid ${mergeSel.includes(c.id) ? "var(--gold)" : "var(--border-light)"}`, background: mergeSel.includes(c.id) ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {mergeSel.includes(c.id) && <Check size={16} color="var(--on-gold)" strokeWidth={3} />}
                    </div>
                  ) : (
                    <div className="bb-avatar">{initials(c.name)}</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.name}</span>
                      {seg && (
                        <span className="bb-badge" style={{ background: seg.bg, color: seg.color, display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {stats.segment === "vip" && <Crown size={10} />} {seg.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ direction: "ltr", unicodeBidi: "isolate" }}>{c.phone || "ללא טלפון"}</span>
                      {(c.defaultDuration ?? DEFAULT_APPT_DURATION) !== DEFAULT_APPT_DURATION ? ` · ${c.defaultDuration} דק׳` : ""}
                    </div>
                  </div>
                  {!mergeMode && (
                    <>
                      <button className="bb-icon-btn" onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil size={15} /></button>
                      <button className="bb-icon-btn" onClick={(e) => { e.stopPropagation(); del(c); }}><Trash2 size={15} color="var(--danger)" /></button>
                      <ChevronDown size={16} color="var(--muted)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    </>
                  )}
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

      {mergeMode && mergeSel.length >= 2 && (
        <div style={{ position: "sticky", bottom: 12, zIndex: 20, marginTop: 12 }}>
          <button className="bb-btn bb-btn-primary" style={{ width: "100%", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }} onClick={() => setMergeOpen(true)}>
            <Users size={17} /> מזג {mergeSel.length} לקוחות לשם אחד
          </button>
        </div>
      )}

      {mergeOpen && (
        <MergeClientsModal
          group={clients.filter((c) => mergeSel.includes(c.id))}
          appointments={appointments}
          onConfirm={applyMerge}
          onClose={() => { setMergeOpen(false); if (!mergeMode) setMergeSel([]); }}
        />
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
            <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: -8, marginBottom: 14 }}>
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
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "var(--warning-wash)", border: "1px solid var(--warning-wash)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
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
                <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: 2 }}>
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
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>בחרו פלטת צבעים לעיצוב האפליקציה</div>
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
              <span style={{ fontSize: 12, color: themeId === id ? "var(--gold-bright)" : "var(--muted)", textAlign: "center" }}>{t.label}</span>
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
              <div style={{ fontSize: 12.5, color: "var(--muted-dim)", marginTop: 2 }}>
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
