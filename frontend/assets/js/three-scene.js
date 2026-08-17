/**
 * AutoBuddy Premium 3D Vehicle Studio
 * Realistic procedural sedan with studio lighting and interaction-based camera.
 */

class VehicleStudio3D {
  constructor(containerId = "hero3DViewport") {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.carGroup = null;
    this.hotspotMeshes = [];
    this.hoveredHotspot = null;
    this.activeHotspotData = null;
    this.animationId = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.innerWidth < 768;

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseNorm = { x: 0, y: 0 };
    this.spherical = { radius: 7.2, theta: 0.75, phi: 1.18 };
    this.targetSpherical = { radius: 7.2, theta: 0.75, phi: 1.18 };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);

    this.init();
  }

  init() {
    if (typeof THREE === "undefined") {
      console.warn("Three.js not loaded.");
      return;
    }

    const width = this.container.clientWidth || 540;
    const height = this.container.clientHeight || 380;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.updateCamera();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.25 : 2));
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    this.envMap = this.createEnvironmentMap();

    this.setupStudioLighting();
    this.setupStudioFloor();
    this.buildLuxuryVehicle();
    this.setupHotspots();
    this.setupEventListeners();
    this.setupCameraControls();

    this.animate = this.animate.bind(this);
    this.animationId = requestAnimationFrame(this.animate);
  }

  createEnvironmentMap() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#1a2744");
    grad.addColorStop(0.45, "#0d1525");
    grad.addColorStop(0.55, "#080c14");
    grad.addColorStop(1, "#050810");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const spot = ctx.createRadialGradient(size * 0.5, size * 0.15, 0, size * 0.5, size * 0.15, size * 0.35);
    spot.addColorStop(0, "rgba(0, 132, 255, 0.18)");
    spot.addColorStop(1, "rgba(0, 132, 255, 0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  setupStudioLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0a0f18, 0.65);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(5, 9, 7);
    if (!this.isMobile) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.radius = 2;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.85);
    rimLight.position.set(-7, 5, -6);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(0, 2, 8);
    this.scene.add(fillLight);

    const underGlow = new THREE.PointLight(0x0084ff, 0.35, 12);
    underGlow.position.set(0, 0.2, 0);
    this.scene.add(underGlow);
  }

  setupStudioFloor() {
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 118);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
    gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.25)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 3.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.008;
    this.scene.add(contactShadow);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.75, 2.78, 72),
      new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    this.scene.add(ring);
  }

  buildLuxuryVehicle() {
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    const paint = new THREE.MeshStandardMaterial({
      color: 0x0f1a2e,
      metalness: 0.92,
      roughness: 0.14,
      envMap: this.envMap,
      envMapIntensity: 1.1
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x0a1220,
      metalness: 0.05,
      roughness: 0.04,
      transmission: 0.88,
      transparent: true,
      opacity: 0.82,
      ior: 1.52,
      envMap: this.envMap,
      envMapIntensity: 0.6
    });

    const carbon = new THREE.MeshStandardMaterial({ color: 0x060a10, roughness: 0.7, metalness: 0.25 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe8edf5, metalness: 0.97, roughness: 0.08, envMap: this.envMap, envMapIntensity: 0.8 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.95, metalness: 0.04 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x0084ff, metalness: 0.75, roughness: 0.22, envMap: this.envMap, envMapIntensity: 0.5 });
    const headlight = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const taillight = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

    const addMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, shadow = true) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      if (shadow && !this.isMobile) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      this.carGroup.add(mesh);
      return mesh;
    };

    // Lower body — tapered profile using multiple panels
    addMesh(new THREE.BoxGeometry(2.08, 0.38, 4.55), paint, 0, 0.46, 0);
    addMesh(new THREE.BoxGeometry(1.95, 0.12, 4.2), paint, 0, 0.68, 0.05);

    // Front fascia sculpt
    addMesh(new THREE.BoxGeometry(2.02, 0.28, 0.55), paint, 0, 0.58, 2.05);
    addMesh(new THREE.BoxGeometry(1.72, 0.32, 0.18), carbon, 0, 0.52, 2.32);

    // Hood with slight rake
    const hood = addMesh(new THREE.BoxGeometry(1.86, 0.18, 1.42), paint, 0, 0.74, 1.38, 0.06, 0, 0);

    // Cabin greenhouse
    addMesh(new THREE.BoxGeometry(1.68, 0.58, 2.35), glass, 0, 0.98, -0.12);
    addMesh(new THREE.BoxGeometry(1.62, 0.05, 2.05), paint, 0, 1.28, -0.15);

    // Fastback rear
    addMesh(new THREE.BoxGeometry(1.88, 0.22, 0.85), paint, 0, 0.72, -1.95, -0.12, 0, 0);

    // Fender arches (subtle bulge)
    [[-1.06, 1.35], [1.06, 1.35], [-1.06, -1.35], [1.06, -1.35]].forEach(([x, z]) => {
      addMesh(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), paint, x, 0.38, z);
    });

    // Side skirts
    addMesh(new THREE.BoxGeometry(0.04, 0.06, 3.8), carbon, -1.06, 0.32, 0);
    addMesh(new THREE.BoxGeometry(0.04, 0.06, 3.8), carbon, 1.06, 0.32, 0);

    // Headlights — slim LED bars
    [[-0.74, 2.22], [0.74, 2.22]].forEach(([x, z]) => {
      addMesh(new THREE.BoxGeometry(0.38, 0.06, 0.06), headlight, x, 0.7, z);
      addMesh(new THREE.BoxGeometry(0.32, 0.04, 0.04), chrome, x, 0.66, z + 0.02);
    });

    // Full-width taillight bar
    addMesh(new THREE.BoxGeometry(1.94, 0.05, 0.05), taillight, 0, 0.76, -2.24);

    // Grille slats
    for (let i = -3; i <= 3; i++) {
      addMesh(new THREE.BoxGeometry(0.04, 0.18, 0.02), chrome, i * 0.12, 0.54, 2.28, 0, 0, 0, false);
    }

    // Mirrors
    [[-1.02, 0.95, 0.55], [1.02, 0.95, 0.55]].forEach(([x, y, z]) => {
      addMesh(new THREE.BoxGeometry(0.12, 0.08, 0.16), paint, x, y, z);
      addMesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), chrome, x * 1.02, y - 0.02, z + 0.08, 0, 0, 0, false);
    });

    // Wheels with multi-spoke rims
    const wheelPositions = [
      { x: -1.06, z: 1.42 },
      { x: 1.06, z: 1.42 },
      { x: -1.06, z: -1.42 },
      { x: 1.06, z: -1.42 }
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, 0.36, pos.z);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.1, 12, 32), rubber);
      tire.rotation.y = Math.PI / 2;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.22, 24), chrome);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.06), chrome);
        spoke.rotation.z = (s / 5) * Math.PI * 2;
        spoke.position.y = 0.02;
        wheelGroup.add(spoke);
      }

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.1), accent);
      caliper.position.set(pos.x > 0 ? -0.07 : 0.07, 0.08, 0);
      wheelGroup.add(caliper);

      this.carGroup.add(wheelGroup);
    });

    void hood;
  }

  setupHotspots() {
    this.hotspotData = [
      { id: "engine", title: "Engine Service", desc: "Oil, fluids & diagnostics", price: "₹1,200", serviceName: "Engine Oil Change", position: new THREE.Vector3(0, 0.78, 1.45) },
      { id: "battery", title: "Battery", desc: "Jumpstart & electrical", price: "₹500", serviceName: "Battery Jumpstart", position: new THREE.Vector3(-0.6, 0.78, 1.25) },
      { id: "brakes", title: "Brakes", desc: "Pads & calibration", price: "₹500", serviceName: "Brake Check & Adjustment", position: new THREE.Vector3(1.12, 0.42, 1.4) },
      { id: "tires", title: "Tires", desc: "Repair & balancing", price: "₹150", serviceName: "Puncture Repair", position: new THREE.Vector3(1.12, 0.42, -1.4) },
      { id: "cabin", title: "Cabin Care", desc: "AC & interior", price: "₹1,500", serviceName: "Interior Deep Cleaning", position: new THREE.Vector3(0, 1.15, 0.1) },
      { id: "body", title: "Detailing", desc: "Polish & protection", price: "₹2,500", serviceName: "Full Detailing Package", position: new THREE.Vector3(-1.1, 0.78, -0.4) }
    ];

    this.hotspotMeshes = [];
    const pinGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x0084ff });

    this.hotspotData.forEach((data) => {
      const group = new THREE.Group();
      group.position.copy(data.position);

      const sphere = new THREE.Mesh(pinGeo, pinMat);
      group.add(sphere);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.11, 20),
        new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      ring.userData.isPulse = true;
      group.add(ring);

      group.userData = data;
      this.scene.add(group);
      this.hotspotMeshes.push(sphere);
    });

    this.createTooltip();
  }

  createTooltip() {
    let tooltip = document.getElementById("hotspot3DTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "hotspot3DTooltip";
      tooltip.className = "hotspot-3d-tooltip";
      tooltip.innerHTML = `
        <div class="hotspot-top">
          <span class="hotspot-tag">Service</span>
          <span class="hotspot-price" id="hotspotPrice">₹0</span>
        </div>
        <strong class="hotspot-title" id="hotspotTitle">Component</strong>
        <p class="hotspot-desc" id="hotspotDesc">Details</p>
        <button type="button" class="hotspot-book-action" id="hotspotBookBtn">Book</button>
      `;
      this.container.appendChild(tooltip);

      tooltip.querySelector("#hotspotBookBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.activeHotspotData) {
          if (typeof window.bookPricedService === "function") {
            const priceNum = parseInt(this.activeHotspotData.price.replace(/\D/g, ""), 10) || 500;
            window.bookPricedService(this.activeHotspotData.serviceName, priceNum, e.currentTarget);
          } else {
            window.location.href = "services.html";
          }
        }
      });
    }
    this.tooltipEl = tooltip;
  }

  setupEventListeners() {
    const el = this.renderer.domElement;

    el.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    const onMove = (clientX, clientY) => {
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseNorm.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouseNorm.y = (clientY / window.innerHeight) * 2 - 1;

      if (this.isDragging) {
        const deltaX = clientX - this.previousMousePosition.x;
        const deltaY = clientY - this.previousMousePosition.y;
        this.targetSpherical.theta -= deltaX * 0.007;
        this.targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.007));
        this.previousMousePosition = { x: clientX, y: clientY };
      }
    };

    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    const endDrag = () => { this.isDragging = false; };
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);

    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetSpherical.radius = Math.max(5.2, Math.min(8.8, this.targetSpherical.radius + e.deltaY * 0.003));
    }, { passive: false });

    el.addEventListener("click", () => {
      if (this.hoveredHotspot) {
        this.showHotspot(this.hoveredHotspot.parent.userData);
      }
    });

    window.addEventListener("resize", () => {
      if (!this.container || !this.renderer || !this.camera) return;
      this.isMobile = window.innerWidth < 768;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.25 : 2));
    });
  }

  setupCameraControls() {
    document.querySelectorAll(".camera-preset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".camera-preset-btn").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const view = e.currentTarget.dataset.view;
        const presets = {
          hero: { radius: 7.2, theta: 0.75, phi: 1.18 },
          side: { radius: 7.0, theta: 1.57, phi: 1.35 },
          front: { radius: 6.8, theta: 0.15, phi: 1.25 }
        };
        if (presets[view]) this.targetSpherical = { ...presets[view] };
      });
    });
  }

  showHotspot(data) {
    this.activeHotspotData = data;
    if (!this.tooltipEl) return;

    document.getElementById("hotspotPrice").textContent = data.price;
    document.getElementById("hotspotTitle").textContent = data.title;
    document.getElementById("hotspotDesc").textContent = data.desc;

    const screenPos = data.position.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = ((screenPos.x + 1) * rect.width) / 2;
    const y = ((-screenPos.y + 1) * rect.height) / 2;

    this.tooltipEl.style.left = `${Math.max(10, Math.min(rect.width - 250, x - 120))}px`;
    this.tooltipEl.style.top = `${Math.max(10, Math.min(rect.height - 160, y - 120))}px`;
    this.tooltipEl.classList.add("visible");
  }

  updateCamera() {
    const parallaxTheta = this.reducedMotion ? 0 : this.mouseNorm.x * 0.04;
    const parallaxPhi = this.reducedMotion ? 0 : this.mouseNorm.y * 0.025;
    const ease = this.reducedMotion ? 0.12 : 0.06;

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * ease;
    this.spherical.theta += (this.targetSpherical.theta + parallaxTheta - this.spherical.theta) * ease;
    this.spherical.phi += (this.targetSpherical.phi + parallaxPhi - this.spherical.phi) * ease;

    this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.lookAt(0, 0.6, 0);
  }

  animate(time) {
    this.animationId = requestAnimationFrame(this.animate);
    this.updateCamera();

    if (this.carGroup && !this.reducedMotion) {
      this.carGroup.position.y = Math.sin(time * 0.0012) * 0.012;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspotMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredHotspot !== hit) {
        this.hoveredHotspot = hit;
        this.container.style.cursor = "pointer";
        this.showHotspot(hit.parent.userData);
      }
    } else if (this.hoveredHotspot && !this.isDragging) {
      this.hoveredHotspot = null;
      this.container.style.cursor = this.isDragging ? "grabbing" : "grab";
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.dispose();
  }
}

function initBackground3DParticles(canvasId = "ambientParticleCanvas") {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === "undefined") return;
  if (window.innerWidth < 768 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.style.display = "none";
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

  const count = 120;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 900;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 900;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 900;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ size: 2, color: 0x0084ff, transparent: true, opacity: 0.28 })
  );
  scene.add(particles);

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.015;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.015;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.0002;
    camera.position.x += (mouseX - camera.position.x) * 0.015;
    camera.position.y += (-mouseY - camera.position.y) * 0.015;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }
  animate();
}

window.VehicleStudio3D = VehicleStudio3D;
window.initBackground3DParticles = initBackground3DParticles;

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("hero3DViewport")) {
    window.heroVehicleStudio = new VehicleStudio3D("hero3DViewport");
  }
  if (document.getElementById("ambientParticleCanvas")) {
    window.initBackground3DParticles("ambientParticleCanvas");
  }
});
