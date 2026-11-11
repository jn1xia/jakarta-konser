// The stage in three.js, built from the engine's stage layout: deck, runway, back wall, roof
// truss, LED screens, sound desk, delay towers, moving beams and stand-in performers.
// The screens show the artist's and tour's names as plain text; no logos or artwork.

import { buildPerson, figureMaterial, makeFigures } from './figures.js';

const THREE = window.THREE;

/** The title card every screen cycles through, drawn as text on a 2:1 canvas. */
function titleTexture(concert) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const tex = new THREE.CanvasTexture(canvas);
  const draw = () => {
    const c = canvas.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 512);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = '900 150px Archivo, "Arial Black", sans-serif';
    c.fillText(String(concert.artist).toUpperCase(), 512, 262, 940);
    c.font = '500 44px "IBM Plex Mono", monospace'; c.fillStyle = '#ddd';
    c.fillText(String(concert.tour || '').toUpperCase(), 512, 350, 940);
    c.font = '500 26px "IBM Plex Mono", monospace'; c.fillStyle = '#aaa';
    c.fillText('JAKARTA', 512, 412, 940);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return tex;
}

/** An LED wall: big pixels that cycle between a wash of light, a star field and the title card. */
function screenMaterial(aspect, seed, text, color) {
  const uniforms = { uTime: { value: 0 }, uAspect: { value: aspect }, uShow: { value: 1 }, uSeed: { value: seed }, uText: { value: text }, uColor: { value: color } };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: [
      'precision highp float;varying vec2 vUv;uniform float uTime,uAspect,uShow,uSeed;uniform sampler2D uText;uniform vec3 uColor;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'vec3 sWash(vec2 uv,float t){float a=0.5+0.5*sin(uv.x*5.0*uAspect+t*0.9+uSeed)*sin(uv.y*4.0-t*0.6);',
      ' float bar=smoothstep(0.75,1.0,sin(uv.y*26.0-t*2.2+uSeed));return uColor*(0.18+0.72*a)+vec3(0.85)*bar*0.22;}',
      'vec3 sStars(vec2 uv,float t){vec2 p=(uv-0.5)*vec2(uAspect,1.0);vec3 col=vec3(0.0);',
      ' for(int i=0;i<3;i++){float fi=float(i);float z=fract(t*0.07+fi/3.0);float sc=mix(22.0,2.0,z);',
      '  vec2 q=p*sc+fi*7.31;vec2 id=floor(q);vec2 f=fract(q)-0.5;vec2 o=vec2(h(id+3.1),h(id+7.7))-0.5;',
      '  float d=length(f-o*0.6);float st=smoothstep(0.06*(0.35+z),0.0,d)*step(0.55,h(id+fi));',
      '  col+=vec3(st)*smoothstep(0.0,0.3,z)*smoothstep(1.0,0.75,z);}',
      ' col+=uColor*0.3*exp(-dot(p,p)*2.5)*(0.6+0.4*sin(t*1.7));return col;}',
      'vec3 sTitle(vec2 uv,vec2 cell,float fr){vec2 s=uAspect>=2.0?vec2(uAspect/2.0,1.0):vec2(1.0,2.0/uAspect);',
      ' vec2 tu=(uv-0.5)*s*1.04+0.5;float ins=step(0.0,tu.x)*step(tu.x,1.0)*step(0.0,tu.y)*step(tu.y,1.0);',
      ' float tx=texture2D(uText,tu).r*ins;float n=h(cell+fr*0.71+uSeed);return vec3(tx*(0.72+0.28*n)+0.05*step(0.95,n));}',
      'vec3 pick(float k,vec2 uv,vec2 cell,float fr,float t){if(k<0.5)return sWash(uv,t);if(k<1.5)return sStars(uv,t);return sTitle(uv,cell,fr);}',
      'void main(){vec2 res=vec2(160.0*uAspect,160.0);vec2 cell=floor(vUv*res);vec2 uv=(cell+0.5)/res;',
      ' float fr=floor(uTime*18.0);float T=uTime/8.0;float k=mod(floor(T),3.0);float f=fract(T);',
      ' vec3 c=mix(pick(k,uv,cell,fr,uTime),pick(mod(k+1.0,3.0),uv,cell,fr,uTime),smoothstep(0.92,1.0,f));',
      ' c=mix(sTitle(uv,cell,fr)*0.55,c,uShow);gl_FragColor=vec4(c,1.0);}'
    ].join('\n')
  });
}

/** A cone of light that fades along its length and at its edges. Points along +z from its tip. */
function beamMesh(len, radius, color) {
  const g = new THREE.ConeGeometry(radius, len, 20, 1, true);
  g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: 1 }, uLen: { value: len }, uPow: { value: 1.5 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'uniform float uLen;varying float vF;varying vec3 vN;varying vec3 vV;void main(){vF=1.0-position.z/uLen;vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uI,uPow;varying float vF;varying vec3 vN;varying vec3 vV;void main(){float f=pow(abs(dot(normalize(vN),normalize(vV))),2.2);float a=pow(max(vF,0.0),uPow)*f*uI*0.55;gl_FragColor=vec4(uColor*a,1.0);}'
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 2;
  return m;
}

export function addStage(ctx, model, concert) {
  const { stage, venue } = model, sim = concert.sim, theme = sim.theme || {};
  const { halfZ } = venue.def.floor;
  const accent = new THREE.Color(theme.accent || '#f1eef0');
  const reach = halfZ - stage.frontZ;
  const group = new THREE.Group(); ctx.scene.add(group);
  const black = new THREE.MeshLambertMaterial({ color: 0x0d0e10 });
  const steel = new THREE.MeshLambertMaterial({ color: 0x3a3d44 });
  const edge = new THREE.MeshBasicMaterial({ color: 0xdedede });
  const glow = new THREE.MeshBasicMaterial({ color: accent });
  function box(w, h, d, x, y, z, mat, blocks) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); group.add(m);
    if (blocks) ctx.obstacles.push(m);
    return m;
  }

  /* Deck, runway and B-stage, with light strips along their edges */
  const Y = stage.deckY;
  for (const r of stage.parts) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    box(w, Y, d, cx, Y / 2, cz, black);
    const strip = r.part === 'b' ? glow : edge;
    if (r.part === 'main') box(w, 0.16, 0.1, cx, Y - 0.1, r.z1 + 0.04, edge);
    else {
      box(0.1, 0.12, d, r.x0 - 0.02, Y - 0.05, cz, strip); box(0.1, 0.12, d, r.x1 + 0.02, Y - 0.05, cz, strip);
      box(w, 0.12, 0.1, cx, Y - 0.05, r.z1 + 0.02, strip);
      if (r.part !== 'runway') box(w, 0.12, 0.1, cx, Y - 0.05, r.z0 - 0.02, strip);
    }
  }

  /* Back wall, roof truss and its four legs */
  const main = stage.screens[0], top = main.c[1] + main.h / 2;
  const midZ = stage.backZ + stage.depth / 2, legX = stage.width / 2 + 2.5;
  box(stage.width + 6, top + 3, 1, 0, (top + 3) / 2, stage.backZ - 0.3, black, true);
  box(stage.width + 8, 1.4, stage.depth + 1.5, 0, top + 3.6, midZ, steel, true);
  for (const x of [-legX, legX]) for (const z of [stage.backZ + 0.8, stage.frontZ - 0.6]) box(1.1, top + 3, 1.1, x, (top + 3) / 2, z, steel, true);

  /* Screens */
  const text = titleTexture(concert), screens = [];
  stage.screens.forEach((s, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), screenMaterial(s.w / s.h, i * 3.7, text, accent));
    m.position.set(s.c[0], s.c[1], s.c[2]); m.rotation.y = s.rot; group.add(m); screens.push(m);
    if (i > 0) {                                               // a side screen stands on its own frame
      const back = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.6, s.h + 0.6, 0.5), black);
      back.position.copy(m.position); back.rotation.y = s.rot; back.translateZ(-0.35); group.add(back); ctx.obstacles.push(back);
      box(0.8, s.c[1] - s.h / 2, 0.8, s.c[0], (s.c[1] - s.h / 2) / 2, s.c[2] - 0.4, steel);
    }
  });

  /* Sound desk and delay towers, which can sit in a floor seat's line of sight */
  if (stage.foh) {
    const f = stage.foh, desk = box(f.x1 - f.x0, 2.8, f.z1 - f.z0, (f.x0 + f.x1) / 2, 1.4, (f.z0 + f.z1) / 2, new THREE.MeshLambertMaterial({ color: 0x1a1c21 }), true);
    ctx.floorObs.push(desk);
  }
  const towerH = Math.min(11, (ctx.indoor ? venue.def.ceilingY : 40) * 0.7);
  for (const [x, z] of stage.towers) {
    const mast = box(stage.towerHalf * 1.4, towerH, stage.towerHalf * 1.4, x, towerH / 2, z, steel, true);
    box(2.4, 3.2, 1.8, x, towerH + 1.6, z, black, true);
    ctx.floorObs.push(mast);
  }

  /* Moving beams: a row down from the truss and a row up from the stage front */
  const beamGroup = new THREE.Group(); ctx.scene.add(beamGroup);
  const beams = [], ceiling = ctx.indoor ? venue.def.ceilingY : 90;
  // Beams are sized to the room: a stadium's would white out a 7,000-seat arena
  const size = Math.max(0.35, Math.min(1, reach / 90));
  const nDown = Math.max(4, Math.min(10, Math.round(stage.width / 6)));
  for (let i = 0; i < nDown; i++) {
    const m = beamMesh(Math.min(70, 0.8 * reach + 12), 3.2 * size, i % 3 === 1 ? accent : 0xf4f6ff);
    m.position.set(-stage.width / 2 + 2 + (i * (stage.width - 4)) / (nDown - 1), top + 2.8, stage.frontZ - 0.8);
    beamGroup.add(m); beams.push({ m, up: false, phase: i * 0.7 });
  }
  const nUp = Math.max(3, Math.min(6, Math.round(stage.width / 9)));
  for (let i = 0; i < nUp; i++) {
    const m = beamMesh(Math.min(110, ceiling * 1.3), 4 * size, i % 2 ? 0xffffff : accent);
    m.position.set(-stage.width / 2 + 3 + (i * (stage.width - 6)) / (nUp - 1), Y + 0.2, stage.frontZ - 0.5);
    beamGroup.add(m); beams.push({ m, up: true, phase: i * 1.3 });
  }

  /* Stand-in performers (generic figures, not likenesses) along the stage front */
  const count = Math.max(0, Math.min(12, sim.performers === undefined ? 4 : sim.performers));
  const perfMat = figureMaterial({ emissive: 0x2a2a2a });
  const performers = makeFigures(ctx.scene, buildPerson(true, 'mic'), perfMat, Math.max(1, count));
  const outfits = [0xf4f4f2, 0x1b1b1e, 0xcfc8b8, 0x2a2f3a, 0xe9e9e6, 0x15161a];
  const spots = [];
  const lead = stage.runway !== 'none' && count > 1 ? 1 : 0;                  // one walks out along the runway
  if (lead) spots.push([0, stage.runwayEndZ - 1.5]);
  for (let i = 0; i < count - lead; i++) {
    const n = count - lead, f = n === 1 ? 0 : i / (n - 1) - 0.5;
    spots.push([f * Math.min(stage.width * 0.6, n * 2.6), stage.frontZ - 2.6 - 1.2 * Math.cos(f * Math.PI)]);
  }
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1.02, 1.02, 1.02), p = new THREE.Vector3();
  spots.forEach(([x, z], i) => {
    e.set(0, 0, 0); q.setFromEuler(e); p.set(x, Y, z); mtx.compose(p, q, sc);
    performers.setMatrixAt(i, mtx); performers.setColorAt(i, new THREE.Color(outfits[i % outfits.length]));
    performers.geometry.attributes.aAnim.setXYZW(i, i * 0.37, 0, 2, 0);
  });
  performers.count = spots.length;
  performers.instanceMatrix.needsUpdate = true; performers.instanceColor.needsUpdate = true;
  performers.geometry.attributes.aAnim.needsUpdate = true;

  let show = true;
  const target = new THREE.Vector3();
  function update(t) {
    for (const s of screens) s.material.uniforms.uTime.value = t;
    if (!show) return;
    for (const b of beams) {
      const x = b.m.position.x, ph = b.phase;
      if (b.up) target.set(x + Math.sin(t * 0.5 + ph) * 0.5 * reach, ceiling, stage.frontZ + reach * (0.25 + 0.2 * Math.cos(t * 0.33 + ph)));
      else target.set(x * 0.6 + Math.sin(t * 0.6 + ph) * 0.35 * reach, 0, stage.frontZ + reach * (0.4 + 0.3 * Math.sin(t * 0.41 + ph * 1.7)));
      b.m.lookAt(target);
      b.m.material.uniforms.uI.value = (0.65 + 0.35 * Math.sin(t * 1.9 + ph * 2.1)) * (0.45 + 0.55 * size);
    }
  }

  /** House lights: beams off, screens down to a dim title card, stage empty. */
  function setLights(mode) {
    show = mode !== 'house';
    beamGroup.visible = show;
    performers.visible = show;
    for (const s of screens) s.material.uniforms.uShow.value = show ? 1 : 0;
  }

  update(0);
  return { update, setLights, screens, group, performerCount: spots.length };
}
