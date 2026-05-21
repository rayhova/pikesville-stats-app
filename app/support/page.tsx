export default function SupportPage() {
  return (
    <main className="page-shell legal-page-shell">
      <section className="panel-card legal-panel">
        <p className="eyebrow-label">Pikesville MBB App</p>
        <h1>Support</h1>
        <p className="lede">
          Need help signing in, accepting an invite, resetting a password, getting alerts, or using the app?
          Contact the Pikesville MBB app administrator.
        </p>

        <div className="legal-copy">
          <h2>Contact</h2>
          <p>
            Email: <a href="mailto:raymond.gothaii@gmail.com">raymond.gothaii@gmail.com</a>
          </p>

          <h2>Common Help Topics</h2>
          <ul>
            <li>Invite links connect your account to your player, coach, manager, or admin profile.</li>
            <li>Password resets are sent to the email address used for your account.</li>
            <li>Push alerts require device notification permission.</li>
            <li>For schedule, RSVP, assignment, or profile issues, include your name and role in the email.</li>
          </ul>

          <h2>App Access</h2>
          <p>
            Pikesville MBB App is private and requires an approved team account. If you are part of the program
            and cannot access the app, ask the program administrator for a new invite link.
          </p>
        </div>
      </section>
    </main>
  );
}
