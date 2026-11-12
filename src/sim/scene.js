// The venue in three.js: sky, ground, floor, stands tinted by ticket category, and the roof.
// Everything is drawn from the model, so one file serves every venue.

import { rng, D2R } from '../engine/geometry.js';

const THREE = window.THREE;

const CONCRETE = 0x474b54, WALL = 0x1c1e23, SOFFIT = 0x202329, CLOSED = 0x101115;
const FASCIA = 1.6;       // depth of the fascia below an upper tier's front row
const PARAPET = 0.9;      // height of the wall in front of a tier's first row
const PANEL = 384;        // width the seat panel takes on a wide screen, in CSS pixels

function pushQuad(P, C, a, b, c, d, col) {
  P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  for (let i = 0; i < 6; i++) C.push(col.r, col.g, col.b);
}
const at = (p, y) => ({ x: p.x, y, z: p.z });

function meshFrom(P, C, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  if (C) g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}
function linesFrom(L, color, opacity = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
}

export function createScene(canvas, model) {
  const { venue, stage } = model, def = venue.def, o = venue.outline;
  const { halfX, halfZ } = def.floor;
  const roof = def.roof || { type: 'none' };
  const indoor = roof.type === 'hall';
  const narrow = innerWidth <= 760;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, narrow ? 1.6 : 2));
  renderer.setClearColor(0x050608);
  const scene = new THREE.Scene();
  const haze = indoor ? 0.0012 : 0.0021;
  scene.fog = new THREE.FogExp2(0x07080c, haze);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
  const rand = rng(20261111);

  // How far the stands reach at each point of the outline, and the venue's overall size
  const tiersAt = (u) => venue.tiers.filter((t) => !t.span || t.span.some(([a, b]) => u >= a - 1e-6 && u <= b + 1e-6));
  const reachAt = (u) => Math.max(0, ...tiersAt(u).map((t) => t.dBack));
  const topAt = (u) => Math.max(0, ...tiersAt(u).map((t) => t.yTop));
  const maxBack = Math.max(...venue.tiers.map((t) => t.dBack));
  const rim = o.sampleU(0, o.L, 1.5);
  const outer = rim.map((u) => o.ring(u, reachAt(u) + 1.2));
  const extent = Math.max(...outer.map((p) => Math.max(Math.abs(p.x), Math.abs(p.z))));
  const tall = Math.max(...venue.tiers.map((t) => t.yTop)) + 3;

  /* Lights */
  const hemi = new THREE.HemisphereLight(0x8a98b8, 0x0b0b0e, 0.3); scene.add(hemi);
  const flood = new THREE.DirectionalLight(0xffffff, 0); flood.position.set(20, 120, 40); scene.add(flood);
  const wash = new THREE.PointLight(0xfff0d6, 1.2, Math.max(120, 4.5 * halfZ), 1.1);
  wash.position.set(0, stage.deckY + 20, stage.frontZ + 8); scene.add(wash);

  /* Night sky and the city around an open-air venue */
  if (!indoor) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 vP;void main(){float h=clamp(vP.y,0.0,1.0);vec3 c=mix(vec3(0.055,0.07,0.11),vec3(0.006,0.008,0.016),pow(h,0.4));c+=vec3(0.12,0.07,0.035)*pow(1.0-h,10.0);gl_FragColor=vec4(c,1.0);}'
    }));
    scene.add(sky);
    const dots = (n, place, size, opacity) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) place(i, pos, col);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false, transparent: opacity < 1, opacity })));
    };
    dots(2400, (i, pos, col) => {                              // stars
      const v = new THREE.Vector3();
      do { v.set(rand() * 2 - 1, rand(), rand() * 2 - 1); } while (v.lengthSq() > 1 || v.lengthSq() < 0.01);
      v.normalize().multiplyScalar(1200); pos.set([v.x, v.y, v.z], i * 3);
      const b = 0.3 + rand() * 0.6; col.set([b, b * 0.95, b * 0.9], i * 3);
    }, 1.6, 1);
    dots(2600, (i, pos, col) => {                              // Jakarta's lights
      const a = rand() * Math.PI * 2, r = extent + 30 + Math.pow(rand(), 0.7) * 1100;
      pos.set([Math.cos(a) * r, 0.5 + rand() * (rand() < 0.1 ? 40 : 6), Math.sin(a) * r], i * 3);
      col.set(rand() < 0.7 ? [1, 0.72, 0.4] : [0.75, 0.85, 1], i * 3);
    }, 2, 0.65);
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1400, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x08090b }));
  ground.position.y = -0.06; scene.add(ground);

  /* Floor: event flooring inside the front row */
  {
    const edge = o.sampleU(0, o.L, 1.2).map((u) => o.ring(u, Math.min(...venue.tiers.map((t) => t.d0))));
    const P = [];
    for (let i = 0; i < edge.length - 1; i++) P.push(0, 0, 0, edge[i + 1].x, 0, edge[i + 1].z, edge[i].x, 0, edge[i].z);
    scene.add(meshFrom(P, null, new THREE.MeshLambertMaterial({ color: 0x17191e, side: THREE.DoubleSide })));
    const L = [];
    for (let x = -halfX; x <= halfX; x += 2) L.push(x, 0.015, -halfZ, x, 0.015, halfZ);
    for (let z = -halfZ; z <= halfZ; z += 2) L.push(-halfX, 0.015, z, halfX, 0.015, z);
    scene.add(linesFrom(L, 0x22252c));
  }

  /* Roof height above a point d metres out from the front row */
  const roofOut = roof.type === 'ring' ? roof.dOut : maxBack + 2;
  const roofY = (d) => {
    if (roof.type === 'ring') return roof.yOut + ((roof.dOut - d) / (roof.dOut - roof.dIn)) * (roof.yIn - roof.yOut);
    if (roof.type === 'closed') return roof.y - ((d + 1) / (roofOut + 1)) * 4;
    if (indoor) return def.ceilingY;
    return Infinity;
  };

  /* Stands: one mesh per section, tinted by its ticket category */
  const sectionMeshes = [], obstacles = [], meshOf = new Map();
  const concrete = new THREE.Color(CONCRETE), wall = new THREE.Color(WALL), soffit = new THREE.Color(SOFFIT);
  const soffitY = (t, d) => t.y0 - FASCIA + (d - t.d0) * Math.tan(t.rake * D2R);
  const raised = (t) => t.y0 - FASCIA > 1;                    // an upper tier, hanging over the one below
  const tierAbove = (t, u) => tiersAt(u).filter((x) => x.y0 > t.yTop && x.d0 >= t.dBack - 4).sort((a, b) => a.y0 - b.y0)[0];

  for (const s of model.sections) {
    if (s.kind !== 'stand') continue;
    const t = s.tier, P = [], C = [], us = o.sampleU(s.u0, s.u1, 1.5);
    const base = s.cat === 'CLOSED' ? new THREE.Color(CLOSED) : concrete.clone().lerp(new THREE.Color(model.cats[s.cat].color), 0.42);
    const riser = base.clone().multiplyScalar(0.62);
    const edgeStart = t.span && t.span.some(([a]) => Math.abs(s.u0 - a) < 1e-6);
    const edgeEnd = t.span && t.span.some(([, b]) => Math.abs(s.u1 - b) < 1e-6);
    const mid = (s.u0 + s.u1) / 2, above = tierAbove(t, mid);
    const backTop = above ? soffitY(above, t.dBack) : Math.min(roofY(t.dBack), t.yTop + (roof.type === 'none' ? 2.5 : 60));

    for (let k = 0; k < us.length - 1; k++) {
      const ua = us[k], ub = us[k + 1];
      for (let r = s.r0; r < s.r1; r++) {
        const y = t.y0 + r * t.rise, dF = t.d0 + r * t.depth, dB = dF + t.depth;
        const A = o.ring(ua, dF), B = o.ring(ub, dF), Cc = o.ring(ub, dB), D = o.ring(ua, dB);
        pushQuad(P, C, at(A, y), at(D, y), at(Cc, y), at(B, y), base);
        const yLo = r === 0 ? (raised(t) ? t.y0 - FASCIA : 0) : y - t.rise, yHi = r === 0 ? t.y0 + PARAPET : y;
        pushQuad(P, C, at(A, yLo), at(A, yHi), at(B, yHi), at(B, yLo), r === 0 ? wall : riser);
      }
      if (s.r1 === t.rows) {                                   // back wall of the tier
        const A = o.ring(ua, t.dBack), B = o.ring(ub, t.dBack);
        pushQuad(P, C, at(A, t.yTop), at(A, backTop), at(B, backTop), at(B, t.yTop), wall);
      }
      if (s.r0 === 0 && raised(t)) {                           // underside of an upper tier
        const F1 = o.ring(ua, t.d0), F2 = o.ring(ub, t.d0), A = o.ring(ua, t.dBack), B = o.ring(ub, t.dBack);
        pushQuad(P, C, at(F1, t.y0 - FASCIA), at(F2, t.y0 - FASCIA), at(B, soffitY(t, t.dBack)), at(A, soffitY(t, t.dBack)), soffit);
      }
    }
    for (const [isEdge, u] of [[edgeStart, s.u0], [edgeEnd, s.u1]]) {   // close the open end of a stand
      if (!isEdge) continue;
      for (let r = s.r0; r < s.r1; r++) {
        const y = t.y0 + r * t.rise, F = o.ring(u, t.d0 + r * t.depth), Bk = o.ring(u, t.d0 + (r + 1) * t.depth);
        pushQuad(P, C, at(F, 0), at(F, y), at(Bk, y), at(Bk, 0), wall);
      }
    }
    const m = meshFrom(P, C, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x000000 }));
    m.userData.sec = s; scene.add(m);
    meshOf.set(s, m); sectionMeshes.push(m); obstacles.push(m);
  }

  /* Floor blocks, tinted by category */
  for (const s of model.sections) {
    if (s.kind !== 'floor') continue;
    const g = new THREE.PlaneGeometry(s.x1 - s.x0, s.z1 - s.z0).rotateX(-Math.PI / 2);
    const col = new THREE.Color(0x1d2026).lerp(new THREE.Color(model.cats[s.cat].color), 0.5);
    // polygonOffset keeps the tint from flickering against the floor a few centimetres below it
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: col, emissive: 0x000000, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.position.set((s.x0 + s.x1) / 2, 0.03, (s.z0 + s.z1) / 2);
    m.userData.sec = s; scene.add(m); meshOf.set(s, m);
  }

  /* Outer wall: a facade behind the stands, a low fence where there are none */
  {
    const P = [], C = [], col = new THREE.Color(0x15171b);
    const height = (u) => {
      if (indoor) return def.ceilingY;
      if (!tiersAt(u).length) return 1.2;
      return Number.isFinite(roofY(reachAt(u))) ? roofY(reachAt(u)) : topAt(u) + 2.5;
    };
    for (let k = 0; k < rim.length - 1; k++) {
      const a = outer[k], b = outer[k + 1];
      pushQuad(P, C, at(a, 0), at(b, 0), at(b, height(rim[k + 1])), at(a, height(rim[k])), col);
    }
    scene.add(meshFrom(P, C, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  }

  /* Roof. From the whole-venue view it fades so the bowl underneath can be seen. */
  const roofParts = [];                                       // meshes and lines that fade
  const lids = [];                                            // covers that vanish outright
  const fades = (obj) => { obj.material.transparent = true; obj.userData.full = obj.material.opacity; roofParts.push(obj); scene.add(obj); return obj; };
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a2d34, side: THREE.DoubleSide });
  if (roof.type === 'ring' || roof.type === 'closed') {
    const dIn = roof.type === 'ring' ? roof.dIn : -1, P = [], L = [];
    for (let k = 0; k < rim.length - 1; k++) {
      const a1 = o.ring(rim[k], dIn), b1 = o.ring(rim[k + 1], dIn), a2 = o.ring(rim[k], roofOut), b2 = o.ring(rim[k + 1], roofOut);
      P.push(a1.x, roofY(dIn), a1.z, a2.x, roofY(roofOut), a2.z, b2.x, roofY(roofOut), b2.z, a1.x, roofY(dIn), a1.z, b2.x, roofY(roofOut), b2.z, b1.x, roofY(dIn), b1.z);
      L.push(a1.x, roofY(dIn) - 1.2, a1.z, b1.x, roofY(dIn) - 1.2, b1.z);
    }
    const ringMesh = fades(meshFrom(P, null, roofMat)); obstacles.push(ringMesh);
    for (let u = 0; u < o.L; u += 7) {                         // trusses and floodlights
      const a = o.ring(u, dIn), b = o.ring(u, roofOut);
      L.push(a.x, roofY(dIn) - 1.2, a.z, b.x, roofY(roofOut) - 1.2, b.z);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x222222 }));
      lamp.position.set(a.x, roofY(dIn) - 1.6, a.z); lamp.lookAt(0, 0, 0); scene.add(lamp); lids.push(lamp);
    }
    fades(linesFrom(L, 0x5a606c, 0.8));
    if (roof.type === 'closed') {                              // the retractable panels, shut
      const shape = new THREE.Shape(o.polygon(-1, 2).map(([x, z]) => new THREE.Vector2(x, -z)));
      const lid = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x34373f, side: THREE.DoubleSide }));
      lid.position.y = roof.y + 0.8; scene.add(lid); lids.push(lid);
    }
  } else if (indoor) {
    const shape = new THREE.Shape(outer.map((p) => new THREE.Vector2(p.x, -p.z)));
    const lid = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x191b20, side: THREE.DoubleSide }));
    lid.position.y = def.ceilingY; scene.add(lid); lids.push(lid);
    const L = [], y = def.ceilingY - 0.7;
    for (let z = -extent; z <= extent; z += 8) L.push(-extent, y, z, extent, y, z);
    for (let x = -extent; x <= extent; x += 16) L.push(x, y, -extent, x, y, extent);
    lids.push(linesFrom(L, 0x3a3f49, 0.7)); scene.add(lids[lids.length - 1]);
  }

  /** on = false fades the roof away for the view from above. */
  let roofShown = true;
  function setRoof(on) {
    roofShown = !!on;
    for (const part of roofParts) { part.material.opacity = on ? part.userData.full : 0.1; part.material.depthWrite = on; }
    for (const lid of lids) lid.visible = on;
  }

  /** fromAbove lifts the ambient light so the categories read clearly in the whole-venue view. */
  function setLights(mode, fromAbove = false) {
    const house = mode === 'house';
    hemi.intensity = house ? 0.95 : fromAbove ? 0.85 : 0.3;
    scene.fog.density = fromAbove ? haze * 0.3 : haze;       // the far view would otherwise sink into the haze
    flood.intensity = house ? 0.85 : 0;
    wash.intensity = house ? 0.35 : 1.2;
    renderer.setClearColor(house ? 0x0d1016 : 0x050608);
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // On a wide screen the seat panel covers the right-hand side, so the view is centred in what is left
    if (w > 760) camera.setViewOffset(w, h, PANEL / 2, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  /** A pose that shows the whole venue from above the far corner. */
  function overview(yaw = 0.62, pitch = 0.82) {
    const dist = 2.7 * extent, target = new THREE.Vector3(0, 0.05 * extent, -0.03 * extent);
    const pos = new THREE.Vector3(
      target.x + dist * Math.cos(pitch) * Math.sin(yaw),
      target.y + dist * Math.sin(pitch),
      target.z + dist * Math.cos(pitch) * Math.cos(yaw));
    return { pos, target, dist };
  }

  const render = () => renderer.render(scene, camera);
  resize();
  const start = overview();
  camera.position.copy(start.pos); camera.lookAt(start.target);
  setRoof(false);

  return {
    renderer, scene, camera, obstacles, floorObs: [], sectionMeshes, meshOf,
    extent, tall, indoor, narrow, roofY, overview, setLights, setRoof, roofOn: () => roofShown, resize, render
  };
}
