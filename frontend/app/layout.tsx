import "./globals.css";
import Link from "next/link";
import NavLink from "./components/NavLink";
import { getCurrentUser } from "@/lib/session";


export const metadata = {
  title: "British Dental AI Association",
  description: "Research. Education. Community",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const authHref = user ? "/members/logout" : "/members/login";
  const authLabel = user ? "Logout" : "Member Login";
  const membershipHref = user ? "/members" : "/membership";
  const membershipLabel = user ? "My membership" : "Join";

  return (
    <html lang="en">
      <body>
        {/* TOP BAR */}
        <div className="bg-brand-800 text-white text-sm">
          <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-90">
              <span>📍 Leeds, UK</span>
              <span>✉️ info@bdaia.org</span>
              <span>📞 +44 11 3 222 1110</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={authHref}
                className="hover:underline text-white/90 hover:text-white"
              >
                {authLabel}
              </Link>
              <Link
                href={membershipHref}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {membershipLabel}
              </Link>
            </div>
          </div>
        </div>


        {/* HEADER + NAV */}
        <header className="border-b">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-6">
            <Link href="/" className="block">
              <div className="text-lg font-extrabold leading-tight">British Dental AI Association</div>
              <div className="text-xs opacity-80">Education • Community • Technology</div>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/about">About</NavLink>
              <NavLink href="/membership">Membership</NavLink>
              <NavLink href="/events">Events</NavLink>
              <NavLink href="/education">CPD/Education</NavLink>
              <NavLink href="/resources">Resources</NavLink>
              <NavLink href="/news">News</NavLink>
              <NavLink href="/contact">Contact</NavLink>
            </nav>


            <div className="hidden md:flex items-center gap-2">
              <input
                className="h-9 w-64 rounded-md border px-3 text-sm"
                placeholder="Search..."
              />
              <button className="h-9 rounded-md border px-3 text-sm font-medium">
                Search
              </button>
            </div>
          </div>

          {/* MOBILE NAV (simple demo version) */}
          <div className="lg:hidden border-t">
            <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link className="hover:underline" href="/about">About</Link>
              <Link className="hover:underline" href="/membership">Membership</Link>
              <Link className="hover:underline" href="/events">Events</Link>
              <Link className="hover:underline" href="/education">CPD</Link>
              <Link className="hover:underline" href="/resources">Resources</Link>
              <Link className="hover:underline" href="/news">News</Link>
              <Link className="hover:underline" href="/contact">Contact</Link>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        {children}

        {/* FOOTER */}
        <footer className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4">
            <div className="space-y-2">
              <div className="font-extrabold">BDAIA</div>
              <p className="text-sm opacity-80">
                Supporting members with education, events, guidance, and resources.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="font-bold">Society</div>
              <div className="grid gap-1 opacity-90">
                <Link className="hover:underline" href="/about">About</Link>
                <Link className="hover:underline" href="/leadership">Leadership</Link>
                <Link className="hover:underline" href="/contact">Contact</Link>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="font-bold">Members</div>
              <div className="grid gap-1 opacity-90">
                <Link className="hover:underline" href="/membership">Join</Link>
                <Link className="hover:underline" href="/membership#benefits">Benefits</Link>
                <Link className="hover:underline" href="/members/login">Member Login</Link>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="font-bold">Learn</div>
              <div className="grid gap-1 opacity-90">
                <Link className="hover:underline" href="/education">CPD</Link>
                <Link className="hover:underline" href="/resources">Resources</Link>
                <Link className="hover:underline" href="/events">Events</Link>
              </div>
            </div>
          </div>

          <div className="border-t">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs opacity-75 flex flex-wrap items-center justify-between gap-2">
              <span>© {new Date().getFullYear()} British Dental AI Association. All rights reserved.</span>
              <span>Privacy • Cookies • Terms</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
