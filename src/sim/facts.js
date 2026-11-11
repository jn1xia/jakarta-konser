// Measures the view from a seat: distances, the angle to the main screen, how much of that
// screen a sightline check can see, and whether a tower or the sound desk is in the way.

import { D2R } from '../engine/geometry.js';

const THREE = window.THREE;
const ray = new THREE.Raycaster();

/** Share of a screen that is in view, from rays cast to a 6 x 4 grid of points on it. */
function screenVisibility(ctx, eyePos, scr) {
  const centre = new THREE.Vector3(scr.c[0], scr.c[1], scr.c[2]);
  const normal = new THREE.Vector3(scr.n[0], scr.n[1], scr.n[2]);
  if (eyePos.clone().sub(centre).dot(normal) <= 0.5) return 0;          // behind or edge-on
  const right = new THREE.Vector3(Math.cos(scr.rot || 0), 0, -Math.sin(scr.rot || 0));
  let seen = 0, total = 0;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const pt = centre.clone().addScaledVector(right, ((i + 0.5) / 6 - 0.5) * scr.w);
    pt.y += ((j + 0.5) / 4 - 0.5) * scr.h;
    const dir = pt.sub(eyePos), len = dir.length();
    ray.set(eyePos, dir.normalize()); ray.near = 0.05; ray.far = len - 0.4;
    total++;
    if (!ray.intersectObjects(ctx.obstacles, false).length) seen++;
  }
  return seen / total;
}

export function computeFacts(ctx, model, eyePos) {
  const { stage } = model, main = stage.screens[0];
  ctx.scene.updateMatrixWorld();
  const dStage = Math.hypot(stage.dist(eyePos.x, eyePos.z), eyePos.y - stage.deckY);
  const dScreen = Math.hypot(eyePos.x - main.c[0], eyePos.y - main.c[1], eyePos.z - main.c[2]);
  const off = Math.atan2(Math.abs(eyePos.x - main.c[0]), eyePos.z - main.c[2]) / D2R;   // 0 = straight on
  const mainVis = screenVisibility(ctx, eyePos, main);

  // The screen as a TV watched from 2.5 m: same angle across, squeezed when seen from the side
  const across = main.w * Math.max(0, Math.cos(Math.min(off, 90) * D2R));
  const tvIn = (across * 2.5) / dScreen / 0.8716 / 0.0254;
  // A 1.75 m performer measured against a ruler held at arm's length (0.6 m)
  const perfMM = (1.75 * 600) / Math.max(dStage, 0.5);

  // Does the sound desk or a delay tower sit between this seat and the stage front?
  const aim = new THREE.Vector3(0, stage.deckY + 1, stage.frontZ).sub(eyePos), len = aim.length();
  ray.set(eyePos, aim.normalize()); ray.near = 0.05; ray.far = len;
  const blockedByTower = ctx.floorObs.length > 0 && ray.intersectObjects(ctx.floorObs, false).length > 0;

  return { dStage, dScreen, height: eyePos.y, off, mainVis, tvIn, perfMM, blockedByTower };
}
