import Link from "next/link";

type PrepSection = "scouting" | "game-plan" | "timeout";

export function GamePrepNav({
  basePath,
  activeSection,
  showStrategicPrep = true,
}: Readonly<{
  basePath: string;
  activeSection: PrepSection;
  showStrategicPrep?: boolean;
}>) {
  return (
    <div className="prep-section-nav">
      <Link
        href={basePath}
        className={`button-link ghost ${activeSection === "scouting" ? "active" : ""}`}
      >
        Scouting Report
      </Link>
      {showStrategicPrep ? (
        <>
          <Link
            href={`${basePath}/game-plan`}
            className={`button-link ghost ${activeSection === "game-plan" ? "active" : ""}`}
          >
            Game Plan Card
          </Link>
          <Link
            href={`${basePath}/timeout`}
            className={`button-link ghost ${activeSection === "timeout" ? "active" : ""}`}
          >
            Timeout Card
          </Link>
        </>
      ) : null}
    </div>
  );
}
