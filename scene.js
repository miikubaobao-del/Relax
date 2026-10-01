(() => {
  if (!window.THREE) {
    console.warn("Three.js did not load.");
    return;
  }

  const container = document.getElementById("threeLayer");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    43,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  camera.position.set(0, 6.4, 10.8);
  camera.lookAt(0, 3.0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x76974b, 1.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff7dc, 1.1);
  sun.position.set(-4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const FLOOR_Y = 0;
  const FLOOR_X = 5.7;
  const FLOOR_Z_FRONT = 3.4;
  const FLOOR_Z_BACK = -3.8;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_X * 2, FLOOR_Z_FRONT - FLOOR_Z_BACK),
    new THREE.ShadowMaterial({ color: 0x4c6638, opacity: 0.12 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, FLOOR_Y, (FLOOR_Z_FRONT + FLOOR_Z_BACK) / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const corn = [];
  const chickens = [];

  function randomRange(a, b) {
    return a + Math.random() * (b - a);
  }

  function randomCornPosition() {
    return {
      x: randomRange(-4.4, 4.4),
      z: randomRange(-2.55, 2.15)
    };
  }

  function createCornMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 18, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffc51c,
        roughness: 0.72,
        metalness: 0
      })
    );
    body.scale.set(0.72, 1.15, 0.72);
    body.castShadow = true;
    group.add(body);

    const ridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4a900,
      roughness: 0.8
    });

    for (let i = 0; i < 3; i++) {
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(0.105, 0.015, 7, 16),
        ridgeMaterial
      );
      ridge.rotation.x = Math.PI / 2;
      ridge.scale.set(0.75, 1, 1);
      ridge.position.y = -0.08 + i * 0.08;
      group.add(ridge);
    }

    group.position.y = FLOOR_Y + 0.18;
    return group;
  }

  function worldToScreen(worldPosition) {
    const p = worldPosition.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      ndcZ: p.z
    };
  }

  function worldScaleAt(position) {
    // Slight size change with depth. Overall chicken stays a bit smaller
    // than the background animals.
    const zNorm = THREE.MathUtils.clamp(
      (position.z - FLOOR_Z_BACK) / (FLOOR_Z_FRONT - FLOOR_Z_BACK),
      0,
      1
    );
    return 0.72 + zNorm * 0.16;
  }

  function chooseSpawnPoint() {
    const edge = Math.floor(Math.random() * 4);
    const margin = 0.95;

    if (edge === 0) {
      return { x: -FLOOR_X - margin, z: randomRange(FLOOR_Z_BACK, FLOOR_Z_FRONT) };
    }
    if (edge === 1) {
      return { x: FLOOR_X + margin, z: randomRange(FLOOR_Z_BACK, FLOOR_Z_FRONT) };
    }
    if (edge === 2) {
      return { x: randomRange(-FLOOR_X, FLOOR_X), z: FLOOR_Z_BACK - margin };
    }
    return { x: randomRange(-FLOOR_X, FLOOR_X), z: FLOOR_Z_FRONT + margin };
  }

  function makeChickenElement() {
    const img = document.createElement("img");
    img.src = "chicken.png";
    img.alt = "";
    img.className = "chicken-character";
    document.body.appendChild(img);
    return img;
  }

  function updateChickenVisual(chicken) {
    const world = new THREE.Vector3(
      chicken.position.x,
      FLOOR_Y + 0.55,
      chicken.position.z
    );

    const screen = worldToScreen(world);
    const scale = worldScaleAt(chicken.position);
    const bob = chicken.state === "eating"
      ? -Math.max(0, Math.sin(chicken.eatTime * 20)) * 8
      : Math.abs(Math.sin(chicken.phase)) * -2.2;

    const lean = chicken.state === "eating"
      ? Math.max(0, Math.sin(chicken.eatTime * 20)) * 8
      : Math.sin(chicken.phase) * 1.4;

    chicken.el.style.left = `${screen.x - 43}px`;
    chicken.el.style.top = `${screen.y - 80 + bob}px`;
    chicken.el.style.transform =
      `scaleX(${chicken.flip * scale}) scaleY(${scale}) rotate(${lean * chicken.flip}deg)`;

    // Depth ordering: farther back = lower z-index.
    const depthOrder = Math.round(20 + scale * 20);
    chicken.el.style.zIndex = String(depthOrder);
  }

  function spawnChicken(targetCorn) {
    const start = chooseSpawnPoint();
    const el = makeChickenElement();

    const chicken = {
      el,
      target: targetCorn,
      state: "walking-in",
      position: new THREE.Vector3(start.x, FLOOR_Y, start.z),
      speed: randomRange(1.2, 1.45),
      radius: 0.48,
      pushX: 0,
      pushZ: 0,
      phase: Math.random() * Math.PI * 2,
      eatTime: 0,
      eatDuration: randomRange(1.15, 1.55),
      exit: null,
      flip: 1
    };

    chickens.push(chicken);
    updateChickenVisual(chicken);
    return chicken;
  }

  function chooseExitPoint(chicken) {
    const options = [
      { x: -FLOOR_X - 1.1, z: randomRange(FLOOR_Z_BACK, FLOOR_Z_FRONT) },
      { x: FLOOR_X + 1.1, z: randomRange(FLOOR_Z_BACK, FLOOR_Z_FRONT) },
      { x: randomRange(-FLOOR_X, FLOOR_X), z: FLOOR_Z_BACK - 1.1 },
      { x: randomRange(-FLOOR_X, FLOOR_X), z: FLOOR_Z_FRONT + 1.1 }
    ];

    let best = options[0];
    let bestDist = -1;

    for (const p of options) {
      const dx = p.x - chicken.position.x;
      const dz = p.z - chicken.position.z;
      const d = dx * dx + dz * dz;

      if (d > bestDist) {
        bestDist = d;
        best = p;
      }
    }

    return best;
  }

  function moveChickenToward(chicken, tx, tz, dt) {
    let dx = tx - chicken.position.x;
    let dz = tz - chicken.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.0001) return dist;

    dx /= dist;
    dz /= dist;

    chicken.flip = dx < 0 ? -1 : 1;

    chicken.position.x += (dx * chicken.speed + chicken.pushX) * dt;
    chicken.position.z += (dz * chicken.speed + chicken.pushZ) * dt;

    chicken.pushX *= Math.pow(0.05, dt);
    chicken.pushZ *= Math.pow(0.05, dt);

    chicken.phase += dt * 8.0;

    return dist;
  }

  function resolveChickenCollisions() {
    for (let i = 0; i < chickens.length; i++) {
      for (let j = i + 1; j < chickens.length; j++) {
        const a = chickens[i];
        const b = chickens[j];

        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const dist = Math.hypot(dx, dz);
        const minDist = a.radius + b.radius;

        if (dist > 0 && dist < minDist) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;

          a.position.x -= nx * overlap * 0.5;
          a.position.z -= nz * overlap * 0.5;
          b.position.x += nx * overlap * 0.5;
          b.position.z += nz * overlap * 0.5;

          const impulse = 1.35 + overlap * 2.5;
          a.pushX -= nx * impulse;
          a.pushZ -= nz * impulse;
          b.pushX += nx * impulse;
          b.pushZ += nz * impulse;
        }
      }
    }
  }

  function eatCorn(chicken, dt) {
    chicken.eatTime += dt;

    const target = chicken.target;
    const peck = Math.max(0, Math.sin(chicken.eatTime * 20));

    if (target && target.mesh.parent) {
      const shrink = Math.max(0.05, 1 - chicken.eatTime / chicken.eatDuration);
      target.mesh.scale.setScalar(shrink);
      target.mesh.position.y = FLOOR_Y + 0.18 - peck * 0.04;
    }

    if (chicken.eatTime >= chicken.eatDuration) {
      if (target && target.mesh.parent) {
        scene.remove(target.mesh);
        target.eaten = true;
      }

      chicken.exit = chooseExitPoint(chicken);
      chicken.state = "walking-out";
    }
  }

  function removeChicken(chicken) {
    chicken.el.remove();
    const i = chickens.indexOf(chicken);
    if (i >= 0) chickens.splice(i, 1);
  }

  function updateChickens(dt) {
    for (let i = chickens.length - 1; i >= 0; i--) {
      const ch = chickens[i];

      if (ch.state === "walking-in") {
        if (!ch.target || ch.target.eaten || !ch.target.mesh.parent) {
          ch.exit = chooseExitPoint(ch);
          ch.state = "walking-out";
          continue;
        }

        const t = ch.target.mesh.position;
        const d = moveChickenToward(ch, t.x, t.z, dt);

        if (d < 0.50) {
          ch.state = "eating";
          ch.eatTime = 0;
          ch.position.x = t.x - 0.22 * ch.flip;
          ch.position.z = t.z + 0.05;
        }
      } else if (ch.state === "eating") {
        eatCorn(ch, dt);
      } else if (ch.state === "walking-out") {
        const d = moveChickenToward(ch, ch.exit.x, ch.exit.z, dt);

        if (d < 0.18) {
          removeChicken(ch);
          continue;
        }
      }

      updateChickenVisual(ch);
    }

    resolveChickenCollisions();

    // Re-render after collision pushes.
    for (const ch of chickens) {
      updateChickenVisual(ch);
    }
  }

  function previewCornPosition() {
    const p = randomCornPosition();
    const world = new THREE.Vector3(p.x, FLOOR_Y + 0.18, p.z);
    return {
      x: p.x,
      z: p.z,
      screen: worldToScreen(world)
    };
  }

  function spawnCornAt(x, z, text = "") {
    const mesh = createCornMesh();
    mesh.position.x = x;
    mesh.position.z = z;
    mesh.scale.setScalar(0.05);
    scene.add(mesh);

    const record = {
      mesh,
      text,
      eaten: false,
      targetChicken: null
    };
    corn.push(record);

    const growStart = performance.now();
    function grow(now) {
      if (!mesh.parent) return;
      const t = Math.min(1, (now - growStart) / 260);
      const eased = 1 - Math.pow(1 - t, 3);
      mesh.scale.setScalar(0.05 + eased * 0.95);
      if (t < 1) requestAnimationFrame(grow);
    }
    requestAnimationFrame(grow);

    setTimeout(() => {
      if (!record.eaten) {
        record.targetChicken = spawnChicken(record);
      }
    }, 120 + Math.random() * 220);

    return record;
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.033);

    updateChickens(dt);
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  });

  window.NeverMind3D = {
    scene,
    camera,
    renderer,
    previewCornPosition,
    spawnCornAt,
    corn,
    chickens
  };
})();
