// ==========================================================================
// 103_PU BIO — 3D MASCOT INTEGRATION ENGINE (Three.js WebGL)
// Built to support Blender GLB models: auto-centering, auto-scaling,
// Skeletal AnimationMixer, ACES Tone Mapping, cursor tracking, and mobile gyro.
// ponytail: không dùng UnrealBloom để bảo toàn 60FPS mượt mà trên thiết bị di động.
// ==========================================================================

import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/GLTFLoader.js';

(function init3DMascotEngine() {
    const canvas = document.getElementById('bg-3d-canvas');
    if (!canvas) return;

    // --- 1. SCENE, CAMERA, RENDERER ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        42,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    const updateCameraPosition = () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            camera.position.set(0, 0.45, 5.2);
        } else {
            camera.position.set(0, 0.15, 4.4);
        }
    };
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        precision: 'mediump'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // --- 2. CYBER LIGHTING (Valorant / Cyberpunk aesthetic) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    scene.add(ambientLight);

    // Key Light: Neon Cyan
    const cyanLight = new THREE.DirectionalLight(0x00f5ff, 3.8);
    cyanLight.position.set(4, 3, 2.5);
    scene.add(cyanLight);

    // Rim Light: Neon Violet / Magenta
    const purpleLight = new THREE.DirectionalLight(0xa855f7, 3.5);
    purpleLight.position.set(-4, -2, -1);
    scene.add(purpleLight);

    // Under-glow: Valorant Red Accent
    const accentLight = new THREE.PointLight(0xff4655, 2.4, 9, 2);
    accentLight.position.set(0, -3.2, 1.8);
    scene.add(accentLight);

    // Interactive Cursor Follow Light
    const cursorLight = new THREE.PointLight(0x00ffff, 2.5, 7.5, 2);
    cursorLight.position.set(0, 0, 2.5);
    scene.add(cursorLight);

    // --- 3. MASCOT CONTAINER & HUD RINGS ---
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    let targetScale = 1.0;
    let currentScale = 0.05;
    mascotGroup.scale.setScalar(currentScale);

    // Holographic Tech Ring 1 (Inner Cyan Ring)
    const ringGeo1 = new THREE.TorusGeometry(1.85, 0.012, 16, 96);
    const ringMat1 = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.38
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2.6;
    mascotGroup.add(ringMesh1);

    // Holographic Tech Ring 2 (Outer Accent Ring)
    const ringGeo2 = new THREE.TorusGeometry(2.1, 0.008, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.28
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 2.8;
    mascotGroup.add(ringMesh2);

    // Tech HUD Crosshair ticks
    const tickGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.6 });
    for (let i = 0; i < 4; i++) {
        const tick = new THREE.Mesh(tickGeo, tickMat);
        const angle = (i * Math.PI) / 2;
        tick.position.set(Math.cos(angle) * 1.85, 0, Math.sin(angle) * 1.85);
        tick.rotation.y = -angle;
        ringMesh1.add(tick);
    }

    // --- 4. FLOATING CYBER EMBER PARTICLES ---
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const cCyan = new THREE.Color(0x00f5ff);
    const cPurple = new THREE.Color(0xa855f7);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const dist = 1.8 + Math.random() * 2.5;

        particlePos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
        particlePos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
        particlePos[i * 3 + 2] = dist * Math.cos(phi) * 0.7;

        const randC = Math.random();
        const col = randC < 0.45 ? cCyan : randC < 0.8 ? cPurple : cWhite;
        particleColors[i * 3] = col.r;
        particleColors[i * 3 + 1] = col.g;
        particleColors[i * 3 + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // --- 5. CLICK SHOCKWAVE EFFECT ---
    const shockwaveGeo = new THREE.RingGeometry(0.1, 0.16, 48);
    const shockwaveMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveMesh.position.z = 0.5;
    mascotGroup.add(shockwaveMesh);
    let shockwaveActive = false;
    let shockwaveScale = 0.1;
    let shockwaveOpacity = 0.0;
    let nodOffset = 0;
    let nodVelocity = 0;

    const triggerShockwave = () => {
        shockwaveActive = true;
        shockwaveScale = 0.2;
        shockwaveOpacity = 0.85;
        nodVelocity = -0.14;
    };

    // --- 6. MODEL PIPELINE (Auto-Blender Compatibility) ---
    let mixer = null;
    let headBone = null;
    let currentModelObject = null;

    const setupMascotGeometry = (obj, animations = []) => {
        if (currentModelObject) {
            mascotGroup.remove(currentModelObject);
        }

        currentModelObject = obj;

        // Auto-center pivot to (0, 0, 0)
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        obj.position.sub(center);

        // Auto-normalize scale for arbitrary Blender exports
        const maxDim = Math.max(size.x, size.y, size.z);
        const isMobile = window.innerWidth < 768;
        const targetDim = isMobile ? 2.5 : 2.85;
        if (maxDim > 0) {
            const scaleFactor = targetDim / maxDim;
            obj.scale.multiplyScalar(scaleFactor);
        }

        // Search for head/neck bone if model is rigged
        headBone = null;
        obj.traverse((child) => {
            if (child.isBone && /head|neck/i.test(child.name)) {
                if (!headBone) headBone = child;
            }
            if (child.isMesh) {
                child.castShadow = false;
                child.receiveShadow = false;
                if (child.material) {
                    if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
                    if (child.material.emissiveMap) child.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                }
            }
        });

        // Initialize AnimationMixer if Blender model includes animation tracks
        if (animations && animations.length > 0) {
            mixer = new THREE.AnimationMixer(obj);
            const clip = animations.find(c => /idle|float|loop/i.test(c.name)) || animations[0];
            const action = mixer.clipAction(clip);
            action.play();
        }

        mascotGroup.add(obj);
    };

    // Fallback: 3D Relief Mesh
    const setupFallbackDepthMesh = () => {
        const texLoader = new THREE.TextureLoader();
        const colorTex = texLoader.load('./assets/husky_cutout.png');
        const depthTex = texLoader.load('./assets/husky_depth.png');
        const normalTex = texLoader.load('./assets/husky_normal.png');
        colorTex.colorSpace = THREE.SRGBColorSpace;

        const planeGeo = new THREE.PlaneGeometry(2.7, 2.7, 128, 128);
        const planeMat = new THREE.MeshStandardMaterial({
            map: colorTex,
            displacementMap: depthTex,
            displacementScale: 0.75,
            normalMap: normalTex,
            roughness: 0.55,
            metalness: 0.15,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });

        const fallbackMesh = new THREE.Mesh(planeGeo, planeMat);
        fallbackMesh.position.set(0, 0, 0);
        setupMascotGeometry(fallbackMesh);
    };

    // Candidates in priority order (Blender model can be model.glb, husky.glb, or mascot.glb)
    const MODEL_CANDIDATES = [
        './assets/model.glb',
        './assets/husky.glb',
        './assets/mascot.glb'
    ];

    const gltfLoader = new GLTFLoader();

    const loadNextCandidate = (index) => {
        if (index >= MODEL_CANDIDATES.length) {
            setupFallbackDepthMesh();
            return;
        }

        const candidateUrl = MODEL_CANDIDATES[index];
        gltfLoader.load(
            candidateUrl,
            (gltf) => {
                setupMascotGeometry(gltf.scene, gltf.animations);
            },
            undefined,
            () => {
                loadNextCandidate(index + 1);
            }
        );
    };

    loadNextCandidate(0);

    // --- 7. PHYSICS & CURSOR TRACKING ---
    let mouseNormX = 0;
    let mouseNormY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let targetRotZ = 0;

    const onPointerMove = (e) => {
        mouseNormX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseNormY = (e.clientY / window.innerHeight - 0.5) * 2;

        targetRotY = mouseNormX * 0.45;
        targetRotX = -mouseNormY * 0.35;
        targetRotZ = -mouseNormX * 0.08;

        cursorLight.position.x = mouseNormX * 3.5;
        cursorLight.position.y = -mouseNormY * 3.0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Gyroscope for Mobile
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (e.gamma === null || e.beta === null) return;
            const gammaNorm = Math.min(Math.max(e.gamma / 45, -1), 1);
            const betaNorm = Math.min(Math.max((e.beta - 45) / 45, -1), 1);
            targetRotY = gammaNorm * 0.5;
            targetRotX = -betaNorm * 0.35;
        }, { passive: true });
    }

    // Trigger shockwave on click
    window.addEventListener('pointerdown', () => {
        triggerShockwave();
    }, { passive: true });

    // Card hover interaction
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            targetScale = 1.05;
        });
        card.addEventListener('mouseleave', () => {
            targetScale = 1.0;
        });
    });

    // --- 8. RESIZE & VISIBILITY ---
    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        updateCameraPosition();
    };
    window.addEventListener('resize', onResize);

    let isVisible = true;
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
    });

    // --- 9. RENDER LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);
        if (!isVisible) return;

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Update Blender animation mixer
        if (mixer) {
            mixer.update(delta);
        }

        // Smooth scale entrance
        if (currentScale < targetScale) {
            currentScale += (targetScale - currentScale) * 0.08;
            mascotGroup.scale.setScalar(currentScale);
        }

        // Lerp rotation towards mouse
        mascotGroup.rotation.y += (targetRotY - mascotGroup.rotation.y) * 0.055;
        mascotGroup.rotation.x += (targetRotX + nodOffset - mascotGroup.rotation.x) * 0.055;
        mascotGroup.rotation.z += (targetRotZ - mascotGroup.rotation.z) * 0.055;

        // If rigged head bone exists, apply fine gaze tracking
        if (headBone) {
            headBone.rotation.y += (targetRotY * 0.6 - headBone.rotation.y) * 0.1;
            headBone.rotation.x += (targetRotX * 0.6 - headBone.rotation.x) * 0.1;
        }

        // Spring nod physics
        nodVelocity += (-nodOffset * 18.0) * delta;
        nodVelocity *= 0.88;
        nodOffset += nodVelocity;

        // Gentle breathing float
        const isMobile = window.innerWidth < 768;
        const basePosY = isMobile ? 0.35 : 0.05;
        mascotGroup.position.y = basePosY + Math.sin(time * 1.5) * 0.07;

        // Spin Holographic Rings
        ringMesh1.rotation.z = time * 0.35;
        ringMesh2.rotation.z = -time * 0.25;

        // Drift Ember Particles
        particles.rotation.y = time * 0.06;
        particles.rotation.x = Math.sin(time * 0.04) * 0.1;

        // Animate Shockwave
        if (shockwaveActive) {
            shockwaveScale += delta * 4.5;
            shockwaveOpacity -= delta * 1.6;
            shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, 1);
            shockwaveMat.opacity = Math.max(0, shockwaveOpacity);
            if (shockwaveOpacity <= 0) {
                shockwaveActive = false;
            }
        }

        renderer.render(scene, camera);
    };

    animate();

    // Export pulse function
    window.pulse3DMascot = triggerShockwave;
})();
