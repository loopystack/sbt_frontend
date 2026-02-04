/**
 * Leagues that run their season within a single calendar year
 * (e.g. Jan–Dec or Mar–Nov) instead of cross-year (e.g. Aug–May).
 * Used to show "2026" vs "2025/2026" and to filter by the correct season year.
 *
 * Sources: Brazil Série A/B, Argentina, Sweden Allsvenskan, Norway Eliteserien,
 * Japan J.League (pre-2026), Uruguay, Paraguay, Peru, Chile, Venezuela, Nordic leagues.
 */
const SAME_YEAR_SEASON_COUNTRY_NAMES = new Set([
  "Brazil",
  "Argentina",
  "Sweden",
  "Norway",
  "Japan",
  "Uruguay",
  "Paraguay",
  "Peru",
  "Chile",
  "Venezuela",
  "Finland",
  "Denmark",
  "USA", // MLS pre-2027
  "Canada",
]);

/**
 * Whether the given country uses a same-calendar-year season
 * (season labeled as "2026") rather than cross-year ("2025/2026").
 */
export function isSameYearSeasonCountry(countryName: string | undefined): boolean {
  if (!countryName?.trim()) return false;
  return SAME_YEAR_SEASON_COUNTRY_NAMES.has(countryName.trim());
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Years to show in the Results season selector.
 * - Same-year leagues: current year and previous years (e.g. 2026, 2025, 2024, 2023, 2022).
 * - Cross-year leagues: start year of season (e.g. 2025 for 2025/2026, 2024, 2023, 2022, 2021).
 */
export function getSeasonYearsForResults(sameYearSeason: boolean): number[] {
  if (sameYearSeason) {
    return [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3, CURRENT_YEAR - 4];
  }
  return [
    CURRENT_YEAR - 1,
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 3,
    CURRENT_YEAR - 4,
    CURRENT_YEAR - 5,
  ];
}

/**
 * Default season year when opening Results.
 * Same-year: current year (e.g. 2026). Cross-year: previous year as start (e.g. 2025 for 2025/2026).
 */
export function getDefaultResultsSeasonYear(sameYearSeason: boolean): number {
  return sameYearSeason ? CURRENT_YEAR : CURRENT_YEAR - 1;
}

/**
 * Format season for display: "2026" for same-year, "2025/2026" for cross-year.
 */
export function formatSeasonLabel(
  year: number | undefined,
  sameYearSeason: boolean
): string {
  if (year === undefined) return "";
  return sameYearSeason ? String(year) : `${year}/${year + 1}`;
}
