"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ============================================================================
   usePersistentList(table, seed)
   A drop-in replacement for useState([]) that:
   1. Loads all rows from the Supabase table on mount (seeding defaults if empty)
   2. Persists every local change (diff -> upsert / delete)
   3. Subscribes to Realtime so changes from OTHER devices appear live
      (this is how the admin sees client bookings the moment they happen)
   When Supabase isn't configured it silently behaves as plain local state.
   ============================================================================ */
export function usePersistentList(table, seed = []) {
  const [list, _setList] = useState(isSupabaseConfigured ? [] : seed);
  const listRef = useRef(list);
  listRef.current = list;
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let mounted = true;

    async function loadAll() {
      const { data, error } = await supabase.from(table).select("id,data");
      if (!mounted || error) return;
      if ((data || []).length === 0 && seed.length > 0) {
        // first ever run: seed defaults (e.g. starter services)
        await supabase.from(table).upsert(seed.map((item) => ({ id: item.id, data: item })));
        applyingRemote.current = true;
        _setList(seed);
        applyingRemote.current = false;
      } else {
        applyingRemote.current = true;
        _setList((data || []).map((r) => r.data));
        applyingRemote.current = false;
      }
    }

    loadAll();

    const channel = supabase
      .channel(`rt-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        // simplest correct merge: refetch the table on any remote change
        loadAll();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const setList = useCallback(
    (updater) => {
      _setList((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (isSupabaseConfigured && !applyingRemote.current) {
          syncDiff(table, prev, next);
        }
        return next;
      });
    },
    [table]
  );

  return [list, setList];
}

/* writes only what changed: upserts new/edited items, deletes removed ids */
async function syncDiff(table, prev, next) {
  try {
    const prevById = new Map(prev.map((i) => [i.id, i]));
    const nextIds = new Set(next.map((i) => i.id));

    const upserts = next
      .filter((i) => {
        const old = prevById.get(i.id);
        return !old || JSON.stringify(old) !== JSON.stringify(i);
      })
      .map((i) => ({ id: i.id, data: i, updated_at: new Date().toISOString() }));

    const deletions = prev.filter((i) => !nextIds.has(i.id)).map((i) => i.id);

    if (upserts.length) await supabase.from(table).upsert(upserts);
    if (deletions.length) await supabase.from(table).delete().in("id", deletions);
  } catch (e) {
    console.error(`sync failed for ${table}:`, e);
  }
}

/* ============================================================================
   useSetting(key, defaultValue) — persisted single value (business name,
   weekly hours, theme, admin email, logo), also live-synced across devices
   ============================================================================ */
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
