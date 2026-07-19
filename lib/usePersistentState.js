"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ============================================================================
   usePersistentList(table, seed, opts)

   opts.enabled      — when false, nothing is loaded from the server at all
                       (privacy: client mode never downloads admin-only tables)
   opts.publicFields — a PostgREST projection string; when set, the list loads
                       ONLY those fields (privacy: clients get slot times, never
                       names/phones) and becomes read-only against the server —
                       writes then go through targeted helpers in the app.
   Otherwise: full load + diff-sync writes + realtime, as before.
   ============================================================================ */
export function usePersistentList(table, seed = [], opts = {}) {
  const { enabled = true, publicFields = null } = opts;
  const [list, _setList] = useState(isSupabaseConfigured ? [] : seed);
  const applyingRemote = useRef(false);
  const modeRef = useRef({ enabled, publicFields });
  modeRef.current = { enabled, publicFields };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!enabled) {
      _setList([]);
      return;
    }
    let mounted = true;

    async function loadAll() {
      const selection = publicFields || "id,data";
      const { data, error } = await supabase.from(table).select(selection);
      if (!mounted || error) return;
      let items;
      if (publicFields) {
        // flag sanitized rows so they are never written back over full records
        items = (data || []).map((r) => ({ ...r, __sanitized: true }));
      } else if ((data || []).length === 0 && seed.length > 0) {
        await supabase.from(table).upsert(seed.map((item) => ({ id: item.id, data: item })));
        items = seed;
      } else {
        items = (data || []).map((r) => r.data);
      }
      applyingRemote.current = true;
      _setList(items);
      applyingRemote.current = false;
    }

    loadAll();

    const channel = supabase
      .channel(`rt-${table}-${publicFields ? "pub" : "full"}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => loadAll())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, enabled, publicFields]);

  const setList = useCallback(
    (updater) => {
      _setList((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const { enabled: en, publicFields: pf } = modeRef.current;
        // diff-sync only in full mode; sanitized/disabled modes write via helpers
        if (isSupabaseConfigured && en && !pf && !applyingRemote.current) {
          syncDiff(table, prev, next);
        }
        return next;
      });
    },
    [table]
  );

  return [list, setList];
}

async function syncDiff(table, prev, next) {
  try {
    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set(next.map((i) => i.id));

    const upserts = next
      .filter((i) => !i.__sanitized) // sanitized projections must never overwrite full rows
      .filter((i) => {
        const old = prevById.get(i.id);
        return !old || JSON.stringify(old) !== JSON.stringify(i);
      })
      .map((i) => ({ id: i.id, data: i, updated_at: new Date().toISOString() }));

    const deletions = prev.filter((i) => !nextIds.has(i.id)).map((i) => i.id);

    // row-by-row: a single conflicting row won't silently kill the whole batch
    for (const row of upserts) {
      const { error } = await supabase.from(table).upsert(row);
      if (error) console.error(`upsert failed on ${table}/${row.id}:`, error.message);
    }
    if (deletions.length) await supabase.from(table).delete().in("id", deletions);
  } catch (e) {
    console.error(`sync failed for ${table}:`, e);
  }
}

/* useSetting — unchanged: persisted single value, live-synced */
export function useSetting(key, defaultValue) {
  const [value, _setValue] = useState(defaultValue);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;

    async function load() {
      const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
      if (!mounted) return;
      if (data) {
        applyingRemote.current = true;
        _setValue(data.value);
        applyingRemote.current = false;
      } else if (defaultValue !== undefined && defaultValue !== null) {
        await supabase.from("settings").upsert({ key, value: defaultValue });
      }
    }

    load();

    const channel = supabase
      .channel(`rt-setting-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings", filter: `key=eq.${key}` }, (payload) => {
        if (payload.new && "value" in payload.new) {
          applyingRemote.current = true;
          _setValue(payload.new.value);
          applyingRemote.current = false;
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (updater) => {
      _setValue((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (isSupabaseConfigured && !applyingRemote.current) {
          supabase.from("settings").upsert({ key, value: next, updated_at: new Date().toISOString() }).then(() => {});
        }
        return next;
      });
    },
    [key]
  );

  return [value, setValue];
}
