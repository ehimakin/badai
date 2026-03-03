import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import MembersDashboardClient from "./MembersDashboardClient";


export default async function MembersHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/members/login");

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-extrabold">Members Area</h1>
      <p className="mt-3 opacity-80">Welcome, {user.displayName || user.fullName}.</p>

      <MembersDashboardClient
        initialProfile={{
          fullName: user.fullName,
          displayName: user.displayName,
          memberTag: user.memberTag,
          forename: user.forename,
          surname: user.surname,
          email: user.email,
          mobile: user.mobile,
          avatarUrl: user.avatarUrl,
        }}
      />
    </main>
  );
}
