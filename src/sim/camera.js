// The two views: first person from the chosen seat, and an orbit over the whole venue.
// Also turns clicks into sections and seats.

import { clamp, D2R, inPoly } from '../engine/geometry.js';

const THREE = window.THREE;
const SEATED_EYE = 1.18, STANDING_EYE = 1.62;   // metres above the floor of the row
const UP = new THREE.Vector3(0, 1, 0);

export function createCamera(ctx, model, state) {
  const { camera } = ctx, { stage } = model;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seatPos = new THREE.Vector3(), eyePos = new THREE.Vector3();
  const home = ctx.overview();
  const view = { yaw: 0, pitch: 0, orbit: { yaw: 0.62, pitch: 0.82, dist: home.dist, target: home.target.clone() } };
  const distMin = 0.7 * ctx.extent, distMax = 4.6 * ctx.extent;
  let flight = null;

  /* You-are-here pin for the whole-venue view */
  const pinH = clamp(0.25 * ctx.extent, 8, 30);
  const pinMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, depthTest: false, transparent: true });
  const pin = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(pinH / 85, pinH / 85, pinH, 8), pinMat); stem.position.y = pinH / 2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(pinH / 14, 16, 12), pinMat); head.position.y = pinH;
  pin.add(stem, head); pin.renderOrder = 10; pin.visible = false; ctx.scene.add(pin);

  /** A standing floor block always stands; elsewhere the Crowd buttons decide. */
  const standing = () => (state.sec.kind === 'floor' && state.sec.standing) || state.posture === 'stand';

  function place() {
    const row = state.sec.rows[state.row], i = state.seat * 3;
    seatPos.set(row[i], row[i + 1], row[i + 2]);
    eyePos.copy(seatPos); eyePos.y += standing() ? STANDING_EYE : SEATED_EYE;
    pin.position.copy(seatPos);
  }

  /** Close to the stage, look at the performers; further back, frame the screens as well. */
  function stageTarget() {
    const d = stage.dist(eyePos.x, eyePos.z);
    return new THREE.Vector3(0, stage.deckY + 2 + 7 * clamp((d - 15) / 60, 0, 1), stage.frontZ - Math.min(6, 0.4 * stage.depth));
  }
  function lookAtStage() {
    const to = stageTarget(), dx = to.x - eyePos.x, dy = to.y - eyePos.y, dz = to.z - eyePos.z;
    view.yaw = Math.atan2(-dx, -dz); view.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }

  function fovFor(zoom) {
    const aspect = camera.aspect || 1, h = (ctx.narrow ? 64 : 76) * D2R;
    const base = clamp(2 * Math.atan(Math.tan(h / 2) / aspect), 34 * D2R, 92 * D2R);
    return (2 * Math.atan(Math.tan(base / 2) / zoom)) / D2R;
  }
  const tmp = new THREE.Matrix4();
  function overviewPose() {
    const o = view.orbit, pos = new THREE.Vector3(
      o.target.x + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw),
      o.target.y + o.dist * Math.sin(o.pitch),
      o.target.z + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw));
    tmp.lookAt(pos, o.target, UP);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(tmp), fov: 44 };
  }
  function povPose() {
    return { pos: eyePos.clone(), quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(view.pitch, view.yaw, 0, 'YXZ')), fov: fovFor(state.zoom) };
  }
  function jump(pose) {
    camera.position.copy(pose.pos); camera.quaternion.copy(pose.quat);
    camera.fov = pose.fov; camera.updateProjectionMatrix();
  }
  function flyTo(pose, seconds, arrive) {
    if (reduceMotion || seconds <= 0) { jump(pose); flight = null; if (arrive) arrive(); return; }
    const p0 = camera.position.clone(), dist = p0.distanceTo(pose.pos);
    const ctrl = p0.clone().lerp(pose.pos, 0.5); ctrl.y = Math.max(p0.y, pose.pos.y) + Math.min(60, dist * 0.22);
    flight = { t0: performance.now(), dur: seconds * 1000, p0, p1: pose.pos.clone(), ctrl, q0: camera.quaternion.clone(), q1: pose.quat.clone(), f0: camera.fov, f1: pose.fov, arrive };
  }

  function setSeat(sec, row, seat, look = true) {
    state.sec = sec; state.row = row; state.seat = seat;
    place();
    if (look) lookAtStage();
  }

  function setMode(mode, fly) {
    state.mode = mode === 'overview' ? 'overview' : 'pov';
    const pov = state.mode === 'pov';
    pin.visible = !pov;
    if (pov) { lookAtStage(); flyTo(povPose(), fly ? 1.5 : 0, () => ctx.setRoof(true)); }
    else { ctx.setRoof(false); flyTo(overviewPose(), fly ? 1.5 : 0); }
  }
  const setZoom = (z) => { state.zoom = clamp(z, 1, 6); };
  /** In My seat view, moves the eye to the newly chosen seat: a short glide, or at once. */
  function glide(instant) {
    if (state.mode !== 'pov') return;
    const far = camera.position.distanceTo(eyePos);
    flyTo(povPose(), instant ? 0 : clamp(0.35 + far / 160, 0.35, 1.6));
  }
  function setPosture(p) { state.posture = p === 'stand' ? 'stand' : 'sit'; place(); }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  /** Call once a frame: runs a flight if one is under way, otherwise follows the controls. */
  function apply(now) {
    if (pin.visible) head.scale.setScalar(1 + 0.12 * Math.sin(now / 330));
    if (flight) {
      const u = clamp((now - flight.t0) / flight.dur, 0, 1), e = ease(u), a = flight.p0, b = flight.p1, c = flight.ctrl, ie = 1 - e;
      camera.position.set(ie * ie * a.x + 2 * ie * e * c.x + e * e * b.x, ie * ie * a.y + 2 * ie * e * c.y + e * e * b.y, ie * ie * a.z + 2 * ie * e * c.z + e * e * b.z);
      camera.quaternion.copy(flight.q0).slerp(flight.q1, e);
      camera.fov = flight.f0 + (flight.f1 - flight.f0) * e; camera.updateProjectionMatrix();
      if (u >= 1) { const done = flight.arrive; flight = null; if (done) done(); }
      return;
    }
    jump(state.mode === 'pov' ? povPose() : overviewPose());
    const roof = state.mode === 'pov';
    if (ctx.roofOn() !== roof) ctx.setRoof(roof);
  }

  /* Picking: which section, and where on it, is under a point of the screen */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(UP, 0);
  function pick(clientX, clientY) {
    const r = ctx.renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); ray.near = 0; ray.far = Infinity;
    const onFloor = ray.ray.intersectPlane(floorPlane, new THREE.Vector3());
    const hit = ray.intersectObjects(ctx.sectionMeshes, false)[0];
    if (onFloor && (!hit || onFloor.distanceTo(camera.position) < hit.distance)) {
      const block = model.sections.find((s) => s.kind === 'floor' && inPoly(onFloor.x, onFloor.z, s.poly));
      if (block) return { sec: block, point: onFloor };
    }
    return hit ? { sec: hit.object.userData.sec, point: hit.point } : null;
  }
  function nearestSeat(sec, p) {
    let best = Infinity, row = 0, seat = 0;
    sec.rows.forEach((a, r) => {
      for (let i = 0; i < a.length; i += 3) {
        const dx = a[i] - p.x, dy = a[i + 1] - p.y, dz = a[i + 2] - p.z, d = dx * dx + dy * dy + dz * dz;
        if (d < best) { best = d; row = r; seat = i / 3; }
      }
    });
    return [row, seat];
  }

  /**
   * Pointer, wheel and keyboard. onPick(sec, row, seat) fires for a click on an open section in
   * the whole-venue view; onChange() after anything that moves a button (zoom); onHover(sec, x, y).
   */
  function bind(canvas, { onPick = () => {}, onChange = () => {}, onHover = () => {} } = {}) {
    const pointers = new Map();
    let moved = 0, pinch = null, hoverAt = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: state.zoom, dist: view.orbit.dist }; }
      canvas.classList.add('dragging'); flight = null;
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) {
        if (state.mode === 'overview' && e.pointerType === 'mouse' && performance.now() - hoverAt > 60) {
          hoverAt = performance.now();
          const h = pick(e.clientX, e.clientY), open = h && h.sec.cat !== 'CLOSED';
          canvas.classList.toggle('pointing', !!open);
          onHover(h ? h.sec : null, e.clientX, e.clientY);
        }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 2 && pinch) {
        const [a, b] = [...pointers.values()], k = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
        if (state.mode === 'pov') { setZoom(pinch.zoom * k); onChange(); } else view.orbit.dist = clamp(pinch.dist / k, distMin, distMax);
        return;
      }
      if (state.mode === 'pov') {
        const k = (camera.fov * D2R) / canvas.clientHeight;
        view.yaw += dx * k; view.pitch = clamp(view.pitch + dy * k, -1.35, 1.35);
      } else {
        view.orbit.yaw -= dx * 0.006; view.orbit.pitch = clamp(view.orbit.pitch + dy * 0.005, 0.12, 1.45);
      }
    });
    const end = (e) => {
      const single = pointers.size === 1; pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) canvas.classList.remove('dragging');
      if (e.type === 'pointerup' && single && moved < 6 && state.mode === 'overview') {
        const h = pick(e.clientX, e.clientY);
        if (h && h.sec.cat !== 'CLOSED') { const [row, seat] = nearestSeat(h.sec, h.point); onPick(h.sec, row, seat); }
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => { if (!pointers.size) { onHover(null); canvas.classList.remove('pointing'); } });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); flight = null;
      if (state.mode === 'pov') { setZoom(state.zoom * Math.exp(-e.deltaY * 0.0015)); onChange(); }
      else view.orbit.dist = clamp(view.orbit.dist * Math.exp(e.deltaY * 0.001), distMin, distMax);
    }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      const step = 0.06, pov = state.mode === 'pov', o = view.orbit;
      const turn = (dy, dp) => {
        if (pov) { view.yaw += dy; view.pitch = clamp(view.pitch + dp, -1.35, 1.35); }
        else { o.yaw += dy; o.pitch = clamp(o.pitch + dp, 0.12, 1.45); }
      };
      const zoom = (k) => { if (pov) { setZoom(state.zoom * k); onChange(); } else o.dist = clamp(o.dist / k, distMin, distMax); };
      if (e.key === 'ArrowLeft') turn(step, 0);
      else if (e.key === 'ArrowRight') turn(-step, 0);
      else if (e.key === 'ArrowUp') turn(0, step);
      else if (e.key === 'ArrowDown') turn(0, -step);
      else if (e.key === '+' || e.key === '=') zoom(1.25);
      else if (e.key === '-') zoom(1 / 1.25);
      else return;
      e.preventDefault(); flight = null;
    });
  }

  return { eyePos, seatPos, view, standing, setSeat, setMode, setZoom, setPosture, glide, lookAtStage, apply, pick, nearestSeat, bind };
}
