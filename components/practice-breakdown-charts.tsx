export function PracticeBreakdownCharts({
  data,
}: Readonly<{
  data: Array<{ label: string; minutes: number }>;
}>) {
  if (data.length === 0) {
    return null;
  }

  const totalMinutes = data.reduce((sum, item) => sum + item.minutes, 0);
  const colors = [
    "#5fd5d5",
    "#4f7cff",
    "#f59e0b",
    "#34d399",
    "#f87171",
    "#a78bfa",
    "#fb7185",
    "#facc15",
  ];

  let cursor = 0;
  const gradientStops = data
    .map((item, index) => {
      const start = cursor;
      const end = cursor + (item.minutes / totalMinutes) * 100;
      cursor = end;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <section className="table-grid">
      <div className="two-column practice-chart-grid">
        <article className="panel-card">
          <p className="eyebrow-label">Practice Breakdown</p>
          <h3>Skill Mix</h3>
          <div className="practice-pie-layout">
            <div
              className="practice-pie-chart"
              style={{ backgroundImage: `conic-gradient(${gradientStops})` }}
              aria-hidden="true"
            />
            <div className="practice-chart-legend">
              {data.map((item, index) => (
                <div key={item.label} className="practice-legend-row">
                  <span
                    className="practice-legend-swatch"
                    style={{ backgroundColor: colors[index % colors.length] }}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  <strong>{item.minutes} min</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel-card">
          <p className="eyebrow-label">Minutes By Skill</p>
          <h3>Duration</h3>
          <div className="practice-bar-chart">
            {data.map((item, index) => (
              <div key={item.label} className="practice-bar-row">
                <div className="practice-bar-meta">
                  <span>{item.label}</span>
                  <strong>{item.minutes} min</strong>
                </div>
                <div className="practice-bar-track">
                  <div
                    className="practice-bar-fill"
                    style={{
                      width: `${(item.minutes / totalMinutes) * 100}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
