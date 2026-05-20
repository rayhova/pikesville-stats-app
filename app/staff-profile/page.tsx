import { FrontendMenuLinks } from "@/components/frontend-menu-links";
import { ResponsivePageActions } from "@/components/responsive-page-actions";
import { StaffProfileForm } from "@/components/staff-profile-form";
import { requireAccessRole } from "@/lib/access-control";
import { getAdminProfileByAuthUser, listCoachProfiles } from "@/lib/admin-repository";

export default async function StaffProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAccessRole(["coach", "admin"]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const saved = resolvedSearchParams?.saved === "1";

  if (session.role === "coach") {
    const coachProfiles = await listCoachProfiles();
    const coachProfile = coachProfiles.find((profile) => profile.id === session.coachProfileId);

    if (!coachProfile) {
      throw new Error("Coach profile not found.");
    }

    return (
      <main className="page-shell">
        <header className="admin-header">
          <div className="admin-header-copy">
            <p className="eyebrow-label">Staff Profile</p>
            <h2>Edit Profile</h2>
            <p>Update your staff photo and bio. Your staff role is managed from the admin side.</p>
          </div>
          <ResponsivePageActions menuLabel="Menu">
            <FrontendMenuLinks session={session} />
          </ResponsivePageActions>
        </header>

        <section className="table-grid">
          <article className="panel-card">
            {saved ? <p className="form-success">Profile saved.</p> : null}
            <StaffProfileForm
              profile={coachProfile}
              roleLabel="Coach"
              canEditRole={false}
            />
          </article>
        </section>
      </main>
    );
  }

  if (!session.authUserId) {
    throw new Error("Admin session is missing an auth user.");
  }

  const adminProfile = await getAdminProfileByAuthUser({
    authUserId: session.authUserId,
    authEmail: session.authEmail,
  });
  const resolvedAdminProfile = adminProfile ?? {
    displayName: session.authEmail?.split("@")[0] ?? "Admin",
    fullName: session.authEmail?.split("@")[0] ?? "Admin",
    staffRole: "Administrator",
    bio: "",
    photoUrl: undefined,
  };

  return (
    <main className="page-shell">
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Staff Profile</p>
          <h2>Edit Profile</h2>
          <p>Update your display name, role label, photo, and bio for the program.</p>
        </div>
        <ResponsivePageActions menuLabel="Menu">
          <FrontendMenuLinks session={session} />
        </ResponsivePageActions>
      </header>

      <section className="table-grid">
        <article className="panel-card">
          {saved ? <p className="form-success">Profile saved.</p> : null}
          <StaffProfileForm
            profile={resolvedAdminProfile}
            roleLabel="Administrator"
            canEditRole
          />
        </article>
      </section>
    </main>
  );
}
