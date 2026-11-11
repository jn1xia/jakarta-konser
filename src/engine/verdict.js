// Picks the sentences of the one-line verdict under the seat title. Returns string keys;
// the panel turns them into Indonesian or English.

export function verdictKeys(facts, section, row) {
  const d = facts.dStage;
  const out = [d < 22 ? 'v.close' : d < 55 ? 'v.clear' : d < 100 ? 'v.small' : 'v.far'];
  if (facts.mainVis === 0) out.push('v.screenHidden');
  else if (facts.mainVis < 0.75) out.push('v.screenPart');
  else if (facts.off > 55) out.push('v.screenAngle');
  if (section.kind === 'floor' && section.standing && row < 3) out.push('v.pit');
  if (facts.blockedByTower) out.push('v.tower');
  return out;
}
