/**
 * AutoBuddy 3D WebGL Vehicle Studio & Ambient Particle Constellation
 * Built with Three.js (r128) - High-performance, interactive, and responsive.
 */

class VehicleStudio3D {
  constructor(containerId = "hero3DViewport") {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.carGroup = null;
    this.hotspots = [];
    this.materials = {};
    this.wireframeMode = false;
    this.headlightsOn = true;
    this.autoRotate = true;
    this.underglowIndex = 0;
    this.underglowColors = [0x00f29d, 0xff8a00, 0x00e5ff, 0xbf5af2, 0xff3b30];
    this.underglowNames = ["Cyber Emerald", "Solar Amber", "Hyper Cyan", "Plasma Violet", "Solar Red"];

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);
    this.hoveredHotspot = null;

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.spherical = { radius: 6.8, theta: Math.PI / 4, phi: Math.PI / 3 };
    this.targetSpherical = { radius: 6.8, theta: Math.PI / 4, phi: Math.PI / 3 };

    this.init();
  }

  init() {
    if (typeof THREE === "undefined") {
      console.warn("Three.js not found, loading fallback or waiting...");
      return;
    }

    const width = this.container.clientWidth || 540;
    const height = this.container.clientHeight || 380;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.updateCameraPosition();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Setup Scene Elements
    this.setupLighting();
    this.setupGround();
    this.buildVehicle();
    this.setupHotspots();
    this.setupEventListeners();
    this.setupControlsUI();

    // Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Ambient Light
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.7);
    this.scene.add(ambient);

    // Key Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Cool Rim Light
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.9);
    rimLight.position.set(-8, 6, -8);
    this.scene.add(rimLight);

    // Underglow Light
    this.underglowLight = new THREE.PointLight(this.underglowColors[0], 2.8, 4.5);
    this.underglowLight.position.set(0, 0.2, 0);
    this.scene.add(this.underglowLight);

    // Headlight Spotlights
    this.headlightL = new THREE.SpotLight(0xffffff, 3.5, 12, Math.PI / 6, 0.4, 1);
    this.headlightL.position.set(-0.7, 0.7, 2.2);
    this.headlightL.target.position.set(-0.7, 0, 7);
    this.scene.add(this.headlightL);
    this.scene.add(this.headlightL.target);

    this.headlightR = new THREE.SpotLight(0xffffff, 3.5, 12, Math.PI / 6, 0.4, 1);
    this.headlightR.position.set(0.7, 0.7, 2.2);
    this.headlightR.target.position.set(0.7, 0, 7);
    this.scene.add(this.headlightR);
    this.scene.add(this.headlightR.target);
  }

  setupGround() {
    // Ground plane with cyber radar target
    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050b14,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Cyber concentric rings
    const ringGroup = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f29d, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    [1.8, 2.6, 3.4].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.02, radius, 48);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005;
      ringGroup.add(ring);
    });
    this.scene.add(ringGroup);
    this.groundRings = ringGroup;
  }

  buildVehicle() {
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    // Shared Materials
    this.materials.body = new THREE.MeshStandardMaterial({
      color: 0x162238,
      metalness: 0.85,
      roughness: 0.22,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1
    });

    this.materials.bodyAccent = new THREE.MeshStandardMaterial({
      color: 0xff8a00,
      metalness: 0.7,
      roughness: 0.3
    });

    this.materials.glass = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.65,
      ior: 1.5
    });

    this.materials.carbon = new THREE.MeshStandardMaterial({
      color: 0x0a0f18,
      roughness: 0.7,
      metalness: 0.4
    });

    this.materials.chrome = new THREE.MeshStandardMaterial({
      color: 0xeef5ff,
      metalness: 0.95,
      roughness: 0.1
    });

    this.materials.tire = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.9,
      metalness: 0.1
    });

    this.materials.headlight = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    this.materials.taillight = new THREE.MeshBasicMaterial({
      color: 0xff2a4b
    });

    this.materials.wireframe = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.45, 4.2);
    this.chassisMesh = new THREE.Mesh(chassisGeo, this.materials.body);
    this.chassisMesh.position.y = 0.52;
    this.chassisMesh.castShadow = true;
    this.chassisMesh.receiveShadow = true;
    this.carGroup.add(this.chassisMesh);

    // 2. Cabin / Greenhouse
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.68, 2.6);
    this.cabinMesh = new THREE.Mesh(cabinGeo, this.materials.glass);
    this.cabinMesh.position.set(0, 1.05, -0.15);
    this.cabinMesh.castShadow = true;
    this.carGroup.add(this.cabinMesh);

    // Cabin Roof
    const roofGeo = new THREE.BoxGeometry(1.72, 0.08, 2.3);
    const roofMesh = new THREE.Mesh(roofGeo, this.materials.body);
    roofMesh.position.set(0, 1.42, -0.15);
    this.carGroup.add(roofMesh);

    // Roof emergency light bar
    const lightBarGeo = new THREE.BoxGeometry(0.8, 0.08, 0.22);
    this.lightBarMat = new THREE.MeshBasicMaterial({ color: 0xff8a00 });
    const lightBar = new THREE.Mesh(lightBarGeo, this.lightBarMat);
    lightBar.position.set(0, 1.5, -0.1);
    this.carGroup.add(lightBar);

    // 3. Front Hood Slope
    const hoodGeo = new THREE.BoxGeometry(1.9, 0.28, 1.2);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.materials.body);
    hoodMesh.position.set(0, 0.76, 1.4);
    hoodMesh.rotation.x = 0.08;
    this.carGroup.add(hoodMesh);

    // Front Bumper / Aero Splitter
    const bumperGeo = new THREE.BoxGeometry(2.15, 0.24, 0.4);
    const bumperMesh = new THREE.Mesh(bumperGeo, this.materials.carbon);
    bumperMesh.position.set(0, 0.32, 2.12);
    this.carGroup.add(bumperMesh);

    // Front Neon Accent Strip
    const stripGeo = new THREE.BoxGeometry(1.8, 0.04, 0.06);
    const stripMesh = new THREE.Mesh(stripGeo, this.materials.bodyAccent);
    stripMesh.position.set(0, 0.65, 2.13);
    this.carGroup.add(stripMesh);

    // 4. Headlights
    [-0.78, 0.78].forEach((x) => {
      const hlGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
      const hlMesh = new THREE.Mesh(hlGeo, this.materials.headlight);
      hlMesh.position.set(x, 0.72, 2.1);
      this.carGroup.add(hlMesh);
    });

    // 5. Taillights (Connected Cyber Lightbar)
    const tlGeo = new THREE.BoxGeometry(1.95, 0.1, 0.08);
    const tlMesh = new THREE.Mesh(tlGeo, this.materials.taillight);
    tlMesh.position.set(0, 0.78, -2.12);
    this.carGroup.add(tlMesh);

    // 6. Wheels (4 alloy wheels)
    const wheelPositions = [
      { x: -1.06, y: 0.38, z: 1.35 }, // Front Left
      { x: 1.06, y: 0.38, z: 1.35 },  // Front Right
      { x: -1.06, y: 0.38, z: -1.35 },// Rear Left
      { x: 1.06, y: 0.38, z: -1.35 }  // Rear Right
    ];

    this.wheels = [];
    wheelPositions.forEach((pos, idx) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      // Tire rubber
      const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 24);
      const tireMesh = new THREE.Mesh(tireGeo, this.materials.tire);
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = true;
      wheelGroup.add(tireMesh);

      // Rim alloy
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.29, 16);
      const rimMesh = new THREE.Mesh(rimGeo, this.materials.chrome);
      rimMesh.rotation.z = Math.PI / 2;
      wheelGroup.add(rimMesh);

      // Neon brake caliper
      const caliperGeo = new THREE.BoxGeometry(0.1, 0.16, 0.12);
      const caliperMesh = new THREE.Mesh(caliperGeo, this.materials.bodyAccent);
      caliperMesh.position.set(pos.x > 0 ? -0.06 : 0.06, 0.12, 0);
      wheelGroup.add(caliperMesh);

      this.carGroup.add(wheelGroup);
      this.wheels.push(wheelGroup);
    });

    // Side Decal Lines
    [-1.06, 1.06].forEach((x) => {
      const lineGeo = new THREE.BoxGeometry(0.02, 0.06, 2.8);
      const lineMesh = new THREE.Mesh(lineGeo, this.materials.bodyAccent);
      lineMesh.position.set(x, 0.58, 0);
      this.carGroup.add(lineMesh);
    });
  }

  setupHotspots() {
    this.hotspotData = [
      {
        id: "engine",
        title: "Engine Bay",
        service: "Engine Oil Change & Diagnosis",
        price: "₹1200",
        position: new THREE.Vector3(0, 0.85, 1.5),
        status: "Diagnostic Ready",
        color: 0x00f29d
      },
      {
        id: "battery",
        title: "Battery & Electricals",
        service: "Battery Check & Jumpstart",
        price: "₹500",
        position: new THREE.Vector3(-0.65, 0.85, 1.3),
        status: "12.6V Optimal",
        color: 0x00e5ff
      },
      {
        id: "front-wheel",
        title: "Brake & Suspension",
        service: "Brake Check & Adjustment",
        price: "₹500",
        position: new THREE.Vector3(1.18, 0.45, 1.35),
        status: "Brake Pads 85%",
        color: 0xff8a00
      },
      {
        id: "rear-wheel",
        title: "Tire & Wheel System",
        service: "Puncture Repair & Tire Change",
        price: "₹150",
        position: new THREE.Vector3(1.18, 0.45, -1.35),
        status: "32 PSI Balanced",
        color: 0x00f29d
      },
      {
        id: "cabin",
        title: "Cabin Climate & Wash",
        service: "Interior Deep Clean & AC Top-up",
        price: "₹1500",
        position: new THREE.Vector3(0, 1.25, 0),
        status: "Cabin Filter Fresh",
        color: 0x00e5ff
      },
      {
        id: "body",
        title: "Paint & Detailing",
        service: "Full Detailing & Wax Polishing",
        price: "₹2500",
        position: new THREE.Vector3(-1.15, 0.85, -0.4),
        status: "Ceramic Glaze",
        color: 0xff8a00
      },
      {
        id: "emergency",
        title: "Emergency Roadside SOS",
        service: "Breakdown Assistance (Van Dispatch)",
        price: "₹1000",
        position: new THREE.Vector3(0, 1.62, -0.1),
        status: "Priority Dispatch",
        color: 0xff3b30
      }
    ];

    this.hotspotsGroup = new THREE.Group();
    this.scene.add(this.hotspotsGroup);

    this.hotspotMeshes = [];

    this.hotspotData.forEach((data) => {
      const group = new THREE.Group();
      group.position.copy(data.position);

      // Core sphere
      const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: data.color });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      group.add(sphere);

      // Outer pulsing ring
      const ringGeo = new THREE.RingGeometry(0.14, 0.18, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: data.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.userData = data;
      this.hotspotsGroup.add(group);
      this.hotspotMeshes.push(sphere); // for raycasting
    });

    // Create 3D Tooltip Overlay Element
    this.createTooltipElement();
  }

  createTooltipElement() {
    let tooltip = document.getElementById("hotspot3DTooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.id = "hotspot3DTooltip";
      tooltip.className = "hotspot-3d-tooltip";
      tooltip.innerHTML = `
        <div class="hotspot-header">
          <span class="hotspot-badge" id="hotspotBadge">Component</span>
          <span class="hotspot-price" id="hotspotPrice">₹0</span>
        </div>
        <strong id="hotspotTitle" class="hotspot-title">Engine Bay</strong>
        <p id="hotspotService" class="hotspot-service">Service details</p>
        <button type="button" class="hotspot-book-btn" id="hotspotBookBtn">Instant Book</button>
      `;
      this.container.appendChild(tooltip);

      const bookBtn = tooltip.querySelector("#hotspotBookBtn");
      bookBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.activeHotspotData) {
          if (typeof window.bookPricedService === "function") {
            const price = parseInt(this.activeHotspotData.price.replace(/\D/g, ""), 10) || 500;
            window.bookPricedService(this.activeHotspotData.service, price, bookBtn);
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
      this.autoRotate = false;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.targetSpherical.theta -= deltaX * 0.008;
        this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.008));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    // Touch support for mobile
    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (this.isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

        this.targetSpherical.theta -= deltaX * 0.008;
        this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.008));

        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
    });

    // Zoom on wheel
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetSpherical.radius = Math.max(4.5, Math.min(9.5, this.targetSpherical.radius + e.deltaY * 0.004));
    }, { passive: false });

    // Click on Hotspot
    el.addEventListener("click", () => {
      if (this.hoveredHotspot) {
        this.showHotspotDetails(this.hoveredHotspot.parent.userData);
        if (window.soundFx) window.soundFx.playClick();
      }
    });

    // Resize
    window.addEventListener("resize", () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  setupControlsUI() {
    const controlsContainer = document.getElementById("hero3DControls");
    if (!controlsContainer) return;

    controlsContainer.innerHTML = `
      <div class="hud-controls-bar">
        <button type="button" class="hud-control-btn" id="btn3DWireframe" title="Hologram Scan Mode">
          <span class="hud-icon">⚡</span>
          <span>Scan Wireframe</span>
        </button>
        <button type="button" class="hud-control-btn" id="btn3DHeadlights" title="Toggle Headlight Beams">
          <span class="hud-icon">💡</span>
          <span>Headlights</span>
        </button>
        <button type="button" class="hud-control-btn" id="btn3DUnderglow" title="Cycle Underglow Neon">
          <span class="hud-icon">🎨</span>
          <span id="underglowLabel">Neon: Cyber Emerald</span>
        </button>
        <button type="button" class="hud-control-btn active" id="btn3DOrbit" title="Toggle 360° Cruise">
          <span class="hud-icon">🔄</span>
          <span>360° Cruise</span>
        </button>
        <button type="button" class="hud-control-btn" id="btn3DReset" title="Reset Camera View">
          <span class="hud-icon">🎯</span>
          <span>Reset</span>
        </button>
      </div>
    `;

    document.getElementById("btn3DWireframe")?.addEventListener("click", () => {
      this.toggleWireframe();
      if (window.soundFx) window.soundFx.playScan();
    });

    document.getElementById("btn3DHeadlights")?.addEventListener("click", () => {
      this.toggleHeadlights();
      if (window.soundFx) window.soundFx.playClick();
    });

    document.getElementById("btn3DUnderglow")?.addEventListener("click", () => {
      this.cycleUnderglow();
      if (window.soundFx) window.soundFx.playClick();
    });

    document.getElementById("btn3DOrbit")?.addEventListener("click", (e) => {
      this.autoRotate = !this.autoRotate;
      e.currentTarget.classList.toggle("active", this.autoRotate);
      if (window.soundFx) window.soundFx.playClick();
    });

    document.getElementById("btn3DReset")?.addEventListener("click", () => {
      this.resetCamera();
      if (window.soundFx) window.soundFx.playClick();
    });
  }

  toggleWireframe() {
    this.wireframeMode = !this.wireframeMode;
    const btn = document.getElementById("btn3DWireframe");
    if (btn) btn.classList.toggle("active", this.wireframeMode);

    this.carGroup.traverse((child) => {
      if (child.isMesh && child !== this.groundRings) {
        if (this.wireframeMode) {
          child.userData.origMaterial = child.material;
          child.material = this.materials.wireframe;
        } else if (child.userData.origMaterial) {
          child.material = child.userData.origMaterial;
        }
      }
    });
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    const btn = document.getElementById("btn3DHeadlights");
    if (btn) btn.classList.toggle("active", this.headlightsOn);

    this.headlightL.intensity = this.headlightsOn ? 3.5 : 0;
    this.headlightR.intensity = this.headlightsOn ? 3.5 : 0;
    this.materials.headlight.color.setHex(this.headlightsOn ? 0xffffff : 0x334155);
  }

  cycleUnderglow() {
    this.underglowIndex = (this.underglowIndex + 1) % this.underglowColors.length;
    const color = this.underglowColors[this.underglowIndex];
    const name = this.underglowNames[this.underglowIndex];

    this.underglowLight.color.setHex(color);
    const label = document.getElementById("underglowLabel");
    if (label) label.textContent = `Neon: ${name}`;
  }

  resetCamera() {
    this.targetSpherical = { radius: 6.8, theta: Math.PI / 4, phi: Math.PI / 3 };
    this.autoRotate = true;
    const orbitBtn = document.getElementById("btn3DOrbit");
    if (orbitBtn) orbitBtn.classList.add("active");
  }

  showHotspotDetails(data) {
    this.activeHotspotData = data;
    if (!this.tooltipEl) return;

    document.getElementById("hotspotBadge").textContent = data.status;
    document.getElementById("hotspotPrice").textContent = data.price;
    document.getElementById("hotspotTitle").textContent = data.title;
    document.getElementById("hotspotService").textContent = data.service;

    // Convert 3D world pos to screen pos
    const screenPos = data.position.clone().project(this.camera);
    const rect = this.container.getBoundingClientRect();
    const x = ((screenPos.x + 1) * rect.width) / 2;
    const y = ((-screenPos.y + 1) * rect.height) / 2;

    this.tooltipEl.style.left = `${Math.max(10, Math.min(rect.width - 240, x - 110))}px`;
    this.tooltipEl.style.top = `${Math.max(10, Math.min(rect.height - 150, y - 110))}px`;
    this.tooltipEl.classList.add("visible");
  }

  updateCameraPosition() {
    // Smooth spherical interpolation
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.08;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.08;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.08;

    this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);

    this.camera.lookAt(0, 0.65, 0);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    // Auto rotate turntable
    if (this.autoRotate) {
      this.targetSpherical.theta += 0.005;
    }

    // Update camera
    this.updateCameraPosition();

    // Pulse rooftop emergency light bar
    if (this.lightBarMat) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
      this.lightBarMat.color.setRGB(1, 0.4 + 0.5 * pulse, 0.1);
    }

    // Pulse Hotspot Rings
    if (this.hotspotsGroup) {
      this.hotspotsGroup.children.forEach((group) => {
        const ring = group.children[1];
        if (ring) {
          const s = 1 + 0.25 * Math.sin(time * 0.005 + group.position.x);
          ring.scale.set(s, s, s);
        }
      });
    }

    // Raycasting for hotspot hover
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspotMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (this.hoveredHotspot !== hit) {
        this.hoveredHotspot = hit;
        document.body.style.cursor = "pointer";
        this.showHotspotDetails(hit.parent.userData);
        if (window.soundFx) window.soundFx.playHover();
      }
    } else if (this.hoveredHotspot && !this.isDragging) {
      this.hoveredHotspot = null;
      document.body.style.cursor = "default";
    }

    // Ground ring subtle rotation
    if (this.groundRings) {
      this.groundRings.rotation.z += 0.002;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * Ambient 3D Particle Constellation Engine for All Pages
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

  // Create Star Particles
  const particleCount = 450;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const color1 = new THREE.Color(0x00f29d);
  const color2 = new THREE.Color(0x00e5ff);
  const color3 = new THREE.Color(0xff8a00);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1200;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1200;

    const chosenColor = Math.random() > 0.6 ? color1 : Math.random() > 0.3 ? color2 : color3;
    colors[i * 3] = chosenColor.r;
    colors[i * 3 + 1] = chosenColor.g;
    colors[i * 3 + 2] = chosenColor.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.0008;
    particles.rotation.x += 0.0004;

    camera.position.x += (mouseX - camera.position.x) * 0.03;
    camera.position.y += (-mouseY - camera.position.y) * 0.03;
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
