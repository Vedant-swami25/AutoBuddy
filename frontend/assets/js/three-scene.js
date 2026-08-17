/**
 * AutoBuddy Premium 3D Vehicle Studio
 * High-fidelity automotive presentation with realistic materials, studio lighting,
 * and interaction-based camera physics (Porsche / Polestar / Apple standard).
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

    // Interaction physics
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

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.updateCamera();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Build scene
    this.setupStudioLighting();
    this.setupStudioFloor();
    this.buildLuxuryVehicle();
    this.setupHotspots();
    this.setupEventListeners();
    this.setupCameraControls();

    // Render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupStudioLighting() {
    // Soft ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Studio Key Light (soft white)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 3;
    this.scene.add(keyLight);

    // Studio Rim Light (crisp cool backlight)
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.2);
    rimLight.position.set(-8, 6, -8);
    this.scene.add(rimLight);

    // Front Grille Soft Fill
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
    fillLight.position.set(0, 3, 7);
    this.scene.add(fillLight);
  }

  setupStudioFloor() {
    // Soft radial contact shadow under the vehicle
    const shadowGeo = new THREE.PlaneGeometry(5.4, 3.2);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext("2d");

    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.65)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.3)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });

    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.01;
    this.scene.add(contactShadow);

    // Studio turntable ground ring
    const ringGeo = new THREE.RingGeometry(2.8, 2.82, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    this.scene.add(ring);
  }

  buildLuxuryVehicle() {
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    // Realistic PBR Materials
    const paintMaterial = new THREE.MeshStandardMaterial({
      color: 0x111c2e, // Deep Obsidian Slate
      metalness: 0.88,
      roughness: 0.18
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.75,
      ior: 1.52
    });

    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d14,
      roughness: 0.65,
      metalness: 0.3
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.1
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e242e,
      roughness: 0.92,
      metalness: 0.08
    });

    const ledHeadlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    const ledTaillightMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x0084ff,
      metalness: 0.8,
      roughness: 0.25
    });

    // 1. Lower Aerodynamic Body
    const bodyBaseGeo = new THREE.BoxGeometry(2.05, 0.42, 4.4);
    const bodyBase = new THREE.Mesh(bodyBaseGeo, paintMaterial);
    bodyBase.position.y = 0.48;
    bodyBase.castShadow = true;
    bodyBase.receiveShadow = true;
    this.carGroup.add(bodyBase);

    // 2. Sculpted Hood
    const hoodGeo = new THREE.BoxGeometry(1.88, 0.22, 1.35);
    const hood = new THREE.Mesh(hoodGeo, paintMaterial);
    hood.position.set(0, 0.72, 1.4);
    hood.rotation.x = 0.07;
    hood.castShadow = true;
    this.carGroup.add(hood);

    // Front Grille & Aero Splitter
    const splitterGeo = new THREE.BoxGeometry(2.08, 0.16, 0.35);
    const splitter = new THREE.Mesh(splitterGeo, carbonMaterial);
    splitter.position.set(0, 0.28, 2.2);
    this.carGroup.add(splitter);

    // 3. Cabin & Greenhouse (Tapered Fastback)
    const cabinGeo = new THREE.BoxGeometry(1.72, 0.64, 2.45);
    const cabin = new THREE.Mesh(cabinGeo, glassMaterial);
    cabin.position.set(0, 0.98, -0.15);
    cabin.castShadow = true;
    this.carGroup.add(cabin);

    // Curved Roof Panel
    const roofGeo = new THREE.BoxGeometry(1.64, 0.06, 2.15);
    const roof = new THREE.Mesh(roofGeo, paintMaterial);
    roof.position.set(0, 1.32, -0.18);
    this.carGroup.add(roof);

    // 4. LED Headlights (Slim Projector Bars)
    [-0.72, 0.72].forEach((x) => {
      const hlGeo = new THREE.BoxGeometry(0.34, 0.08, 0.08);
      const hl = new THREE.Mesh(hlGeo, ledHeadlightMaterial);
      hl.position.set(x, 0.68, 2.18);
      this.carGroup.add(hl);
    });

    // 5. Seamless Rear Lightbar
    const tlGeo = new THREE.BoxGeometry(1.92, 0.06, 0.06);
    const tl = new THREE.Mesh(tlGeo, ledTaillightMaterial);
    tl.position.set(0, 0.74, -2.21);
    this.carGroup.add(tl);

    // Side Aero Blades
    [-1.04, 1.04].forEach((x) => {
      const bladeGeo = new THREE.BoxGeometry(0.02, 0.04, 2.6);
      const blade = new THREE.Mesh(bladeGeo, accentMaterial);
      blade.position.set(x, 0.52, 0);
      this.carGroup.add(blade);
    });

    // 6. High-Detail Alloy Wheels
    const wheelPositions = [
      { x: -1.04, y: 0.36, z: 1.4 },  // Front Left
      { x: 1.04, y: 0.36, z: 1.4 },   // Front Right
      { x: -1.04, y: 0.36, z: -1.4 }, // Rear Left
      { x: 1.04, y: 0.36, z: -1.4 }   // Rear Right
    ];

    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      // Matte rubber tire
      const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 32);
      const tire = new THREE.Mesh(tireGeo, tireMaterial);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // 5-Spoke Metallic Alloy Rim
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.25, 16);
      const rim = new THREE.Mesh(rimGeo, chromeMaterial);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // Brake Caliper
      const caliperGeo = new THREE.BoxGeometry(0.08, 0.14, 0.1);
      const caliper = new THREE.Mesh(caliperGeo, accentMaterial);
      caliper.position.set(pos.x > 0 ? -0.06 : 0.06, 0.1, 0);
      wheelGroup.add(caliper);

      this.carGroup.add(wheelGroup);
    });
  }

  setupHotspots() {
    this.hotspotData = [
      {
        id: "engine",
        title: "Engine & Diagnostics",
        desc: "Oil change, fluid inspection, and engine performance check.",
        price: "₹1,200",
        serviceName: "Engine Oil Change",
        position: new THREE.Vector3(0, 0.78, 1.45)
      },
      {
        id: "battery",
        title: "Battery & Electrical",
        desc: "Jumpstart assistance, voltage check, and terminal service.",
        price: "₹500",
        serviceName: "Battery Jumpstart",
        position: new THREE.Vector3(-0.6, 0.78, 1.25)
      },
      {
        id: "brakes",
        title: "Braking System",
        desc: "Brake pad wear inspection and hydraulic line calibration.",
        price: "₹500",
        serviceName: "Brake Check & Adjustment",
        position: new THREE.Vector3(1.12, 0.42, 1.4)
      },
      {
        id: "tires",
        title: "Tires & Alignment",
        desc: "Puncture repair, wheel balancing, and tire replacement.",
        price: "₹150",
        serviceName: "Puncture Repair",
        position: new THREE.Vector3(1.12, 0.42, -1.4)
      },
      {
        id: "cabin",
        title: "Cabin Climate & Wash",
        desc: "AC refrigerant top-up and interior deep cleaning.",
        price: "₹1,500",
        serviceName: "Interior Deep Cleaning",
        position: new THREE.Vector3(0, 1.15, 0.1)
      },
      {
        id: "body",
        title: "Paint & Detailing",
        desc: "Showroom wax polish, paint protection, and dent repair.",
        price: "₹2,500",
        serviceName: "Full Detailing Package",
        position: new THREE.Vector3(-1.1, 0.78, -0.4)
      }
    ];

    this.hotspotMeshes = [];
    const pinGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x0084ff });

    this.hotspotData.forEach((data) => {
      const group = new THREE.Group();
      group.position.copy(data.position);

      const sphere = new THREE.Mesh(pinGeo, pinMat);
      group.add(sphere);

      // Subtle pulse ring
      const ringGeo = new THREE.RingGeometry(0.1, 0.13, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0084ff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
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
        <p class="hotspot-desc" id="hotspotDesc">Service details</p>
        <button type="button" class="hotspot-book-action" id="hotspotBookBtn">Book Service</button>
      `;
      this.container.appendChild(tooltip);

      const bookBtn = tooltip.querySelector("#hotspotBookBtn");
      bookBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.activeHotspotData) {
          if (typeof window.bookPricedService === "function") {
            const priceNum = parseInt(this.activeHotspotData.price.replace(/\D/g, ""), 10) || 500;
            window.bookPricedService(this.activeHotspotData.serviceName, priceNum, bookBtn);
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

    // Mouse drag rotation
    el.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Parallax norm
      this.mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNorm.y = (e.clientY / window.innerHeight) * 2 - 1;

      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.targetSpherical.theta -= deltaX * 0.007;
        this.targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.007));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Zoom on wheel
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetSpherical.radius = Math.max(5.2, Math.min(8.8, this.targetSpherical.radius + e.deltaY * 0.003));
    }, { passive: false });

    // Click on Hotspot
    el.addEventListener("click", () => {
      if (this.hoveredHotspot) {
        this.showHotspot(this.hoveredHotspot.parent.userData);
      }
    });

    // Responsive resize
    window.addEventListener("resize", () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  setupCameraControls() {
    const presetButtons = document.querySelectorAll(".camera-preset-btn");
    presetButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        presetButtons.forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");

        const view = e.currentTarget.dataset.view;
        if (view === "hero") {
          this.targetSpherical = { radius: 7.2, theta: 0.75, phi: 1.18 };
        } else if (view === "side") {
          this.targetSpherical = { radius: 7.0, theta: 1.57, phi: 1.35 };
        } else if (view === "front") {
          this.targetSpherical = { radius: 6.8, theta: 0.15, phi: 1.25 };
        }
      });
    });
  }

  showHotspot(data) {
    this.activeHotspotData = data;
    if (!this.tooltipEl) return;

    document.getElementById("hotspotPrice").textContent = data.price;
    document.getElementById("hotspotTitle").textContent = data.title;
    document.getElementById("hotspotDesc").textContent = data.desc;

    // Convert 3D coordinate to screen pixel coordinate
    const screenPos = data.position.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = ((screenPos.x + 1) * rect.width) / 2;
    const y = ((-screenPos.y + 1) * rect.height) / 2;

    this.tooltipEl.style.left = `${Math.max(10, Math.min(rect.width - 250, x - 120))}px`;
    this.tooltipEl.style.top = `${Math.max(10, Math.min(rect.height - 160, y - 120))}px`;
    this.tooltipEl.classList.add("visible");
  }

  updateCamera() {
    // Smooth interpolation with gentle mouse parallax
    const parallaxTheta = this.mouseNorm.x * 0.05;
    const parallaxPhi = this.mouseNorm.y * 0.03;

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.06;
    this.spherical.theta += (this.targetSpherical.theta + parallaxTheta - this.spherical.theta) * 0.06;
    this.spherical.phi += (this.targetSpherical.phi + parallaxPhi - this.spherical.phi) * 0.06;

    this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);

    this.camera.lookAt(0, 0.6, 0);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Update camera
    this.updateCamera();

    // Subtle gentle car idle breathing
    if (this.carGroup) {
      this.carGroup.position.y = Math.sin(time * 0.0015) * 0.015;
    }

    // Raycast hover check
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
      this.container.style.cursor = "default";
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Clean Background Ambient Particle Depth
 */
function initBackground3DParticles(canvasId = "ambientParticleCanvas") {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 400;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const particleCount = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    color: 0x0084ff,
    transparent: true,
    opacity: 0.35
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.02;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.02;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.0003;
    camera.position.x += (mouseX - camera.position.x) * 0.02;
    camera.position.y += (-mouseY - camera.position.y) * 0.02;
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
