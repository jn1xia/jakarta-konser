// A full house. Every open place gets a point of light (a lightstick, or a phone torch at shows
// without lightsticks), and the fans around the chosen seat are drawn as jointed figures at two
// levels of detail. One pose function moves the figures and the far-away lights together.

import { rng, inPoly } from '../engine/geometry.js';
import { animU, POSE_GLSL, LIGHT_TIP, CLOTHES, buildPerson, figureMaterial, makeFigures } from './figures.js';

const THREE = window.THREE;
const PHONE_SHARE = 0.35;        // share of the crowd holding a torch up at a phone-light show

export function addCrowd(ctx, model, theme = {}) {
  const { stage, venue } = model, { halfZ } = venue.def.floor;
  const phone = theme.lights === 'phone';
  const color = new THREE.Color(phone ? '#fff6e0' : theme.stick || '#ffe9b8');
  const density = phone ? PHONE_SHARE : 1;
  const rand = rng(771);
  const focus = [0, stage.frontZ - 2];                         // everyone faces this point of the stage

  /* Where everyone is: x, floor height, z, and whether they always stand */
  const list = [], edge = venue.outline.polygon(-1.5, 2);
  for (const s of model.sections) {
    if (s.cat === 'CLOSED') continue;
    if (s.kind === 'floor' && s.standing) {                    // a standing block is packed, not gridded
      for (let z = s.z0 + 0.35; z < s.z1; z += 0.7) for (let x = s.x0 + 0.35; x < s.x1; x += 0.7) {
        const px = x + (rand() - 0.5) * 0.4, pz = z + (rand() - 0.5) * 0.4;
        if (!stage.blocked(px, pz, 0.6) && inPoly(px, pz, edge)) list.push(px, 0, pz, 1);
      }
    } else {
      for (const row of s.rows) for (let i = 0; i < row.length; i += 3) list.push(row[i], row[i + 1], row[i + 2], 0);
    }
  }
  const CROWD = new Float32Array(list), N = CROWD.length / 4;
  const PHASE = new Float32Array(N), HEIGHT = new Float32Array(N);
  for (let i = 0; i < N; i++) { PHASE[i] = rand(); HEIGHT[i] = 0.94 + 0.1 * rand(); }

  /* The lights: one additive point per fan, at the tip of the raised arm */
  const lightU = {
    uTime: animU.uTime, uEnergy: animU.uEnergy, uPix: { value: 800 }, uShow: { value: 1 }, uStand: { value: 0 },
    uSelf: { value: new THREE.Vector3(0, -999, 0) }, uColor: { value: color }, uFocus: { value: new THREE.Vector2(focus[0], focus[1]) },
    uDensity: { value: density }
  };
  {
    const pos = new Float32Array(N * 3), ang = new Float32Array(N), st = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = CROWD[i * 4]; pos[i * 3 + 1] = CROWD[i * 4 + 1]; pos[i * 3 + 2] = CROWD[i * 4 + 2];
      ang[i] = Math.atan2(CROWD[i * 4], CROWD[i * 4 + 2]); st[i] = CROWD[i * 4 + 3];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(PHASE, 1));
    g.setAttribute('aAng', new THREE.BufferAttribute(ang, 1));
    g.setAttribute('aStandA', new THREE.BufferAttribute(st, 1));
    g.setAttribute('aH', new THREE.BufferAttribute(HEIGHT, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: lightU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [POSE_GLSL,
        'uniform float uPix,uShow,uStand,uDensity;uniform vec3 uSelf;uniform vec2 uFocus;attribute float aPhase,aAng,aStandA,aH;varying float vB;',
        'void main(){',
        // no light for the seat you are in, nor for fans without a torch at a phone-light show
        ' if(aPhase>uDensity||(distance(position.xz,uSelf.xz)<0.3&&abs(position.y-uSelf.y)<0.5)){gl_Position=vec4(2.0,2.0,2.0,1.0);gl_PointSize=0.0;vB=0.0;return;}',
        ' float st=max(aStandA,uStand);vec4 arms,body;crowdPose(vec4(aPhase,aAng,st,0.0),arms,body);',
        ` vec3 tip=vec3(${LIGHT_TIP.map((v) => v.toFixed(3)).join(',')}),nn=vec3(0.0,1.0,0.0);poseVertex(tip,nn,2.0,arms,body);tip.y*=aH;`,
        ' float yaw=atan(uFocus.x-position.x,uFocus.y-position.z),c=cos(yaw),s=sin(yaw);',
        ' vec4 mv=modelViewMatrix*vec4(position+vec3(tip.x*c+tip.z*s,tip.y,-tip.x*s+tip.z*c),1.0);',
        ' float wave=0.5+0.5*sin(aAng*2.0-uTime*1.4);float tw=0.78+0.22*sin(uTime*5.0+aPhase*6.283);',
        ' vB=mix(0.32,mix(0.45,1.0,wave)*tw,uShow);',
        ' gl_PointSize=clamp(0.36*uPix/max(-mv.z,0.1),1.6,18.0);gl_Position=projectionMatrix*mv;}'
      ].join('\n'),
      fragmentShader: 'uniform vec3 uColor;varying float vB;void main(){vec2 c=gl_PointCoord-0.5;float r=length(c);float a=smoothstep(0.5,0.0,r);a*=a;float core=smoothstep(0.16,0.0,r);gl_FragColor=vec4((uColor*a+vec3(core*0.6))*vB,1.0);}'
    });
    const points = new THREE.Points(g, m);
    points.frustumCulled = false; points.renderOrder = 3; ctx.scene.add(points);
  }

  /* A soft glow from the crowd on the stands opposite */
  const glow = new THREE.PointLight(color, 0.3, Math.max(120, 4 * halfZ), 1.2);
  glow.position.set(0, 0.35 * ctx.tall + 8, 0.5 * halfZ); ctx.scene.add(glow);

  /* Jointed fans: detailed ones close to the seat, simpler ones further out */
  const MAX_NEAR = ctx.narrow ? 1200 : 2500, MAX_FAR = ctx.narrow ? 6000 : 14000;
  const R_NEAR = ctx.narrow ? 9 : 13, R_FAR = ctx.narrow ? 28 : 40;
  const held = phone ? 'phone' : 'stick';
  const fanMat = figureMaterial({ glow: color, density });
  const near = makeFigures(ctx.scene, buildPerson(true, held), fanMat, MAX_NEAR);
  const far = makeFigures(ctx.scene, buildPerson(false, held), fanMat, MAX_FAR);
  const seatAt = new THREE.Vector3(0, -999, 0);
  let posture = 'sit';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();

  function rebuild() {
    const rn2 = R_NEAR * R_NEAR, rf2 = R_FAR * R_FAR, found = [];
    for (let i = 0; i < N; i++) {
      const dx = CROWD[i * 4] - seatAt.x, dz = CROWD[i * 4 + 2] - seatAt.z;
      if (dx > R_FAR || dx < -R_FAR || dz > R_FAR || dz < -R_FAR) continue;
      const dy = CROWD[i * 4 + 1] - seatAt.y, dd = dx * dx + dz * dz + dy * dy;
      if (dd > rf2 || dd < 0.06) continue;                     // too far, or the seat you are in
      found.push([dd, i]);
    }
    found.sort((a, b) => a[0] - b[0]);
    const an = near.geometry.attributes.aAnim, af = far.geometry.attributes.aAnim;
    let kn = 0, kf = 0;
    for (const [dd, i] of found) {
      const close = dd < rn2 && kn < MAX_NEAR;
      if (!close && kf >= MAX_FAR) break;
      const mesh = close ? near : far, attr = close ? an : af, k = close ? kn++ : kf++;
      const x = CROWD[i * 4], y = CROWD[i * 4 + 1], z = CROWD[i * 4 + 2];
      const up = CROWD[i * 4 + 3] > 0.5 || posture === 'stand';
      e.set(0, Math.atan2(focus[0] - x, focus[1] - z), 0); q.setFromEuler(e); sc.set(1, HEIGHT[i], 1); p.set(x, y, z);
      m4.compose(p, q, sc); mesh.setMatrixAt(k, m4); mesh.setColorAt(k, CLOTHES[(i * 7) % CLOTHES.length]);
      attr.setXYZW(k, PHASE[i], Math.atan2(x, z), up ? 1 : 0, 0);
    }
    for (const [mesh, n, attr] of [[near, kn, an], [far, kf, af]]) {
      mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      attr.needsUpdate = true;
    }
  }

  return {
    count: N,
    nearCount: () => near.count + far.count,
    /** Call once a frame: keeps the lights the same size on screen whatever the zoom. */
    update() { lightU.uPix.value = ctx.renderer.domElement.height / (2 * Math.tan((ctx.camera.fov * Math.PI) / 360)); },
    setSeat(seatPos) { seatAt.copy(seatPos); lightU.uSelf.value.copy(seatPos); rebuild(); },
    setPosture(next) { posture = next === 'stand' ? 'stand' : 'sit'; lightU.uStand.value = posture === 'stand' ? 1 : 0; rebuild(); },
    setLights(mode) { const show = mode !== 'house'; lightU.uShow.value = show ? 1 : 0; glow.intensity = show ? 0.3 : 0; }
  };
}
