/**
 * AutoBuddy Photorealistic 3D Automotive Studio
 * High-fidelity WebGL automotive configurator with luxury sport sedan (Audi fastback style)
 * and TVS Apache RTR style sport bike, physical clearcoat PBR materials,
 * HDR studio environment lighting, dynamic paint finishes, and interactive component service hotspots.
 */

class VehicleStudio3D {
  constructor(containerId = "hero3DViewport") {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.vehicleGroup = null;
    this.currentModel = null;
    this.paintMaterials = [];
    this.hotspotGroups = [];
    this.hotspotMeshes = [];
    this.hoveredHotspot = null;
    this.activeHotspotData = null;
    this.animationId = null;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.innerWidth < 768;

    // Interaction & Camera Orbit Physics
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.mouseNorm = { x: 0, y: 0 };
    this.spherical = { radius: 6.8, theta: 2.45, phi: 1.25 };
    this.targetSpherical = { radius: 6.8, theta: 2.45, phi: 1.25 };

    // Default Paint: Pure Glacial White Pearl (matching modern luxury sports sedan reference)
    this.currentColor = 0xf8fafc;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1000, -1000);

    this.init();
  }

  init() {
    if (typeof THREE === "undefined") {
      console.warn("Three.js library is required for VehicleStudio3D.");
      return;
    }

    const width = this.container.clientWidth || 540;
    const height = this.container.clientHeight || 400;

    // Scene
    this.scene = new THREE.Scene();

    // Perspective Camera (34 deg FOV for authentic automotive studio proportions)
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
    this.renderer.toneMappingExposure = 1.25;
    if (THREE.sRGBEncoding) {
      this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    this.container.innerHTML = "";
    this.container.appendChild(this.renderer.domElement);

    // Studio Environment & Lighting
    this.envMap = this.createStudioHDRMap();
    this.scene.environment = this.envMap;

    this.setupStudioLighting();
    this.setupStudioFloor();
    this.currentVehicleType = typeof getVehicleMode === "function" ? getVehicleMode() : "car";
    this.setupVehicle();
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

    // Studio Horizon Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#23334d");
    grad.addColorStop(0.35, "#0f172a");
    grad.addColorStop(0.5, "#080c14");
    grad.addColorStop(0.65, "#0d1525");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Softbox Overhead Light Strip
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(size * 0.15, size * 0.04, size * 0.7, size * 0.15);

    // Left Cool Rim Glow
    const leftGlow = ctx.createLinearGradient(0, size * 0.35, size * 0.35, size * 0.35);
    leftGlow.addColorStop(0, "rgba(2, 132, 199, 0.65)");
    leftGlow.addColorStop(1, "rgba(2, 132, 199, 0)");
    ctx.fillStyle = leftGlow;
    ctx.fillRect(0, size * 0.25, size * 0.35, size * 0.35);

    // Right Warm Fill Glow
    const rightGlow = ctx.createLinearGradient(size, size * 0.35, size * 0.65, size * 0.35);
    rightGlow.addColorStop(0, "rgba(249, 115, 22, 0.45)");
    rightGlow.addColorStop(1, "rgba(249, 115, 22, 0)");
    ctx.fillStyle = rightGlow;
    ctx.fillRect(size * 0.65, size * 0.25, size * 0.35, size * 0.35);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  setupStudioLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x090d16, 1.1);
    this.scene.add(hemi);

    // Studio Key Softbox Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(6, 10, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.radius = 2.0;
    this.scene.add(keyLight);

    // Cool Rim Edge Highlight
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.6);
    rimLight.position.set(-8, 6.5, -7);
    this.scene.add(rimLight);

    // Warm Accent Rim Light
    const warmRim = new THREE.DirectionalLight(0xfdba74, 0.95);
    warmRim.position.set(7, 4.5, -6);
    this.scene.add(warmRim);

    // Front Grille & Headlamp Fill
    const frontFill = new THREE.DirectionalLight(0xffffff, 1.1);
    frontFill.position.set(0, 2.5, 9);
    this.scene.add(frontFill);

    // Ground Floor Soft Bounce
    const floorBounce = new THREE.PointLight(0x0284c7, 0.65, 18);
    floorBounce.position.set(0, 0.1, 0);
    this.scene.add(floorBounce);
  }

  setupStudioFloor() {
    const shadowGeo = new THREE.PlaneGeometry(6.4, 4.0);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const ctx = shadowCanvas.getContext("2d");
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.92)");
    grad.addColorStop(0.5, "rgba(0, 0, 0, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.008;
    this.scene.add(contactShadow);

    // Studio Stage Ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.05, 3.08, 90),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    this.scene.add(ring);
  }

  setupVehicle() {
    if (this.vehicleGroup) {
      this.scene.remove(this.vehicleGroup);
      this.vehicleGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }

    this.vehicleGroup = new THREE.Group();
    this.scene.add(this.vehicleGroup);
    this.paintMaterials = [];

    const isBike = (this.currentVehicleType || "car") === "bike";

    // Toggle color changing finish swatches (hidden for Bike only, visible for Car)
    const swatches = document.getElementById("studioPaintSwatches") || document.querySelector(".studio-paint-swatches");
    if (swatches) {
      swatches.style.display = isBike ? "none" : "flex";
    }

    if (isBike) {
      this.loadMotorcycleModel();
    } else {
      this.loadCarModel();
    }

    this.setupHotspots();
  }

  setVehicleType(type) {
    const nextType = type === "bike" ? "bike" : "car";
    if (this.currentVehicleType === nextType && this.vehicleGroup && this.vehicleGroup.children.length > 0) return;

    this.currentVehicleType = nextType;
    if (this.tooltipEl) this.tooltipEl.classList.remove("visible");
    this.activeHotspotData = null;
    this.hoveredHotspot = null;

    // Toggle color changing finish swatches (hidden for Bike only, visible for Car)
    const swatches = document.getElementById("studioPaintSwatches") || document.querySelector(".studio-paint-swatches");
    if (swatches) {
      swatches.style.display = nextType === "bike" ? "none" : "flex";
    }

    this.setupVehicle();
  }

  setPaintColor(colorHex) {
    this.currentColor = colorHex;
    this.paintMaterials.forEach((mat) => {
      if (mat) {
        mat.color.setHex(colorHex);
        mat.needsUpdate = true;
      }
    });
  }

  loadCarModel() {
    this.paintMaterials = [];

    if (typeof THREE.GLTFLoader !== "undefined") {
      const loader = new THREE.GLTFLoader();

      if (typeof THREE.DRACOLoader !== "undefined") {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.3/");
        loader.setDRACOLoader(dracoLoader);
      }

      // Load the intended car GLB model file with cache-busting
      const modelUrl = "assets/models/car.glb?v=" + Date.now();

      loader.load(
        modelUrl,
        (gltf) => {
          if (this.currentVehicleType !== "car") return;
          this.currentModel = gltf.scene;

          // Compute exact bounding box and normalize scale
          const box = new THREE.Box3().setFromObject(this.currentModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetSize = 4.3; // Authentic automotive studio scale
          const scale = targetSize / maxDim;
          this.currentModel.scale.set(scale, scale, scale);

          // Center on floor (y = 0 sits directly on contact shadow floor)
          this.currentModel.position.x = -center.x * scale;
          this.currentModel.position.y = -box.min.y * scale;
          this.currentModel.position.z = -center.z * scale;

          this.currentModel.traverse((child) => {
            if (child.isMesh && child.material) {
              child.castShadow = true;
              child.receiveShadow = true;

              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (!mat) return;
                mat.envMap = this.envMap;
                mat.envMapIntensity = 1.45;
                mat.needsUpdate = true;

                const name = (child.name || "").toLowerCase();
                const matName = (mat.name || "").toLowerCase();

                // Dynamic paint finishes for primary bodywork
                if (
                  name.includes("body") ||
                  name.includes("paint") ||
                  name.includes("car_body") ||
                  name.includes("main") ||
                  name.includes("primary") ||
                  matName.includes("paint") ||
                  matName.includes("body") ||
                  matName.includes("main") ||
                  matName.includes("primary") ||
                  matName.includes("carbond")
                ) {
                  mat.color.setHex(this.currentColor);
                  mat.metalness = 0.85;
                  mat.roughness = 0.15;
                  if (mat.clearcoat !== undefined) {
                    mat.clearcoat = 1.0;
                    mat.clearcoatRoughness = 0.04;
                  }
                  if (!this.paintMaterials.includes(mat)) {
                    this.paintMaterials.push(mat);
                  }
                }
              });
            }
          });

          this.vehicleGroup.add(this.currentModel);
        },
        undefined,
        (err) => {
          console.warn("Could not load assets/models/car.glb, using high-detail studio car fallback:", err);
          this.buildHighDetailCarFallback();
        }
      );
    } else {
      this.buildHighDetailCarFallback();
    }
  }

  loadMotorcycleModel() {
    this.paintMaterials = [];

    if (typeof THREE.GLTFLoader !== "undefined") {
      const loader = new THREE.GLTFLoader();

      if (typeof THREE.DRACOLoader !== "undefined") {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.3/");
        loader.setDRACOLoader(dracoLoader);
      }

      // Load the intended bike GLB model file with cache-busting
      const modelUrl = "assets/models/bike.glb?v=" + Date.now();

      loader.load(
        modelUrl,
        (gltf) => {
          if (this.currentVehicleType !== "bike") return;
          this.currentModel = gltf.scene;

          // Compute exact bounding box and normalize scale
          const box = new THREE.Box3().setFromObject(this.currentModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetSize = 2.8; // Authentic motorcycle scale
          const scale = targetSize / maxDim;
          this.currentModel.scale.set(scale, scale, scale);

          // Center on floor
          this.currentModel.position.x = -center.x * scale;
          this.currentModel.position.y = -box.min.y * scale;
          this.currentModel.position.z = -center.z * scale;

          this.currentModel.traverse((child) => {
            if (child.isMesh && child.material) {
              child.castShadow = true;
              child.receiveShadow = true;

              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat) => {
                if (!mat) return;
                mat.envMap = this.envMap;
                mat.envMapIntensity = 1.45;
                mat.needsUpdate = true;
              });
            }
          });

          this.vehicleGroup.add(this.currentModel);
        },
        undefined,
        (err) => {
          console.warn("Could not load assets/models/bike.glb, using high-detail studio bike fallback:", err);
          this.buildHighDetailBikeFallback();
        }
      );
    } else {
      this.buildHighDetailBikeFallback();
    }
  }

  buildHighDetailCarFallback() {
    // Executive Luxury Sports Sedan (Audi A5/A7 Fastback Inspired)
    const bodyPaint = new THREE.MeshPhysicalMaterial({
      color: this.currentColor,
      metalness: 0.85,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.98,
      envMap: this.envMap,
      envMapIntensity: 1.6
    });
    this.paintMaterials.push(bodyPaint);

    const glossBlackGrille = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.92,
      roughness: 0.18,
      envMap: this.envMap,
      envMapIntensity: 1.2
    });

    const darkHoneycombMesh = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.7,
      roughness: 0.45
    });

    const tintedGlass = new THREE.MeshPhysicalMaterial({
      color: 0x030712,
      metalness: 0.1,
      roughness: 0.03,
      transmission: 0.9,
      opacity: 0.92,
      transparent: true,
      envMap: this.envMap,
      envMapIntensity: 1.95
    });

    const chromeTrim = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.06,
      envMap: this.envMap,
      envMapIntensity: 1.9
    });

    const carbonAero = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.4,
      roughness: 0.6
    });

    const tireRubber = new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.9
    });

    const turbineRims = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.12,
      envMap: this.envMap,
      envMapIntensity: 1.7
    });

    const redBremboCaliper = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.85,
      roughness: 0.2
    });

    const drilledDisc = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.25,
      envMap: this.envMap,
      envMapIntensity: 0.8
    });

    const matrixLed = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const drlGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tailLedBar = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const createMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      this.vehicleGroup.add(m);
      return m;
    };

    // Aerodynamic Chassis Base & Floorpan
    createMesh(new THREE.BoxGeometry(2.04, 0.2, 4.55), carbonAero, 0, 0.34, 0);

    // Sculpted Lower Body Side Skirts
    createMesh(new THREE.BoxGeometry(2.1, 0.38, 4.5), bodyPaint, 0, 0.52, 0);

    // Shoulder Line & Waist Crease
    createMesh(new THREE.BoxGeometry(2.02, 0.18, 4.35), bodyPaint, 0, 0.72, 0);

    // Sculpted Hood with Power Creases
    createMesh(new THREE.BoxGeometry(1.88, 0.14, 1.55), bodyPaint, 0, 0.76, 1.38, 0.08, 0, 0);
    createMesh(new THREE.BoxGeometry(0.55, 0.03, 1.45), bodyPaint, 0, 0.84, 1.38, 0.08, 0, 0);

    // Signature Hexagonal Singleframe Front Grille (Audi Style)
    createMesh(new THREE.BoxGeometry(1.42, 0.44, 0.12), glossBlackGrille, 0, 0.56, 2.24);
    createMesh(new THREE.BoxGeometry(1.36, 0.38, 0.14), darkHoneycombMesh, 0, 0.56, 2.25);

    // Front Bumper Lower Splitter & Outer Air Inlets
    createMesh(new THREE.BoxGeometry(2.04, 0.22, 0.42), bodyPaint, 0, 0.48, 2.14);
    createMesh(new THREE.BoxGeometry(2.08, 0.04, 0.48), carbonAero, 0, 0.26, 2.22);
    [-0.78, 0.78].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.38, 0.32, 0.16), glossBlackGrille, x, 0.52, 2.22);
    });

    // Sleek Fastback Greenhouse / Roof Arch
    createMesh(new THREE.BoxGeometry(1.68, 0.58, 2.45), tintedGlass, 0, 0.98, -0.15);
    createMesh(new THREE.BoxGeometry(1.58, 0.05, 2.05), bodyPaint, 0, 1.28, -0.18);

    // Chrome / Gloss Black Window Surrounds
    createMesh(new THREE.BoxGeometry(1.7, 0.03, 2.35), chromeTrim, 0, 1.26, -0.16);

    // Rear Fastback Deck & Integrated Ducktail Spoiler
    createMesh(new THREE.BoxGeometry(1.88, 0.24, 0.95), bodyPaint, 0, 0.72, -1.95, -0.12, 0, 0);
    createMesh(new THREE.BoxGeometry(1.82, 0.04, 0.16), carbonAero, 0, 0.85, -2.36, 0.28, 0, 0);

    // Rear Bumper & Dual Twin Exhaust Outlets
    createMesh(new THREE.BoxGeometry(1.92, 0.26, 0.38), carbonAero, 0, 0.38, -2.18);
    [-0.68, -0.54, 0.54, 0.68].forEach((x) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 16), chromeTrim);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, 0.32, -2.34);
      this.vehicleGroup.add(tip);
    });

    // Matrix LED Headlamps with DRL Eyebrows
    [-0.76, 0.76].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.42, 0.06, 0.08), matrixLed, x, 0.7, 2.25);
      createMesh(new THREE.BoxGeometry(0.42, 0.02, 0.09), drlGlow, x, 0.74, 2.25);
    });

    // Continuous Full-Width Rear LED Lightbar
    createMesh(new THREE.BoxGeometry(1.96, 0.04, 0.06), tailLedBar, 0, 0.76, -2.28);

    // Aerodynamic Side Mirrors
    [[-1.04, 0.95, 0.52], [1.04, 0.95, 0.52]].forEach(([x, y, z]) => {
      createMesh(new THREE.BoxGeometry(0.14, 0.06, 0.18), bodyPaint, x, y, z);
    });

    // 20-inch Turbine Alloy Wheels with Red Calipers
    const wheelPositions = [
      { x: -1.06, z: 1.42 },
      { x: 1.06, z: 1.42 },
      { x: -1.06, z: -1.42 },
      { x: 1.06, z: -1.42 }
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Group();
      wheel.position.set(pos.x, 0.36, pos.z);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.085, 16, 36), tireRubber);
      tire.rotation.y = Math.PI / 2;
      wheel.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.22, 28), turbineRims);
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);

      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 0.05), chromeTrim);
        spoke.rotation.z = (s / 5) * Math.PI * 2;
        spoke.position.y = 0.01;
        wheel.add(spoke);
      }

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), drilledDisc);
      rotor.rotation.z = Math.PI / 2;
      rotor.position.x = pos.x > 0 ? -0.06 : 0.06;
      wheel.add(rotor);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.11), redBremboCaliper);
      caliper.position.set(pos.x > 0 ? -0.07 : 0.07, 0.09, 0);
      wheel.add(caliper);

      this.vehicleGroup.add(wheel);
    });
  }

  buildHighDetailBikeFallback() {
    // TVS Apache RTR Naked Sportbike Style (Image 2 Reference)
    const pearlWhite = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.75,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMap: this.envMap,
      envMapIntensity: 1.5
    });
    this.paintMaterials.push(pearlWhite);

    const racingRed = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1.0
    });

    const synchroFrame = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.35,
      envMap: this.envMap
    });

    const chromeSilver = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.06,
      envMap: this.envMap,
      envMapIntensity: 1.8
    });

    const tireRubber = new THREE.MeshStandardMaterial({
      color: 0x090b0e,
      roughness: 0.92
    });

    const engineBlock = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.88,
      roughness: 0.25
    });

    const splitSeatLeather = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.82
    });

    const ledHeadlight = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const tailLight = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const brushedMuffler = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.92, roughness: 0.2 });

    const createMesh = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      m.receiveShadow = true;
      this.vehicleGroup.add(m);
      return m;
    };

    // Double-cradle Perimeter Synchro Frame
    createMesh(new THREE.BoxGeometry(0.36, 0.48, 1.25), synchroFrame, 0, 0.72, 0.05, 0.1, 0, 0);

    // 4-Stroke Engine Block with Cooling Fins & Crankcase
    createMesh(new THREE.BoxGeometry(0.34, 0.36, 0.52), engineBlock, 0, 0.48, 0.12);
    for (let f = 0; f < 5; f++) {
      createMesh(new THREE.BoxGeometry(0.40, 0.02, 0.46), chromeSilver, 0, 0.42 + f * 0.06, 0.12);
    }

    // Muscular Sculpted Fuel Tank (Pearl White)
    createMesh(new THREE.BoxGeometry(0.42, 0.34, 0.75), pearlWhite, 0, 1.02, 0.32, -0.15, 0, 0);

    // Red Apache Racing Stripes on Tank & Cowl
    createMesh(new THREE.BoxGeometry(0.43, 0.08, 0.72), racingRed, 0, 1.05, 0.32, -0.15, 0, 0);

    // Forward Aerodynamic Tank Shrouds / Air Scoops
    [-0.23, 0.23].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.06, 0.28, 0.45), pearlWhite, x, 0.95, 0.48, -0.25, 0, 0);
      createMesh(new THREE.BoxGeometry(0.065, 0.08, 0.35), racingRed, x, 0.98, 0.48, -0.25, 0, 0);
    });

    // Aerodynamic Engine Belly-Pan Spoiler Cowl
    createMesh(new THREE.BoxGeometry(0.36, 0.16, 0.65), pearlWhite, 0, 0.28, 0.15, 0.1, 0, 0);
    createMesh(new THREE.BoxGeometry(0.37, 0.04, 0.55), racingRed, 0, 0.30, 0.15, 0.1, 0, 0);

    // Beast-Eye Front Headlamp Fairing & Flyscreen
    createMesh(new THREE.BoxGeometry(0.38, 0.36, 0.35), pearlWhite, 0, 1.12, 0.88, -0.28, 0, 0);
    createMesh(new THREE.BoxGeometry(0.32, 0.22, 0.04), synchroFrame, 0, 1.34, 0.88, -0.55, 0, 0);

    // Two-Piece Split Sport Seat with Red Accent Stitching
    createMesh(new THREE.BoxGeometry(0.32, 0.14, 0.55), splitSeatLeather, 0, 0.94, -0.25, 0.12, 0, 0);
    createMesh(new THREE.BoxGeometry(0.24, 0.12, 0.38), splitSeatLeather, 0, 1.04, -0.65, 0.22, 0, 0);

    // Rear Tail Cowl & Split Alloy Grab Rails
    createMesh(new THREE.BoxGeometry(0.24, 0.16, 0.65), pearlWhite, 0, 1.02, -0.85, 0.25, 0, 0);
    [-0.14, 0.14].forEach((x) => {
      createMesh(new THREE.BoxGeometry(0.04, 0.04, 0.35), synchroFrame, x, 1.14, -0.75, 0.2, 0, 0);
    });

    // Telescopic Front Forks
    [-0.14, 0.14].forEach((x) => {
      createMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.92, 16), synchroFrame, x, 0.72, 0.98, -0.38, 0, 0);
      createMesh(new THREE.CylinderGeometry(0.026, 0.026, 0.45, 16), chromeSilver, x, 0.36, 1.16, -0.38, 0, 0);
    });

    // Upswept Dual-Barrel Sport Silencer with Brushed Chrome Heat Shield
    createMesh(new THREE.CylinderGeometry(0.065, 0.055, 0.78, 16), synchroFrame, 0.25, 0.56, -0.62, -0.45, 0.15, 0);
    createMesh(new THREE.BoxGeometry(0.08, 0.06, 0.55), brushedMuffler, 0.28, 0.58, -0.62, -0.45, 0.15, 0);

    // LED Headlight Unit & Tail Strip
    createMesh(new THREE.BoxGeometry(0.26, 0.12, 0.05), ledHeadlight, 0, 1.08, 1.06);
    createMesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), tailLight, 0, 1.12, -1.18);

    // 6-Spoke Black Alloy Wheels with Petal Disc Rotors & Red Rim Tape
    const wheels = [
      { z: 1.28, y: 0.35, isFront: true },
      { z: -1.05, y: 0.35, isFront: false }
    ];

    wheels.forEach((w) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(0, w.y, w.z);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.075, 16, 32), tireRubber);
      tire.rotation.y = Math.PI / 2;
      wheelGroup.add(tire);

      // Red Rim Tape Accent
      const rimTape = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.29, 32),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide })
      );
      rimTape.rotation.y = Math.PI / 2;
      rimTape.position.x = 0.076;
      wheelGroup.add(rimTape);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 24), synchroFrame);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      for (let s = 0; s < 6; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.03), synchroFrame);
        spoke.rotation.z = (s / 6) * Math.PI * 2;
        wheelGroup.add(spoke);
      }

      // Rotopetal Disc Brake
      const rotorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 20), rotorMat);
      rotor.rotation.z = Math.PI / 2;
      rotor.position.x = 0.08;
      wheelGroup.add(rotor);

      if (w.isFront) {
        const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), racingRed);
        caliper.position.set(0.09, 0.12, 0);
        wheelGroup.add(caliper);
      }

      this.vehicleGroup.add(wheelGroup);
    });
  }

  setupHotspots() {
    if (this.hotspotGroups) {
      this.hotspotGroups.forEach((g) => this.scene.remove(g));
    }
    this.hotspotGroups = [];
    this.hotspotMeshes = [];

    const isBike = this.currentVehicleType === "bike";

    if (isBike) {
      this.hotspotData = [
        { id: "engine", title: "Engine & Performance Tuning", desc: "Oil change, spark plug check & valve clearance.", price: "₹1,200", serviceName: "Engine Oil Change", position: new THREE.Vector3(0.22, 0.50, -0.10) },
        { id: "battery", title: "Two-Wheeler Battery & Starter", desc: "Jumpstart, load test & terminal corrosion clean.", price: "₹500", serviceName: "Battery Jumpstart", position: new THREE.Vector3(-0.22, 0.72, 0.15) },
        { id: "brakes", title: "Dual Disc Brakes & Fluid", desc: "Caliper inspection, ceramic pads & bleeding.", price: "₹500", serviceName: "Brake Check & Adjustment", position: new THREE.Vector3(0.20, 0.36, -1.01) },
        { id: "tyres", title: "Motorcycle Tyres & Puncture", desc: "Tubeless repair, balance & grip inspection.", price: "₹150", serviceName: "Puncture Repair", position: new THREE.Vector3(0.16, 0.40, 0.89) },
        { id: "chain", title: "Drive Chain & Sprocket Care", desc: "Degreasing, O-ring lube & tension adjustment.", price: "₹200", serviceName: "Bike Chain Clean & Lube", position: new THREE.Vector3(-0.22, 0.36, 0.45) },
        { id: "carb", title: "Carburetor & Fuel Injection", desc: "Ultrasonic nozzle clean & air-fuel sync tuning.", price: "₹450", serviceName: "Bike Carburetor & Fuel Injector Service", position: new THREE.Vector3(0.22, 0.65, -0.22) },
        { id: "forks", title: "Inverted Front Fork Damping", desc: "Hydraulic oil change & dust seal replacement.", price: "₹600", serviceName: "Bike Fork Oil & Seal Replacement", position: new THREE.Vector3(-0.18, 0.75, -0.90) },
        { id: "clutch", title: "Clutch & Cable Calibration", desc: "Friction plate wear scan & freeplay adjustment.", price: "₹250", serviceName: "Brake Check & Adjustment", position: new THREE.Vector3(-0.32, 1.18, -0.70) },
        { id: "exhaust", title: "Exhaust Header & Decarb", desc: "Header pipe inspection & emission diagnostics.", price: "₹750", serviceName: "Exhaust & Emission Diagnostics", position: new THREE.Vector3(0.30, 0.38, 0.35) },
        { id: "wash", title: "Bike Foam Wash & Detailing", desc: "Pressure wash, degreasing & ceramic coat finish.", price: "₹250", serviceName: "Bike Foam Wash & Chain Care", position: new THREE.Vector3(0.00, 1.08, -0.45) },
        { id: "lighting", title: "LED Headlamp & Lighting", desc: "Beam alignment, relay circuit & switch scan.", price: "₹450", serviceName: "Lighting & Electrical Diagnostics", position: new THREE.Vector3(0.00, 0.92, -1.28) }
      ];
    } else {
      this.hotspotData = [
        { id: "engine", title: "Engine & Diagnostics", desc: "Synthetic oil, filters & comprehensive health diagnostics.", price: "₹1,200", serviceName: "Engine Oil Change", position: new THREE.Vector3(0.00, 0.88, -1.00) },
        { id: "battery", title: "Battery & Electrical", desc: "Heavy-duty jumpstart, load analysis & terminal cleaning.", price: "₹500", serviceName: "Battery Jumpstart", position: new THREE.Vector3(-0.48, 0.88, -1.15) },
        { id: "brakes", title: "Braking System", desc: "Ceramic pad wear inspection & hydraulic calibration.", price: "₹500", serviceName: "Brake Check & Adjustment", position: new THREE.Vector3(0.90, 0.36, -1.35) },
        { id: "tires", title: "Tires & Alignment", desc: "Tubeless puncture repair, balancing & wheel alignment.", price: "₹150", serviceName: "Puncture Repair", position: new THREE.Vector3(0.90, 0.36, 1.22) },
        { id: "cabin", title: "Cabin Climate & Wash", desc: "AC gas recharge & antibacterial deep steam cleaning.", price: "₹1,500", serviceName: "Interior Deep Cleaning", position: new THREE.Vector3(0.00, 1.38, -0.10) },
        { id: "body", title: "Paint & Detailing", desc: "Hydrophobic wax polish, ceramic shield & dent repair.", price: "₹2,500", serviceName: "Full Detailing Package", position: new THREE.Vector3(-0.96, 0.72, -0.15) },
        { id: "radiator", title: "Cooling & Radiator", desc: "Coolant flush, radiator leak inspection & thermal sensor calibration.", price: "₹850", serviceName: "Coolant Flush & Radiator Service", position: new THREE.Vector3(0.00, 0.40, -2.18) },
        { id: "ac_system", title: "AC Refrigerant & Climate", desc: "Compressor diagnostic, condenser cleaning & high-grade R134a gas recharge.", price: "₹1,500", serviceName: "AC Gas Top-up", position: new THREE.Vector3(0.48, 0.88, -0.95) },
        { id: "suspension", title: "Suspension & Struts", desc: "Shock absorber check, bushing wear inspection & electronic steering alignment.", price: "₹1,100", serviceName: "Suspension & Steering Check", position: new THREE.Vector3(-0.90, 0.50, -1.35) },
        { id: "exhaust", title: "Exhaust & Emissions", desc: "Catalytic converter scan, muffler inspection & oxygen sensor diagnostic.", price: "₹750", serviceName: "Exhaust & Emission Diagnostics", position: new THREE.Vector3(0.00, 0.30, 2.18) },
        { id: "lighting", title: "LED Lighting & Electrical", desc: "High-beam LED alignment, fuse box diagnostic & wiring harness testing.", price: "₹450", serviceName: "Lighting & Electrical Diagnostics", position: new THREE.Vector3(-0.65, 0.75, -1.92) }
      ];
    }

    const pinGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

    this.hotspotData.forEach((data) => {
      const group = new THREE.Group();
      group.position.copy(data.position);

      const sphere = new THREE.Mesh(pinGeo, pinMat);
      group.add(sphere);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.065, 0.08, 24),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.userData = data;
      this.scene.add(group);
      this.hotspotGroups.push(group);
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
          <span class="hotspot-tag">AutoBuddy</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="hotspot-price" id="hotspotPrice">₹0</span>
            <button type="button" class="hotspot-close-btn" id="hotspotCloseBtn" title="Close" aria-label="Close">✕</button>
          </div>
        </div>
        <strong class="hotspot-title" id="hotspotTitle">Component</strong>
        <p class="hotspot-desc" id="hotspotDesc">Service details</p>
        <button type="button" class="hotspot-book-action" id="hotspotBookBtn">Book Service</button>
      `;
      this.container.appendChild(tooltip);

      tooltip.querySelector("#hotspotCloseBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.hideHotspot();
      });

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

  hideHotspot() {
    this.activeHotspotData = null;
    this.hoveredHotspot = null;
    if (this.tooltipEl) {
      this.tooltipEl.classList.remove("visible");
    }
  }

  setupEventListeners() {
    const el = this.renderer.domElement;
    let dragStartPos = { x: 0, y: 0 };
    let hasMoved = false;

    el.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      hasMoved = false;
      dragStartPos = { x: e.clientX, y: e.clientY };
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    el.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        hasMoved = false;
        dragStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
        if (Math.hypot(clientX - dragStartPos.x, clientY - dragStartPos.y) > 4) {
          hasMoved = true;
        }
        this.targetSpherical.theta -= deltaX * 0.007;
        this.targetSpherical.phi = Math.max(0.35, Math.min(Math.PI / 2.05, this.targetSpherical.phi - deltaY * 0.007));
        this.previousMousePosition = { x: clientX, y: clientY };
      }
    };

    window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    const endDrag = (e) => {
      const wasDragging = this.isDragging;
      this.isDragging = false;

      // If it was a clean click without significant drag
      if (wasDragging && !hasMoved) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.hotspotMeshes);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          this.showHotspot(hit.parent.userData);
        } else {
          // Clicked outside any hotspot on empty background/model -> close card immediately
          this.hideHotspot();
        }
      }
    };

    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);

    // Global document click listener to close card when tapping outside 3D studio
    document.addEventListener("pointerdown", (e) => {
      if (this.tooltipEl && this.tooltipEl.classList.contains("visible")) {
        if (!this.container.contains(e.target) && !this.tooltipEl.contains(e.target)) {
          this.hideHotspot();
        }
      }
    });

    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetSpherical.radius = Math.max(5.0, Math.min(8.6, this.targetSpherical.radius + e.deltaY * 0.003));
    }, { passive: false });

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
          hero: { radius: 6.8, theta: 2.45, phi: 1.25 },
          side: { radius: 6.6, theta: 1.57, phi: 1.35 },
          front: { radius: 6.4, theta: Math.PI, phi: 1.22 },
          back: { radius: 6.4, theta: 0.0, phi: 1.22 }
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

    const priceEl = document.getElementById("hotspotPrice");
    const titleEl = document.getElementById("hotspotTitle");
    const descEl = document.getElementById("hotspotDesc");
    if (priceEl) priceEl.textContent = data.price;
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;
    this.updateTooltipPosition();
    this.tooltipEl.classList.add("visible");
  }

  updateTooltipPosition() {
    if (!this.tooltipEl || !this.activeHotspotData || !this.camera) return;

    const screenPos = this.activeHotspotData.position.clone();
    if (this.vehicleGroup) {
      screenPos.y += this.vehicleGroup.position.y;
    }
    screenPos.project(this.camera);

    const rect = this.container.getBoundingClientRect();
    const x = ((screenPos.x + 1) * rect.width) / 2;
    const y = ((-screenPos.y + 1) * rect.height) / 2;

    const tooltipW = this.tooltipEl.offsetWidth || 195;
    const tooltipH = this.tooltipEl.offsetHeight || 105;

    // Offset card so it never covers the vehicle center directly
    let left = x > rect.width / 2 ? x - tooltipW - 12 : x + 12;
    let top = y > rect.height / 2 ? y - tooltipH - 6 : y - 10;

    // Clamp within viewport margins
    left = Math.max(8, Math.min(rect.width - tooltipW - 8, left));
    top = Math.max(8, Math.min(rect.height - tooltipH - 8, top));

    this.tooltipEl.style.left = `${Math.round(left)}px`;
    this.tooltipEl.style.top = `${Math.round(top)}px`;
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

    if (this.vehicleGroup && !this.reducedMotion) {
      this.vehicleGroup.position.y = Math.sin(time * 0.0012) * 0.012;
    }

    if (this.tooltipEl && this.tooltipEl.classList.contains("visible") && this.activeHotspotData) {
      this.updateTooltipPosition();
    }

    // Raycaster for hotspot hover
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
      this.container.style.cursor = "grab";
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
    new THREE.PointsMaterial({ size: 2, color: 0x0284c7, transparent: true, opacity: 0.28 })
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

window.addEventListener("vehicleModeChanged", (e) => {
  if (window.heroVehicleStudio) {
    window.heroVehicleStudio.setVehicleType(e.detail?.mode || "car");
  }
});
