/**
 * Shared text helpers for the story card engine.
 *
 * `cleanEpisodeTitle` used to be copy-pasted verbatim in three places:
 * ShareCardGenerator.astro (frontmatter + `openStoryGenerator`) and
 * api/episodes/story.ts (`cleanTitle`). One implementation now.
 */

const FEATURING_MARKERS = [' ft.', ' feat.', ' ft ', ' feat '];

/** Strips a trailing "ft. X" / "feat. X" from an episode title (the featured guest is shown separately). */
export function cleanEpisodeTitle(title: string): string {
  let clean = title;
  const lower = clean.toLowerCase();
  for (const marker of FEATURING_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx !== -1) {
      clean = clean.substring(0, idx).trim();
      break;
    }
  }
  return clean;
}
