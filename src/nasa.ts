import { useEffect, useState } from "react";

// Get a free key at https://api.nasa.gov and set VITE_NASA_API_KEY in Vercel.
// DEMO_KEY works but has a low rate limit.
const KEY = (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? "DEMO_KEY";

export interface Apod { title: string; url: string; explanation: string; media_type: string }
export interface NeoSummary { count: number; hazardous: number; date: string }
export interface NasaImage { url: string; title: string }

export async function fetchApod(signal?: AbortSignal): Promise<Apod> {
  const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${KEY}`, { signal });
  if (!r.ok) throw new Error(`APOD ${r.status}`);
  return r.json();
}

export async function fetchNeo(signal?: AbortSignal): Promise<NeoSummary> {
  const date = new Date().toISOString().slice(0, 10);
  const r = await fetch(
    `https://api.nasa.gov/neo/rest/v1/feed?start_date=${date}&end_date=${date}&api_key=${KEY}`, { signal });
  if (!r.ok) throw new Error(`NeoWs ${r.status}`);
  const data = await r.json();
  const list: { is_potentially_hazardous_asteroid: boolean }[] = data.near_earth_objects?.[date] ?? [];
  return { count: list.length, hazardous: list.filter((o) => o.is_potentially_hazardous_asteroid).length, date };
}

export async function fetchNasaImage(query: string, signal?: AbortSignal): Promise<NasaImage | null> {
  const r = await fetch(
    `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`, { signal });
  if (!r.ok) return null;
  const data = await r.json();
  const item = data.collection?.items?.[0];
  const url: string | undefined = item?.links?.[0]?.href;
  return url ? { url, title: item?.data?.[0]?.title ?? query } : null;
}

/** Tiny fetch hook: returns null while loading or on error (the game works without NASA data). */
export function useFetch<T>(fn: (signal: AbortSignal) => Promise<T>, key: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fn(c.signal).then(setData).catch(() => {});
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}
