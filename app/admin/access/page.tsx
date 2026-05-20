import {
  clearAccessAuthLinkAction,
  createAccessMembershipAction,
  deleteAccessMembershipAction,
  generateAccessInviteLinkAction,
} from "@/app/admin/access/actions";
import { PersistenceBadge } from "@/components/persistence-badge";
import { listAppUserMembershipRows } from "@/lib/auth-access";
import {
  getAdminPersistenceMode,
  listCoachProfileRows,
  listManagerProfileRows,
  listPlayerRosterRows,
} from "@/lib/admin-repository";

function getLinkedLabel(
  row: Awaited<ReturnType<typeof listAppUserMembershipRows>>[number],
  options: {
    players: Array<{ id: string; label: string }>;
    coaches: Array<{ id: string; label: string }>;
    managers: Array<{ id: string; label: string }>;
  },
) {
  if (row.role === "player") {
    return options.players.find((player) => player.id === row.playerRosterMembershipId)?.label ?? "No player selected";
  }

  if (row.role === "coach") {
    return options.coaches.find((coach) => coach.id === row.coachProfileId)?.label ?? "No coach selected";
  }

  if (row.role === "manager") {
    return options.managers.find((manager) => manager.id === row.managerProfileId)?.label ?? "No manager selected";
  }

  return "Admin access";
}

export default async function AdminAccessPage() {
  const [memberships, playerRows, coachRows, managerRows] = await Promise.all([
    listAppUserMembershipRows(),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);
  const persistenceMode = getAdminPersistenceMode();
  const playerOptions = playerRows
    .filter((row) => row.teamType === "ours")
    .map((row) => ({
      id: row.id,
      label: `${row.name} ${row.jersey} · ${row.team} · ${row.season}`,
    }));
  const coachOptions = coachRows.map((row) => ({
    id: row.id,
    label: `${row.displayName} · ${row.fullName}`,
  }));
  const managerOptions = managerRows.map((row) => ({
    id: row.id,
    label: `${row.displayName} · ${row.fullName}`,
  }));

  return (
    <>
      <PersistenceBadge mode={persistenceMode} />
      <header className="admin-header">
        <div className="admin-header-copy">
          <p className="eyebrow-label">Admin / Access</p>
          <h2>User Login Access</h2>
          <p>
            Create a role-linked access record, then send the generated invite link directly by text or email.
          </p>
        </div>
      </header>

      <section className="table-grid">
        <article className="table-card admin-directory-card">
          <h3>Access Directory</h3>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Linked Profile</th>
                <th>Status</th>
                <th>Invite</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((row) => (
                <tr key={row.id}>
                  <td>{row.email ?? "Not set yet"}</td>
                  <td>{row.role}</td>
                  <td>{getLinkedLabel(row, { players: playerOptions, coaches: coachOptions, managers: managerOptions })}</td>
                  <td>
                    <span className={`pill ${row.status === "active" ? "success" : row.status === "inactive" ? "danger" : "alt"}`}>
                      {row.status === "pending_invite" ? "Pending Invite" : row.status}
                    </span>
                  </td>
                  <td>
                    {row.inviteLink ? (
                      <div className="invite-link-stack">
                        <input value={row.inviteLink} readOnly />
                        <a
                          href={row.inviteLink}
                          target="_blank"
                          rel="noreferrer"
                          className="button-link ghost"
                        >
                          Open
                        </a>
                      </div>
                    ) : (
                      <span className="meta">No invite generated yet.</span>
                    )}
                  </td>
                  <td>
                    <div className="management-actions">
                      <form action={generateAccessInviteLinkAction}>
                        <input type="hidden" name="membershipId" value={row.id} />
                        <button className="button-link secondary" type="submit">
                          New Invite
                        </button>
                      </form>
                      {row.authUserId ? (
                        <form action={clearAccessAuthLinkAction}>
                          <input type="hidden" name="membershipId" value={row.id} />
                          <button className="button-link ghost" type="submit">
                            Unlink
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteAccessMembershipAction}>
                        <input type="hidden" name="membershipId" value={row.id} />
                        <button className="button-link ghost danger" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {memberships.length === 0 ? (
                <tr>
                  <td colSpan={6}>No access memberships yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </article>
      </section>

      <section className="table-grid">
        <div className="two-column">
          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Create Admin Login</p>
            <h3>Admin Access</h3>
            <form action={createAccessMembershipAction} className="form-grid">
              <input type="hidden" name="role" value="admin" />
              <div className="field-group field-span-2">
                <label htmlFor="admin-access-email">Email</label>
                <input id="admin-access-email" name="email" type="email" required />
              </div>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">Create Admin Invite</button>
              </div>
            </form>
          </article>

          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Invite Coach</p>
            <h3>Coach Access</h3>
            <form action={createAccessMembershipAction} className="form-grid">
              <input type="hidden" name="role" value="coach" />
              <div className="field-group field-span-2">
                <label htmlFor="coach-access-profile">Coach Profile</label>
                <select id="coach-access-profile" name="coachProfileId" required defaultValue="">
                  <option value="" disabled>Choose coach</option>
                  {coachOptions.map((coach) => (
                    <option key={coach.id} value={coach.id}>{coach.label}</option>
                  ))}
                </select>
              </div>
              <p className="meta field-span-2">Generate the link now. The coach can add their own email when they open it.</p>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">Create Coach Invite Link</button>
              </div>
            </form>
          </article>

          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Invite Manager</p>
            <h3>Manager Access</h3>
            <form action={createAccessMembershipAction} className="form-grid">
              <input type="hidden" name="role" value="manager" />
              <div className="field-group field-span-2">
                <label htmlFor="manager-access-profile">Manager Profile</label>
                <select id="manager-access-profile" name="managerProfileId" required defaultValue="">
                  <option value="" disabled>Choose manager</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.label}</option>
                  ))}
                </select>
              </div>
              <p className="meta field-span-2">Generate the link now. The manager can add their own email when they open it.</p>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">Create Manager Invite Link</button>
              </div>
            </form>
          </article>

          <article className="panel-card admin-create-grid">
            <p className="eyebrow-label">Invite Player</p>
            <h3>Player Access</h3>
            <form action={createAccessMembershipAction} className="form-grid">
              <input type="hidden" name="role" value="player" />
              <div className="field-group field-span-2">
                <label htmlFor="player-access-profile">Player Profile</label>
                <select id="player-access-profile" name="playerRosterMembershipId" required defaultValue="">
                  <option value="" disabled>Choose player</option>
                  {playerOptions.map((player) => (
                    <option key={player.id} value={player.id}>{player.label}</option>
                  ))}
                </select>
              </div>
              <p className="meta field-span-2">Generate the link now. The player can add their own email when they open it.</p>
              <div className="action-row field-span-2">
                <button className="button-link" type="submit">Create Player Invite Link</button>
              </div>
            </form>
          </article>
        </div>
      </section>
    </>
  );
}
