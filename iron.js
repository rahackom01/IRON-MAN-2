import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const canvas = $('stage');
const S = { reactor: 0.05, eyes: 0, palms: 0, shake: 0 };      // animated power state
const cam = { a: 0, r: 6.5, h: 1.4, ly: 1.0 };                 // camera rig
const mouse = { x: 0, y: 0 };

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030305);
  scene.fog = new THREE.FogExp2(0x030305, 0.07);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  // Lights
  scene.add(new THREE.HemisphereLight(0x223355, 0x110000, 0.4));
  const key = new THREE.DirectionalLight(0xffe2b8, 1.6); key.position.set(3, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); scene.add(key);
  const rimR = new THREE.PointLight(0xff2a2a, 40, 12); rimR.position.set(-3, 2.5, -3); scene.add(rimR);
  const rimB = new THREE.PointLight(0x55bbff, 40, 12); rimB.position.set(3, 2, -3); scene.add(rimB);

  // Floor
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0x08080c, metalness: 0.9, roughness: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.15, 64), new THREE.MeshBasicMaterial({ color: 0x9fe8ff }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);

  // Particles
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array.from({ length: 900 }, (_, i) => i % 3 === 1 ? rnd(0, 5) : rnd(-5, 5))), 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.02, color: 0xffb070, transparent: true, opacity: 0.6 }));
  scene.add(dust);

  // ---- Procedural placeholder character (replace with a rigged GLB for realism) ----
  const figure = new THREE.Group(); scene.add(figure);
  const dark = new THREE.MeshStandardMaterial({ color: 0x15151a, metalness: 0.4, roughness: 0.6 });
  const RED = 0xb3121a, GOLD = 0xd4a017;
  const add = (p, geo, pos, mat = dark) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = true; p.add(m); return m; };
  const cyl = (a, b, h) => new THREE.CylinderGeometry(a, b, h, 24);

  add(figure, new THREE.BoxGeometry(0.5, 0.75, 0.26), [0, 1.3, 0]);
  add(figure, new THREE.SphereGeometry(0.14, 24, 24), [0, 1.9, 0]);
  add(figure, cyl(0.07, 0.06, 1.0), [-0.15, 0.5, 0]); add(figure, cyl(0.07, 0.06, 1.0), [0.15, 0.5, 0]);
  const arms = [-1, 1].map(sx => {
    const g = new THREE.Group(); g.position.set(sx * 0.4, 1.7, 0); figure.add(g);
    add(g, cyl(0.05, 0.04, 0.85), [0, -0.42, 0]); return g;
  });

  // Armor pieces + scroll timeline. Each stage occupies 1 unit of timeline time (8 total).
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const count = {};
  const armor = (parent, geo, color, pos, stage, sx = 0, from = null, scale = null) => {
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.92, roughness: 0.25, emissive: 0xff6a00, emissiveIntensity: 3 });
    const m = add(parent, geo, pos, mat); if (scale) m.scale.set(...scale);
    const i = count[stage] = (count[stage] ?? -1) + 1, t = stage + 0.04 + i * 0.07;
    const r = m.rotation.clone(), p = m.position.clone(), s = sx || (i % 2 ? 1 : -1);
    const f = from || { x: p.x + s * 7, y: p.y + rnd(-1, 3), z: p.z + rnd(-3, 4) };
    tl.fromTo(m.position, f, { x: p.x, y: p.y, z: p.z, duration: 0.6, ease: 'power3.inOut' }, t)
      .fromTo(m.rotation, { x: rnd(-4, 4), y: rnd(-4, 4), z: rnd(-4, 4) }, { x: r.x, y: r.y, z: r.z, duration: 0.6, ease: 'power3.inOut' }, t)
      .fromTo(m.material, { emissiveIntensity: 3 }, { emissiveIntensity: 0, duration: 0.25, ease: 'power2.out' }, t + 0.6); // lock flash
    return m;
  };

  // Stage 2 legs, Stage 3 boots + forearms
  [-1, 1].forEach((sx, k) => {
    armor(figure, cyl(0.15, 0.12, 0.45), RED, [sx * 0.15, 0.75, 0], 1, sx);
    armor(figure, cyl(0.12, 0.09, 0.45), RED, [sx * 0.15, 0.3, 0], 1, sx);
    armor(figure, new THREE.BoxGeometry(0.2, 0.14, 0.34), GOLD, [sx * 0.15, 0.07, 0.05], 2, sx);
    const g = arms[k];
    armor(g, cyl(0.09, 0.065, 0.36), GOLD, [0, -0.62, 0], 2, sx);
  });
  // Stage 4 torso + shoulders
  armor(figure, new THREE.BoxGeometry(0.42, 0.22, 0.26), GOLD, [0, 1.08, 0], 3, -1);
  const chest = armor(figure, new THREE.BoxGeometry(0.56, 0.42, 0.3), RED, [0, 1.5, 0.02], 3, 1);
  armor(figure, new THREE.BoxGeometry(0.54, 0.45, 0.1), RED, [0, 1.5, -0.17], 3, -1);
  const reactorMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9fe8ff, emissiveIntensity: 0 });
  const reactor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 32), reactorMat);
  reactor.rotation.x = Math.PI / 2; reactor.position.z = 0.155; chest.add(reactor);
  const chestLight = new THREE.PointLight(0x9fe8ff, 0, 4); chestLight.position.set(0, 1.5, 0.5); figure.add(chestLight);
  arms.forEach((g, k) => armor(g, new THREE.SphereGeometry(0.15, 24, 24), RED, [0, 0, 0], 3, k ? 1 : -1, null, [1, 0.8, 1]));
  // Stage 5 arms + hands
  const palmMat = new THREE.MeshStandardMaterial({ color: 0, emissive: 0x9fe8ff, emissiveIntensity: 0 });
  arms.forEach((g, k) => {
    const sx = k ? 1 : -1;
    armor(g, cyl(0.1, 0.09, 0.3), RED, [0, -0.22, 0], 4, sx);
    const hand = armor(g, new THREE.SphereGeometry(0.08, 20, 20), GOLD, [0, -0.88, 0], 4, sx);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), palmMat); palm.position.set(0, -0.06, 0.04); hand.add(palm);
  });
  // Stage 6 helmet (flies in from the front) + faceplate with eyes
  const helmet = armor(figure, new THREE.SphereGeometry(0.19, 32, 32), RED, [0, 1.92, 0], 5, 1, { x: 0, y: 2.2, z: 6 }, [1, 1.15, 1.05]);
  const face = armor(figure, new THREE.BoxGeometry(0.22, 0.2, 0.06), GOLD, [0, 1.9, 0.18], 5, 1, { x: 0, y: 2.5, z: 7 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xbfeaff, emissiveIntensity: 0 });
  [-0.055, 0.055].forEach(x => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.01), eyeMat); e.position.set(x, 0.03, 0.033); face.add(e); });
  tl.to(S, { shake: 1, duration: 0.04 }, 5.72).to(S, { shake: 0, duration: 0.25 }, 5.76);
  // Reactor ignites as chest locks; stage 7 full power
  tl.to(S, { reactor: 1.5, duration: 0.25 }, 3.7)
    .to(S, { reactor: 4, duration: 0.5 }, 6).to(S, { eyes: 1, duration: 0.25 }, 6.3).to(S, { palms: 1, duration: 0.4 }, 6.5);
  // Stage 8 pose
  tl.to(arms[0].rotation, { z: -0.75, duration: 0.7, ease: 'power2.inOut' }, 7.1)
    .to(arms[1].rotation, { z: 0.75, duration: 0.7, ease: 'power2.inOut' }, 7.1);

  // Scan line (stage 1)
  const scan = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.008, 1.4), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0 }));
  scene.add(scan);
  tl.fromTo(scan.material, { opacity: 0 }, { opacity: 0.7, duration: 0.05 }, 0.05).fromTo(scan.position, { y: 0 }, { y: 2.2, duration: 0.9 }, 0.05)
    .to(scan.material, { opacity: 0, duration: 0.05 }, 0.95);

  // Camera per stage
  [[0.7, 5.5, 1.4, 1.0], [-0.4, 5, 0.9, 0.6], [0.3, 4.5, 0.7, 0.5], [0, 5, 1.5, 1.3], [-0.3, 4.5, 1.6, 1.2], [0, 2.2, 1.95, 1.9], [0, 3.5, 1.7, 1.5], [1.3, 6, 1.5, 1.1]]
    .forEach(([a, r, h, ly], i) => tl.to(cam, { a, r, h, ly, duration: 1, ease: 'sine.inOut' }, i));

  // HUD
  const stages = [
    ['ARMOR INITIALIZATION', 'Scanning body frame and mapping components.'], ['LEG ARMOR', 'Thigh and shin plates lock to the leg joints.'],
    ['BOOTS & GAUNTLETS', 'Boots and forearm guards seal on.'], ['TORSO & SHOULDERS', 'Chest, back and abdomen lock. Reactor ignites.'],
    ['ARM & HAND ASSEMBLY', 'Upper arms and hand armor join.'], ['HELMET ASSEMBLY', 'Helmet and faceplate close.'],
    ['POWER ACTIVATION', 'Reactor at full output. Eyes and repulsors online.'], ['FINAL ARMOR REVEAL', 'All systems nominal.']];
  let last = -1;
  const updateHUD = p => {
    const i = Math.min(7, Math.floor(p * 8));
    if (i !== last) { last = i; $('hn').textContent = String(i + 1).padStart(2, '0'); $('ht').textContent = stages[i][0]; $('hd').textContent = stages[i][1]; }
    $('hb').style.width = p * 100 + '%'; $('online').classList.toggle('on', p > 0.93);
  };

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({
    trigger: '#sequence', start: 'top top', end: 'bottom bottom', scrub: 1,
    onUpdate: s => { tl.progress(s.progress); updateHUD(s.progress); },
    onToggle: s => $('hud').classList.toggle('on', s.isActive),
  });
  $('begin').onclick = () => $('sequence').scrollIntoView({ behavior: 'smooth' });
  $('replay').onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; });

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 70 : 38; camera.updateProjectionMatrix();
    ScrollTrigger.refresh();
  };
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime(), a = cam.a + mouse.x * 0.5;
    camera.position.set(Math.sin(a) * cam.r, cam.h - mouse.y * 0.4, Math.cos(a) * cam.r);
    camera.position.x += (Math.random() - 0.5) * 0.04 * S.shake; camera.position.y += (Math.random() - 0.5) * 0.04 * S.shake;
    camera.lookAt(0, cam.ly, 0);
    reactorMat.emissiveIntensity = S.reactor * (1 + 0.15 * Math.sin(t * 4));
    chestLight.intensity = S.reactor * 3;
    eyeMat.emissiveIntensity = S.eyes * 5; palmMat.emissiveIntensity = S.palms * 5;
    dust.rotation.y = t * 0.02;
    renderer.render(scene, camera);
  });
  $('loader').classList.add('done');
} catch (err) {
  console.error(err);
  $('loadmsg').textContent = 'Could not start 3D scene: ' + err.message + '. Check that WebGL is enabled and you are serving the files over http.';
}