"use client";

import { useMemo, useState } from "react";

type Resource = {
  id: string;
  title: string;
  kind: string;
  storageKey: string;
  mimeType: string | null;
  isMembersOnly: boolean;
};

type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl?: string | null;
  description: string | null;
  cpdHours: number;
  level: string;
  tags: string[];
  resources: Resource[];
};

type Props = {
  isMember: boolean;
  userName: string | null;
  cpdOverview: null | {
    year: number;
    hoursCompleted: number;
    hoursTarget: number;
    lastCourse: string;
  };
  courses: Course[];
};

function letterKey(title: string) {
  const ch = title.trim().charAt(0).toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

function shortSummary(text: string, maxLen = 140) {
  const clean = text.trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

export default function EducationClient({ isMember, userName, cpdOverview, courses }: Props) {
  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.title.localeCompare(b.title)),
    [courses]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of sorted) {
      const k = letterKey(c.title);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [sorted]);

  const firstCourse = sorted[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstCourse?.id ?? null);

  const selected = useMemo(
    () => sorted.find((c) => c.id === selectedId) ?? firstCourse,
    [sorted, selectedId, firstCourse]
  );

  const progressPct =
    cpdOverview && cpdOverview.hoursTarget > 0
      ? Math.min(100, Math.round((cpdOverview.hoursCompleted / cpdOverview.hoursTarget) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Member-only CPD Overview */}
      {isMember && cpdOverview && (
        <section className="rounded-2xl border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold opacity-70">Your CPD overview</div>
              <div className="mt-1 text-xl font-bold">
                {userName ? `${userName} — ` : ""}{cpdOverview.year}
              </div>
              <div className="mt-1 text-sm opacity-80">
                Last completed: <span className="font-medium">{cpdOverview.lastCourse}</span>
              </div>
            </div>

            <div className="min-w-[240px]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold opacity-70">Progress</span>
                <span className="font-semibold">
                  {cpdOverview.hoursCompleted}/{cpdOverview.hoursTarget} hrs ({progressPct}%)
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-black" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mt-2 text-xs opacity-70">
                Demo CPD stats for now — we’ll connect real tracking next.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Split View */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: A–Z list */}
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-4 px-2 pb-3">
            <div>
              <div className="text-lg font-bold">Courses</div>
              <div className="text-sm opacity-70">A–Z</div>
            </div>
            <div className="text-sm font-semibold opacity-70">{sorted.length} total</div>
          </div>

          <div className="max-h-[70vh] overflow-auto px-2 pb-2">
            <div className="grid gap-6 sm:grid-cols-2">
              {Array.from(grouped.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([letter, items]) => (
                  <div key={letter}>
                    <div className="sticky top-0 -mx-2 mb-2 bg-white/80 px-2 py-1 backdrop-blur">
                      <div className="text-sm font-extrabold opacity-80">{letter}</div>
                    </div>

                    <ul className="space-y-1">
                      {items.map((c) => {
                        const active = c.id === selectedId;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(c.id)}
                              className={[
                                "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                                active
                                  ? "border border-black bg-black text-white"
                                  : "border border-transparent hover:border-black/20 hover:bg-black/5",
                              ].join(" ")}
                            >
                              <div className="font-semibold">{c.title}</div>
                              <div className={active ? "opacity-90" : "opacity-70"}>
                                {c.cpdHours} hr • {c.level}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </div>
          </div>

          {!isMember && (
            <div className="mt-4 rounded-xl bg-black/5 p-3 text-sm opacity-80">
              Members see CPD tracking and completion records.
            </div>
          )}
        </div>

        {/* RIGHT: Preview pane */}
        <div className="rounded-2xl border p-6">
          {!selected ? (
            <div className="opacity-70">No course selected.</div>
          ) : (
            <>
              <div className="text-sm font-semibold opacity-70">Course preview</div>
              <h2 className="mt-2 text-2xl font-extrabold">{selected.title}</h2>
              <p className="mt-3 opacity-85">{shortSummary(selected.summary)}</p>

              <div className="mt-5 flex justify-center">
                <img
                  src={selected.imageUrl || "https://placehold.co/1200x675?text=Course+Preview"}
                  alt={`${selected.title} course preview`}
                  className="w-4/5 rounded-xl border object-cover"
                  loading="lazy"
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-black/5 p-4">
                  <div className="text-xs font-semibold opacity-70">CPD hours</div>
                  <div className="mt-1 text-lg font-bold">{selected.cpdHours}</div>
                </div>
                <div className="rounded-xl bg-black/5 p-4">
                  <div className="text-xs font-semibold opacity-70">Level</div>
                  <div className="mt-1 text-lg font-bold">{selected.level}</div>
                </div>

                <div className="rounded-xl bg-black/5 p-4 sm:col-span-2">
                  <div className="text-xs font-semibold opacity-70">Tags</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.tags?.length ? (
                      selected.tags.map((t) => (
                        <span key={t} className="rounded-full border px-3 py-1 text-xs font-semibold">
                          {t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs opacity-70">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {isMember ? (
                  <>
                    <button type="button" className="btn-primary">Start course</button>
                    <button type="button" className="btn-outline">Mark as completed (demo)</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn-primary">View details</button>
                    <button type="button" className="btn-outline">Become a member</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
