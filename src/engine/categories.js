// Decides which ticket category each part of the stands belongs to.
//
// Every stand section gets a zone from where it sits relative to the stage, so the same rule
// words work in every venue. A rule is { tier?, zone?, side?, rows?: [from, to], cat }; rows are
// counted from 1 and include both ends. The first rule whose named fields all match wins.

const list = (v) => (Array.isArray(v) ? v : [v]);

/** Where a stretch of a tier sits relative to the stage: { zone, side }. */
export function zoneOf(venue, stage, tier, u0, u1) {
  const p = venue.outline.ring((u0 + u1) / 2, tier.d0);
  const { halfX, halfZ } = venue.def.floor;
  const rel = (p.z - stage.frontZ) / (halfZ - stage.frontZ);   // 0 at the stage front, 1 at the far end
  let zone;
  if (rel < -0.03) zone = 'behind';
  else if (rel < 0.12) zone = 'beside';
  else if (Math.abs(p.x) < 0.6 * halfX && p.z > 0) zone = 'end';
  else if (p.z > 0.85 * halfZ) zone = 'cornerFar';
  else if (rel < 0.45) zone = 'sideNear';
  else if (rel < 0.75) zone = 'sideMid';
  else zone = 'sideFar';
  return { zone, side: p.x < 0 ? 'L' : 'R' };
}

/** Cuts a tier at every row boundary its rules name: [[r0, r1], ...], 0-based, half-open. */
export function tierBands(tier, rules) {
  const cuts = new Set([0, tier.rows]);
  for (const r of rules) {
    if (!r.rows || (r.tier && r.tier !== tier.id)) continue;
    cuts.add(Math.max(0, Math.min(tier.rows, r.rows[0] - 1)));
    cuts.add(Math.max(0, Math.min(tier.rows, r.rows[1])));
  }
  const at = [...cuts].sort((a, b) => a - b);
  return at.slice(1).map((b, i) => [at[i], b]);
}

/** The category of one band of one section, or null when no rule covers it (closed). */
export function pickCategory(rules, { tier, zone, side, r0, r1 }) {
  for (const r of rules) {
    if (r.tier && r.tier !== tier) continue;
    if (r.zone ? !list(r.zone).includes(zone) : zone === 'behind') continue;   // behind opens only by name
    if (r.side && r.side !== side) continue;
    if (r.rows && (r0 < r.rows[0] - 1 || r1 > r.rows[1])) continue;
    return r.cat;
  }
  return null;
}
