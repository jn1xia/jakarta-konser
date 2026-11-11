// Jointed stand-in figures, shared by the crowd and the performers on stage. One pose function
// in the shader moves every body and every light together: a steady bounce, a sway that
// travels round the bowl, and arms that come down when the house lights are up.
//
// Figure space: feet at the origin, facing +z, shoulders at y 1.42.
// aAnim = (phase, angle round the bowl, mode, walking); mode 0 seated fan, 1 standing fan, 2 performer.
// Parts: 0 torso and hips, 1 head, 2 the arm that holds something, 3 free arm, 4 held light, 5/6 legs.
// Tints: 0 fixed colour, 1 clothing (per figure), 2 skin (per figure), 3 glowing light, 4 hair.

const THREE = window.THREE;

export const animU = { uTime: { value: 0 }, uEnergy: { value: 1 } };

export const POSE_GLSL = [
  'uniform float uTime;uniform float uEnergy;',
  'vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,v.y*c-v.z*s,v.y*s+v.z*c);}',
  'vec3 rotZ(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x*c-v.y*s,v.x*s+v.y*c,v.z);}',
  'void crowdPose(vec4 a,out vec4 arms,out vec4 body){',
  ' float pb=3.14159*(uTime*2.0+a.x*0.3);float pump=abs(sin(pb));',
  ' if(a.z>1.5){',
  '  float g=sin(uTime*7.0+a.x*6.2832),d1=sin(pb*0.5+a.x*6.2832),w=a.w;',
  '  arms=vec4(mix(1.2+0.9*d1,2.75+0.3*g,w),mix(0.5*sin(pb+a.x*4.0),0.0,w),mix(-1.0-0.9*sin(pb*0.5+a.x*6.2832+1.6),0.4*g,w),0.0);',
  '  body=vec4(mix(0.14*pump,0.03*g,w),mix(0.1*sin(pb),0.0,w),mix(0.1*pump,0.03*abs(g),w),mix(0.12*sin(pb),0.55*g,w));',
  '  return;}',
  ' float e=uEnergy,st=a.z,sway=sin(pb+a.y*2.0+a.x*0.8);',
  // seated fans wave at head height in front of them; standing fans raise their arms high
  ' arms=vec4(mix(2.35,mix(1.05-0.12*pump,0.22-0.18*pump,st),e),0.55*sway*e*mix(0.6,1.0,st),-e*(0.25+step(0.62,a.x)*(1.25+0.7*pump)*mix(0.55,1.0,st)),mix(-1.3,0.0,st));',
  ' body=vec4(0.16*pump*e,0.05*sway*e*(0.4+0.6*st),mix(-0.4,0.07*pow(pump,1.5)*e,st),0.0);}',
  'void poseVertex(inout vec3 p,inout vec3 n,float part,vec4 arms,vec4 body){vec3 o;',
  ' if((part>1.5&&part<2.5)||(part>3.5&&part<4.5)){o=vec3(0.215,1.42,0.0);p=rotZ(rotX(p-o,arms.x),arms.y)+o;n=rotZ(rotX(n,arms.x),arms.y);}',
  ' else if(part>2.5&&part<3.5){o=vec3(-0.215,1.42,0.0);p=rotX(p-o,arms.z)+o;n=rotX(n,arms.z);}',
  ' else if(part>0.5&&part<1.5){o=vec3(0.0,1.5,0.0);p=rotX(p-o,body.x)+o;n=rotX(n,body.x);}',
  ' else if(part>4.5&&part<5.5){o=vec3(0.085,0.82,0.0);p=rotX(p-o,arms.w+body.w)+o;n=rotX(n,arms.w+body.w);}',
  ' else if(part>5.5){o=vec3(-0.085,0.82,0.0);p=rotX(p-o,arms.w-body.w)+o;n=rotX(n,arms.w-body.w);}',
  ' p=rotZ(p,body.y);n=rotZ(n,body.y);p.y+=body.z;}'
].join('\n');

/** Where the held light sits in figure space before posing; the far-away glow points use it too. */
export const LIGHT_TIP = [0.215, 2.28, 0];

export const CLOTHES = [0x16171a, 0x1d1f24, 0xe9e9e6, 0x14151a, 0x2b2f38, 0xb9a26a, 0x30466e, 0x1a1b1f, 0x6e2230, 0x4a4e57, 0x101114, 0xbfc3c9].map((c) => new THREE.Color(c));

/** One figure's geometry. held: 'stick' (lightstick), 'phone' (phone torch), 'mic' or null. */
export function buildPerson(detail, held) {
  const P = [], N = [], C = [], PART = [], TINT = [], IDX = [];
  let off = 0;
  const DENIM = [0.13, 0.14, 0.17], WHITE = [1, 1, 1], SKIN = [0.86, 0.66, 0.52], BLACK = [0.05, 0.05, 0.06];
  function add(g, part, tint, col) {
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) { P.push(p[i], p[i + 1], p[i + 2]); N.push(n[i], n[i + 1], n[i + 2]); C.push(col[0], col[1], col[2]); PART.push(part); TINT.push(tint); }
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) IDX.push(ix[i] + off); }
    else for (let i = 0; i < p.length / 3; i++) IDX.push(i + off);
    off += p.length / 3; g.dispose();
  }
  const B = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const Cy = (rt, rb, h, seg, x, y, z) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
  const SH = 1.42, SX = 0.215;
  [1, -1].forEach((k) => { const part = k > 0 ? 5 : 6; add(B(0.13, 0.8, 0.15, k * 0.085, 0.42, 0), part, 0, DENIM); add(B(0.13, 0.07, 0.25, k * 0.085, 0.035, 0.04), part, 0, BLACK); });
  if (detail) {
    add(B(0.31, 0.16, 0.19, 0, 0.86, 0), 0, 0, DENIM);
    add(new THREE.CylinderGeometry(0.19, 0.155, 0.56, 7).scale(1, 1, 0.62).translate(0, 1.2, 0), 0, 1, WHITE);
    add(Cy(0.045, 0.05, 0.1, 6, 0, 1.5, 0), 0, 2, SKIN);
    add(new THREE.SphereGeometry(0.105, 9, 7).scale(0.95, 1.1, 1).translate(0, 1.64, 0), 1, 2, SKIN);
    add(new THREE.SphereGeometry(0.113, 9, 4, 0, Math.PI * 2, 0, Math.PI * 0.56).scale(0.97, 1.1, 1.05).translate(0, 1.656, -0.012), 1, 4, WHITE);
    [[1, 2], [-1, 3]].forEach(([k, part]) => {
      add(Cy(0.048, 0.044, 0.3, 6, k * SX, SH + k * 0.15, 0), part, 1, WHITE);
      add(Cy(0.042, 0.036, 0.3, 6, k * SX, SH + k * 0.45, 0), part, 2, SKIN);
      add(B(0.07, 0.085, 0.06, k * SX, SH + k * 0.64, 0), part, 2, SKIN);
    });
  } else {
    add(B(0.38, 0.7, 0.22, 0, 1.13, 0), 0, 1, WHITE);
    add(B(0.19, 0.23, 0.21, 0, 1.63, 0), 1, 2, SKIN);
    add(B(0.2, 0.07, 0.22, 0, 1.75, -0.01), 1, 4, WHITE);
    add(B(0.085, 0.66, 0.085, SX, SH + 0.33, 0), 2, 1, WHITE);
    add(B(0.085, 0.66, 0.085, -SX, SH - 0.33, 0), 3, 1, WHITE);
  }
  if (held === 'stick') {                                      // a plain lightstick: handle and glowing bulb
    add(Cy(0.017, 0.017, 0.16, 5, SX, SH + 0.72, 0), 2, 0, BLACK);
    add(detail ? new THREE.SphereGeometry(0.06, 8, 6).translate(SX, SH + 0.85, 0) : B(0.11, 0.1, 0.11, SX, SH + 0.84, 0), 4, 3, WHITE);
  } else if (held === 'phone') {                               // a phone held up with its torch on
    add(B(0.075, 0.15, 0.012, SX, SH + 0.76, 0), 2, 0, BLACK);
    add(B(0.03, 0.03, 0.02, SX, SH + 0.81, -0.012), 4, 3, WHITE);
  } else if (held === 'mic' && detail) {
    add(Cy(0.016, 0.012, 0.17, 6, SX, SH + 0.72, 0), 2, 0, BLACK);
    add(new THREE.SphereGeometry(0.03, 8, 6).translate(SX, SH + 0.82, 0), 2, 0, [0.25, 0.25, 0.27]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(PART, 1));
  g.setAttribute('aTint', new THREE.Float32BufferAttribute(TINT, 1));
  g.setIndex(IDX);
  return g;
}

/** A material whose vertices follow the pose function; `glow` is the colour of the held light. */
export function figureMaterial({ glow = 0xffffff, emissive = 0x000000 } = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive });
  const uGlow = { value: new THREE.Color(glow) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = animU.uTime; shader.uniforms.uEnergy = animU.uEnergy; shader.uniforms.uGlow = uGlow;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${POSE_GLSL}\nattribute vec4 aAnim;\nattribute float aPart;\nattribute float aTint;\nvarying float vTint;`)
      .replace('#include <color_vertex>', ['vColor=color;', '#ifdef USE_INSTANCING_COLOR', 'if(aTint>0.5&&aTint<1.5) vColor*=instanceColor;', '#endif',
        'if(aTint>1.5&&aTint<2.5) vColor*=0.62+0.42*fract(aAnim.x*13.7);',
        'if(aTint>3.5) vColor=mix(vec3(0.05,0.04,0.035),vec3(0.62,0.5,0.32),step(0.86,fract(aAnim.x*31.0)));'].join('\n'))
      .replace('#include <beginnormal_vertex>', 'vec4 pArms,pBody;crowdPose(aAnim,pArms,pBody);vec3 objectNormal=vec3(normal);vec3 posed=position;poseVertex(posed,objectNormal,aPart,pArms,pBody);vTint=aTint;')
      .replace('#include <begin_vertex>', 'vec3 transformed=posed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTint;\nuniform float uEnergy;\nuniform vec3 uGlow;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif(vTint>2.5&&vTint<3.5) gl_FragColor=vec4(uGlow*(0.55+0.75*uEnergy),1.0);');
  };
  mat.userData.uGlow = uGlow;
  return mat;
}

/** An instanced set of up to `max` figures; set matrices, colours and aAnim, then `count`. */
export function makeFigures(scene, geo, mat, max) {
  const anim = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
  anim.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aAnim', anim);
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  for (let i = 0; i < max; i++) mesh.setColorAt(i, CLOTHES[i % CLOTHES.length]);
  mesh.count = 0; mesh.frustumCulled = false; scene.add(mesh);
  return mesh;
}
