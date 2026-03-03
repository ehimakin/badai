"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import DiaryTab from "./DiaryTab";
import AccountTab from "./AccountTab";

type TabId = "profile" | "account" | "messages" | "diary" | "posts" | "billing" | "referrals";

type Tab = {
  id: TabId;
  label: string;
  heading: string;
  body: string;
};

type MemberProfile = {
  fullName: string;
  displayName: string | null;
  memberTag: string | null;
  forename: string | null;
  surname: string | null;
  email: string;
  mobile: string | null;
  avatarUrl: string | null;
  twoFAEnabled: boolean;
};

type Props = {
  initialProfile: MemberProfile;
};

const TABS: Tab[] = [
  {
    id: "profile",
    label: "Profile",
    heading: "Profile",
    body: "Update your personal profile details and avatar.",
  },
  {
    id: "account",
    label: "Account",
    heading: "Account",
    body: "Manage your sign-in details and membership account settings.",
  },
  {
    id: "messages",
    label: "Messages",
    heading: "Messages",
    body: "View your inbox, reply to member messages, and manage notifications. This is placeholder content for now.",
  },
  {
    id: "diary",
    label: "Diary",
    heading: "Diary",
    body: "View your events calendar and manage bookings from one place.",
  },
  {
    id: "posts",
    label: "Posts",
    heading: "Posts",
    body: "Create and review your posts, drafts, and engagement stats. This is placeholder content for now.",
  },
  {
    id: "billing",
    label: "Billing",
    heading: "Billing",
    body: "Review your membership billing history, invoices, and payment methods. This is placeholder content for now.",
  },
  {
    id: "referrals",
    label: "Referrals",
    heading: "Referrals",
    body: "Track referral activity and rewards from members you have invited. This is placeholder content for now.",
  },
];

function asText(value: string | null | undefined) {
  return value ?? "";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read image"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

export default function MembersDashboardClient({ initialProfile }: Props) {
  const [active, setActive] = useState<TabId>("profile");
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  const [profile, setProfile] = useState<MemberProfile>(initialProfile);
  const [displayName, setDisplayName] = useState(
    asText(initialProfile.memberTag).replace(/^@/, "") || asText(initialProfile.displayName)
  );
  const [forename, setForename] = useState(asText(initialProfile.forename));
  const [surname, setSurname] = useState(asText(initialProfile.surname));
  const [email, setEmail] = useState(initialProfile.email);
  const [mobile, setMobile] = useState(asText(initialProfile.mobile));

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const avatarSrc = useMemo(() => {
    if (avatarPreviewUrl) return avatarPreviewUrl;
    if (profile.avatarUrl) return profile.avatarUrl;
    return "/profile.png";
  }, [avatarPreviewUrl, profile.avatarUrl]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/members/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          memberTag: displayName.trim() || null,
          forename: forename.trim() || null,
          surname: surname.trim() || null,
          email: email.trim(),
          mobile: mobile.trim() || null,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { error?: string; profile?: MemberProfile }
        | null;

      if (!res.ok) {
        throw new Error(body?.error || "Unable to save profile");
      }

      if (body?.profile) {
        setProfile(body.profile);
        setDisplayName(asText(body.profile.memberTag).replace(/^@/, "") || asText(body.profile.displayName));
        setForename(asText(body.profile.forename));
        setSurname(asText(body.profile.surname));
        setEmail(body.profile.email);
        setMobile(asText(body.profile.mobile));
      }

      setSaveMessage("Profile saved.");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  function onAvatarFileChange(file: File | null) {
    setAvatarError(null);

    if (!file) {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }

    if (file.size > 1_000_000) {
      setAvatarError("Please use an image under 1MB for now.");
      return;
    }

    const url = URL.createObjectURL(file);
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarPreviewUrl(url);
  }

  function closeAvatarModal() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setIsAvatarModalOpen(false);
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarError(null);
  }

  async function uploadAvatar() {
    if (!avatarFile) {
      setAvatarError("Select an image first.");
      return;
    }

    setAvatarBusy(true);
    setAvatarError(null);

    try {
      const avatarDataUrl = await fileToDataUrl(avatarFile);

      const res = await fetch("/api/members/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarDataUrl }),
      });

      const body = (await res.json().catch(() => null)) as
        | { error?: string; profile?: MemberProfile }
        | null;

      if (!res.ok) {
        throw new Error(body?.error || "Unable to upload avatar");
      }

      if (body?.profile) {
        setProfile(body.profile);
      }

      closeAvatarModal();
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : "Unable to upload avatar");
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-[240px_1fr]">
      <aside className="rounded-2xl border p-3">
        <nav className="space-y-1" aria-label="Members dashboard menu">
          {TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={[
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  isActive ? "bg-black text-white" : "bg-white text-black hover:bg-black/5",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="rounded-2xl border p-6">
        <h2 className="text-2xl font-bold">{current.heading}</h2>
        <p className="mt-3 max-w-3xl opacity-80">{current.body}</p>

        {active === "profile" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[180px_1fr]">
            <div
              className="relative mx-auto h-36 w-36"
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
            >
              <div className="h-full w-full overflow-hidden rounded-full border border-ink-200 bg-ink-50">
                <Image
                  src={avatarSrc}
                  alt="Profile avatar"
                  width={144}
                  height={144}
                  className="h-full w-full object-cover"
                />
              </div>

              {isAvatarHovered ? (
                <button
                  type="button"
                  className="absolute inset-x-0 bottom-0 mx-2 rounded-md bg-black px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => setIsAvatarModalOpen(true)}
                >
                  Edit avatar
                </button>
              ) : null}
            </div>

            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Member tag</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                      @
                    </span>
                    <input
                      className="w-full rounded-md border border-[#d1d5db] py-2 pl-7 pr-3"
                      value={displayName}
                      onChange={(e) =>
                        setDisplayName(
                          e.target.value
                            .replace(/@/g, "")
                            .replace(/\s+/g, "")
                            .replace(/[^a-zA-Z0-9_]/g, "")
                        )
                      }
                      placeholder="e.g drjanedoe"
                    />
                  </div>
                  <span className="mt-1 block text-xs opacity-70">
                    Enter just your tag. No spaces and no @ symbol.
                  </span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Forename</span>
                  <input
                    className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
                    value={forename}
                    onChange={(e) => setForename(e.target.value)}
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Surname</span>
                  <input
                    className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Email</span>
                  <input
                    type="email"
                    className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block font-semibold">Mobile</span>
                  <input
                    className="w-full rounded-md border border-[#d1d5db] px-3 py-2"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
                {saveMessage ? <span className="text-sm text-green-700">{saveMessage}</span> : null}
                {saveError ? <span className="text-sm text-red-600">{saveError}</span> : null}
              </div>
            </form>
          </div>
        ) : active === "diary" ? (
          <DiaryTab />
        ) : active === "account" ? (
          <AccountTab
            initialUsername={asText(profile.memberTag).replace(/^@/, "")}
            initialTwoFAEnabled={profile.twoFAEnabled}
          />
        ) : (
          <div className="mt-6 rounded-xl bg-black/5 p-4 text-sm opacity-80">
            Dummy panel content for the <span className="font-semibold">{current.label}</span> section.
          </div>
        )}
      </div>

      {isAvatarModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h3 className="text-lg font-bold">Update profile image</h3>
            <p className="mt-1 text-sm opacity-75">Choose an image and preview before upload.</p>

            <div className="mt-4 overflow-hidden rounded-xl border">
              <Image
                src={avatarSrc}
                alt="Avatar preview"
                width={600}
                height={400}
                className="h-56 w-full object-cover"
              />
            </div>

            <input
              className="mt-4 w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => onAvatarFileChange(e.target.files?.[0] ?? null)}
            />

            {avatarError ? <div className="mt-3 text-sm text-red-600">{avatarError}</div> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-outline" onClick={closeAvatarModal} disabled={avatarBusy}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={uploadAvatar} disabled={avatarBusy}>
                {avatarBusy ? "Uploading..." : "Upload image"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
