/**
 * AutoBuddy Photorealistic 3D Automotive Studio
 * Production-grade WebGL rendering with GLTF luxury vehicle, physical clearcoat,
 * HDR studio environment, dynamic paint finishes, and cinematic camera physics.
 */

class VehicleStudio3D {
  constructor(containerId = "hero3DViewport") {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.carGroup = null;
    this.carModel = null;
    this.paintMaterials = [];
    this.hotspotMeshes = [];
    this.hoveredHotspot = null;
    this.activeHotspotData = null;
    this.animationId = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.innerWidth < 768;

    // Interaction physics
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseNorm = { x: 0, y: 0 };
    this.spherical = { radius: 6.8, theta: 0.85, phi: 1.25 };
    this.targetSpherical = { radius: 6.8, theta: 0.85, phi: 1.25 };

    this.currentColor = 0x091424; // Deep Obsidian Sapphire

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
    const height = this.container.clientHeight || 420;

    // Scene
    this.scene = new THREE.Scene();

    // Cinematic Camera (34 deg FOV for authentic automotive proportions)
    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    this.updateCamera();

    // High-performance WebGL Renderer
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
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Studio Environment & Lighting
    this.envMap = this.createStudioHDRMap();
    this.scene.environment = this.envMap;

    this.setupStudioLighting();
    this.setupStudioFloor();
    this.loadRealisticVehicleModel();
    this.setupHotspots();
    this.setupEventListeners();
    this.setupCameraControls();
    this.setupColorSwatches();

    this.animate = this.animate.bind(this);
    this.animationId = requestAnimationFrame(this.animate);
  }

  createStudioHDRMap() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Studio horizon gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#23334d");
    grad.addColorStop(0.35, "#0f172a");
    grad.addColorStop(0.5, "#080c14");
    grad.addColorStop(0.65, "#0d1525");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Overhead studio softbox highlight strip
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.fillRect(size * 0.15, size * 0.04, size * 0.7, size * 0.14);

    // Left cool rim glow
    const leftGlow = ctx.createLinearGradient(0, size * 0.35, size * 0.35, size * 0.35);
    leftGlow.addColorStop(0, "rgba(0, 140, 255, 0.5)");
    leftGlow.addColorStop(1, "rgba(0, 140, 255, 0)");
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, size * 0.25, size * 0.35, size * 0.35);

    // Right warm fill glow
    const rightGlow = ctx.createLinearGradient(size, size * 0.35, size * 0.65, size * 0.35);
    rightGlow.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    rightGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rightGlow;
    ctx.fillRect(size * 0.65, size * 0.25, size * 0.35, size * 0.35);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  setupStudioLighting() {
    // Ambient fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    // Hemisphere natural sky/ground
    const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x090d16, 0.95);
    this.scene.add(hemi);

    // Studio Key Light (Overhead 45deg softbox)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 2.5;
    this.scene.add(keyLight);

    // Studio Rim Highlight (Crisp cool cyan/white edge)
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.4);
    rimLight.position.set(-8, 6.5, -7);
    this.scene.add(rimLight);

    // Front Grille & Headlight Glow Fill
    const frontFill = new THREE.DirectionalLight(0xffffff, 0.8);
    frontFill.position.set(0, 2.5, 9);
    this.scene.add(frontFill);

    // Ground Floor Bounce
    const floorBounce = new THREE.PointLight(0x0084ff, 0.55, 16);
    floorBounce.position.set(0, 0.1, 0);
    this.scene.add(floorBounce);
  }

  setupStudioFloor() {
    // Floor contact shadow plane
    const shadowGeo = new THREE.PlaneGeometry(6.2, 3.8);
    let shadowMat;

    const textureLoader = new THREE.TextureLoader();
    const aoTex = textureLoader.load("assets/models/car_ao.png", undefined, undefined, () => {
      // Fallback procedural shadow if texture loading fails
    });

    if (aoTex) {
      shadowMat = new THREE.MeshBasicMaterial({
        map: aoTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false
      });
    } else {
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 512;
      shadowCanvas.height = 512;
      const ctx = shadowCanvas.getContext("2d");
      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.88)");
      grad.addColorStop(0.5, "rgba(0, 0, 0, 0.35)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false
      });
    }

    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.008;
    this.scene.add(contactShadow);

    // Studio stage perimeter ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.95, 2.98, 90),
      new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    this.scene.add(ring);
  }

  loadRealisticVehicleModel() {
    this.carGroup = new THREE.Group();
    this.scene.add(this.carGroup);

    // High-End Physical Materials
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: this.currentColor,
      metalness: 0.95,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0,
      envMap: this.envMap,
      envMapIntensity: 1.45
    });
    this.paintMaterials.push(bodyPaintMat);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x08101a,
      metalness: 0.08,
      roughness: 0.02,
      transmission: 0.94,
      transparent: true,
      opacity: 0.85,
      ior: 1.54,
      envMap: this.envMap,
      envMapIntensity: 1.3
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.05,
      envMap: this.envMap,
      envMapIntensity: 1.5
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x06090e,
      roughness: 0.55,
      metalness: 0.35,
      envMap: this.envMap,
      envMapIntensity: 0.5
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x161a22,
      roughness: 0.92,
      metalness: 0.05
    });

    const brakeCaliperMat = new THREE.MeshStandardMaterial({
      color: 0x0084ff,
      metalness: 0.85,
      roughness: 0.2,
      envMap: this.envMap,
      envMapIntensity: 0.8
    });

    // Check for Three.js GLTFLoader
    if (typeof THREE.GLTFLoader !== "undefined") {
      const loader = new THREE.GLTFLoader();

      if (typeof THREE.DRACOLoader !== "undefined") {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/");
        loader.setDRACOLoader(dracoLoader);
      }

      loader.load(
        "assets/models/car.glb",
        (gltf) => {
          this.carModel = gltf.scene;

          this.carModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              const name = (child.name || "").toLowerCase();

              if (name.includes("body") || name.includes("paint") || name.includes("hood") || name.includes("door")) {
                child.material = bodyPaintMat;
              } else if (name.includes("glass") || name.includes("window") || name.includes("windshield")) {
                child.material = glassMat;
              } else if (name.includes("rim") || name.includes("wheel") || name.includes("chrome") || name.includes("mirror")) {
                child.material = chromeMat;
              } else if (name.includes("tire") || name.includes("rubber")) {
                child.material = tireMat;
              } else if (name.includes("brake") || name.includes("caliper")) {
                child.material = brakeCaliperMat;
              } else if (name.includes("carbon") || name.includes("trim") || name.includes("grill")) {
                child.material = carbonMat;
              } else {
                if (child.material) {
                  child.material.envMap = this.envMap;
                  child.material.envMapIntensity = 1.0;
                }
              }
            }
          });

          // Center and scale model
          const box = new THREE.Box3().setFromObject(this.carModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Scale to ~4.6m realistic length
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4.6 / maxDim;
          this.carModel.scale.setScalar(scale);

          this.carModel.position.x = -center.x * scale;
          this.carModel.position.y = -box.min.y * scale;
          this.carModel.position.z = -center.z * scale;

          this.carGroup.add(this.carModel);
        },
        undefined,
        (err) => {
          console.warn("GLTF car loading fallback:", err);
          this.buildProceduralLuxuryVehicle(bodyPaintMat, glassMat, chromeMat, carbonMat, tireMat, brakeCaliperMat);
        }
      );
    } else {
      this.buildProceduralLuxuryVehicle(bodyPaintMat, glassMat, chromeMat, carbonMat, tireMat, brakeCaliperMat);
    }
  }

  buildProceduralLuxuryVehicle(bodyPaint, glassCanopy, polishedChrome, carbonFiber, tireRubber, cobaltBrake) {
    const drilledDisc = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.25, envMap: this.envMap, envMapIntensity: 0.7 });
    const ledHeadlight = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const ledTaillight = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const interiorSeatMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });

    const createMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      this.carGroup.add(m);
      return m;
    };

    // Lower Aerodynamic Floor Pan & Base
    createMesh(new THREE.BoxGeometry(2.02, 0.22, 4.5), carbonFiber, 0, 0.36, 0);
    createMesh(new THREE.BoxGeometry(2.08, 0.36, 4.45), bodyPaint, 0, 0.52, 0);
    createMesh(new THREE.BoxGeometry(1.98, 0.16, 4.2), bodyPaint, 0, 0.72, 0.02);

    // Front Hood with creased power bulge
    createMesh(new THREE.BoxGeometry(1.86, 0.16, 1.45), bodyPaint, 0, 0.76, 1.38, 0.07, 0, 0);
    createMesh(new THREE.BoxGeometry(0.5, 0.04, 1.35), bodyPaint, 0, 0.84, 1.38, 0.07, 0, 0);

    // Front Bumper / Intakes / Splitter
    createMesh(new THREE.BoxGeometry(2.02, 0.26, 0.45), bodyPaint, 0, 0.54, 2.12);
    createMesh(new THREE.BoxGeometry(1.76, 0.18, 0.14), carbonFiber, 0, 0.44, 2.33);
    createMesh(new THREE.BoxGeometry(2.06, 0.04, 0.45), carbonFiber, 0, 0.26, 2.22);

    // Glass Canopy & Cockpit
    createMesh(new THREE.BoxGeometry(1.68, 0.58, 2.38), glassCanopy, 0, 0.98, -0.12);
    createMesh(new THREE.BoxGeometry(1.58, 0.05, 1.98), bodyPaint, 0, 1.27, -0.16);

    // Interior Sport Seats
    [-0.38, 0.38].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.44, 0.15, 0.48), interiorSeatMat, x, 0.72, -0.05);
      createMesh(new THREE.BoxGeometry(0.42, 0.44, 0.12), interiorSeatMat, x, 0.94, -0.28, -0.2, 0, 0);
      createMesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), interiorSeatMat, x, 1.18, -0.32);
    });

    // Rear Deck, Lip Spoiler & Carbon Diffuser
    createMesh(new THREE.BoxGeometry(1.88, 0.22, 0.95), bodyPaint, 0, 0.72, -1.95, -0.1, 0, 0);
    createMesh(new THREE.BoxGeometry(1.78, 0.04, 0.18), carbonFiber, 0, 0.84, -2.34, 0.25, 0, 0);
    createMesh(new THREE.BoxGeometry(1.86, 0.16, 0.35), carbonFiber, 0, 0.36, -2.18);

    // Quad Exhaust Tips
    [-0.68, -0.54, 0.54, 0.68].forEach((x) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 16), polishedChrome);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.32, -2.32);
      this.carGroup.add(tip);
    });

    // Lighting
    [-0.74, 0.74].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), ledHeadlight, x, 0.7, 2.23);
    });
    createMesh(new THREE.BoxGeometry(1.94, 0.04, 0.05), ledTaillight, 0, 0.75, -2.26);

    // Side Mirrors
    [[-1.02, 0.94, 0.52], [1.02, 0.94, 0.52]].forEach(([x, y, z]) => {
      createMesh(new THREE.BoxGeometry(0.12, 0.06, 0.18), bodyPaint, x, y, z);
    });

    // 20-inch Forged Alloy Wheels
    const wheelPositions = [
      { x: -1.06, z: 1.42 },
      { x: 1.06, z: 1.42 },
      { x: -1.06, z: -1.42 },
      { x: 1.06, z: -1.42 }
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Group();
      wheel.position.set(pos.x, 0.36, pos.z);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 16, 36), tireRubber);
      tire.rotation.y = Math.PI / 2;
      wheel.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.22, 28), polishedChrome);
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);

      for (let s = 0; s < 10; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.045), polishedChrome);
        spoke.rotation.z = (s / 10) * Math.PI * 2;
        spoke.position.y = 0.01;
        wheel.add(spoke);
      }

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 16), cobaltBrake);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 24), drilledDisc);
      rotor.rotation.z = Math.PI / 2;
      rotor.position.x = pos.x > 0 ? -0.06 : 0.06;
      wheel.add(rotor);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.1), cobaltBrake);
      caliper.position.set(pos.x > 0 ? -0.07 : 0.07, 0.08, 0);
      wheel.add(caliper);

      this.carGroup.add(wheel);
    });
  }

  setPaintColor(hexColor) {
    this.currentColor = hexColor;
    this.paintMaterials.forEach((mat) => {
      mat.color.setHex(hexColor);
    });
  }

  setupHotspots() {
    this.hotspotData = [
      { id: "engine", title: "Engine & Diagnostics", desc: "Synthetic oil, filters & comprehensive health diagnostics.", price: "₹1,200", serviceName: "Engine Oil Change", position: new THREE.Vector3(0, 0.84, 1.45) },
      { id: "battery", title: "Battery & Electrical", desc: "Heavy-duty jumpstart, load analysis & terminal cleaning.", price: "₹500", serviceName: "Battery Jumpstart", position: new THREE.Vector3(-0.65, 0.84, 1.25) },
      { id: "brakes", title: "Braking System", desc: "Ceramic pad wear inspection & hydraulic calibration.", price: "₹500", serviceName: "Brake Check & Adjustment", position: new THREE.Vector3(1.15, 0.42, 1.42) },
      { id: "tires", title: "Tires & Alignment", desc: "Tubeless puncture repair, balancing & wheel alignment.", price: "₹150", serviceName: "Puncture Repair", position: new THREE.Vector3(1.15, 0.42, -1.42) },
      { id: "cabin", title: "Cabin Climate & Wash", desc: "AC gas recharge & antibacterial deep steam cleaning.", price: "₹1,500", serviceName: "Interior Deep Cleaning", position: new THREE.Vector3(0, 1.2, 0.1) },
      { id: "body", title: "Paint & Detailing", desc: "Hydrophobic wax polish, ceramic shield & dent repair.", price: "₹2,500", serviceName: "Full Detailing Package", position: new THREE.Vector3(-1.14, 0.8, -0.4) }
    ];

    this.hotspotMeshes = [];
    const pinGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x0084ff });

    this.hotspotData.forEach((data) => {
      const group = new THREE.Group();
      group.position.copy(data.position);

      const sphere = new THREE.Mesh(pinGeo, pinMat);
      group.add(sphere);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.09, 0.11, 24),
        new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
      );
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
          <span class="hotspot-tag">AutoBuddy Service</span>
          <span class="hotspot-price" id="hotspotPrice">₹0</span>
        </div>
        <strong class="hotspot-title" id="hotspotTitle">Component</strong>
        <p class="hotspot-desc" id="hotspotDesc">Service details</p>
        <button type="button" class="hotspot-book-action" id="hotspotBookBtn">Book Service</button>
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
        this.targetSpherical.phi = Math.max(0.35, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.007));
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
      this.targetSpherical.radius = Math.max(5.0, Math.min(8.6, this.targetSpherical.radius + e.deltaY * 0.003));
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
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  setupCameraControls() {
    document.querySelectorAll(".camera-preset-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".camera-preset-btn").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const view = e.currentTarget.dataset.view;
        const presets = {
          hero: { radius: 6.8, theta: 0.85, phi: 1.25 },
          side: { radius: 6.6, theta: 1.57, phi: 1.35 },
          front: { radius: 6.4, theta: 0.15, phi: 1.22 }
        };
        if (presets[view]) this.targetSpherical = { ...presets[view] };
      });
    });
  }

  setupColorSwatches() {
    document.querySelectorAll(".paint-swatch-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".paint-swatch-btn").forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const hex = parseInt(e.currentTarget.dataset.color, 16);
        if (!isNaN(hex)) {
          this.setPaintColor(hex);
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
    this.updateTooltipPosition();
    this.tooltipEl.classList.add("visible");
  }

  updateTooltipPosition() {
    if (!this.tooltipEl || !this.activeHotspotData || !this.camera) return;

    const screenPos = this.activeHotspotData.position.clone();
    if (this.carGroup) {
      screenPos.y += this.carGroup.position.y;
    }
    screenPos.project(this.camera);

    const rect = this.container.getBoundingClientRect();
    const x = ((screenPos.x + 1) * rect.width) / 2;
    const y = ((-screenPos.y + 1) * rect.height) / 2;

    this.tooltipEl.style.left = `${Math.max(10, Math.min(rect.width - 250, x - 120))}px`;
    this.tooltipEl.style.top = `${Math.max(10, Math.min(rect.height - 160, y - 120))}px`;
  }

  updateCamera() {
    const parallaxTheta = this.reducedMotion ? 0 : this.mouseNorm.x * 0.035;
    const parallaxPhi = this.reducedMotion ? 0 : this.mouseNorm.y * 0.02;
    const ease = this.reducedMotion ? 0.12 : 0.06;

    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * ease;
    this.spherical.theta += (this.targetSpherical.theta + parallaxTheta - this.spherical.theta) * ease;
    this.spherical.phi += (this.targetSpherical.phi + parallaxPhi - this.spherical.phi) * ease;

    this.camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.lookAt(0, 0.62, 0);
  }

  animate(time) {
    this.animationId = requestAnimationFrame(this.animate);
    this.updateCamera();

    if (this.carGroup && !this.reducedMotion) {
      this.carGroup.position.y = Math.sin(time * 0.0012) * 0.012;
    }

    if (this.tooltipEl && this.tooltipEl.classList.contains("visible") && this.activeHotspotData) {
      this.updateTooltipPosition();
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
