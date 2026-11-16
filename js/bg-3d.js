// ==========================================================================
// 103_PU BIO — 3D MASCOT INTEGRATION ENGINE (Three.js WebGL)
// Supports Blender GLB models: auto-centering, auto-scaling,
// Skeletal AnimationMixer, ACES Tone Mapping, cursor tracking, mobile gyro,
// Procedural Emotes (Dance, Peek, Idle Walk, 360 Spin + Confetti),
// Planar UV calibration, Texture-Swap Eye Blink, and Rim Lighting Polish.
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

    // --- 2. LIGHTING (Studio setup: enhanced dual rim lighting to pop mascot from background) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    // Key Light: Neutral White
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 4, 3.5);
    scene.add(keyLight);

    // Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.9);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);

    // Rim Light 1: Top-Back Cyan Rim Light
    const rimLight = new THREE.DirectionalLight(0x00f5ff, 1.8);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    // Rim Light 2: Side-Back Kick Purple Rim Light
    const kickRimLight = new THREE.DirectionalLight(0xa855f7, 1.2);
    kickRimLight.position.set(-3, 1, -2.5);
    scene.add(kickRimLight);

    // Soft neutral cursor follow light
    const cursorLight = new THREE.PointLight(0xffffff, 0.8, 8, 2);
    cursorLight.position.set(0, 0, 2.5);
    scene.add(cursorLight);

    // --- 3. MASCOT CONTAINER ---
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    let targetScale = 1.0;
    let currentScale = 0.05;
    mascotGroup.scale.setScalar(currentScale);

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
    let shockwaveScale = 0.2;
    let shockwaveOpacity = 0.85;

    // Physical nod spring
    let nodOffset = 0;
    let nodVelocity = 0;

    const triggerShockwave = () => {
        if (isReducedMotion) return;
        shockwaveActive = true;
        shockwaveScale = 0.2;
        shockwaveOpacity = 0.85;
        nodVelocity = -0.14;
    };

    // --- 6. TEXTURES & MASCOT GEOMETRY ---
    const texLoader = new THREE.TextureLoader();
    const mascotColorTex = texLoader.load('./assets/husky_cutout.png');
    mascotColorTex.colorSpace = THREE.SRGBColorSpace;
    const mascotNormalTex = texLoader.load('./assets/husky_normal.png');

    // Preload blink texture with WebGL VRAM initialization
    let mascotBlinkTex = null;
    const blinkImg = new Image();
    blinkImg.onload = () => {
        mascotBlinkTex = texLoader.load('./assets/husky_cutout_blink.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            if (renderer) renderer.initTexture(tex);
        });
    };
    blinkImg.src = './assets/husky_cutout_blink.png';

    let mixer = null;
    let headBone = null;
    let currentModelObject = null;
    let mascotMesh = null;

    const setupMascotGeometry = (obj, animations = []) => {
        if (currentModelObject) {
            mascotGroup.remove(currentModelObject);
        }

        currentModelObject = obj;
        mascotMesh = null;

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
                if (!mascotMesh) mascotMesh = child;

                const geom = child.geometry;
                if (geom) {
                    if (!geom.attributes.uv) {
                        geom.computeBoundingBox();
                        const bbox = geom.boundingBox;
                        const pos = geom.attributes.position;
                        const count = pos.count;
                        const uvs = new Float32Array(count * 2);
                        const minX = bbox.min.x, maxX = bbox.max.x;
                        const minY = bbox.min.y, maxY = bbox.max.y;
                        const rangeX = maxX - minX || 1;
                        const rangeY = maxY - minY || 1;
                        // Centered 1:1 Planar UV projection to eliminate asymmetric stretch
                        const maxRange = Math.max(rangeX, rangeY);
                        const offsetX = minX + (rangeX - maxRange) * 0.5;
                        const offsetY = minY + (rangeY - maxRange) * 0.5;
                        for (let i = 0; i < count; i++) {
                            uvs[i * 2] = (pos.getX(i) - offsetX) / maxRange;
                            uvs[i * 2 + 1] = (pos.getY(i) - offsetY) / maxRange;
                        }
                        geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
                    }
                    if (!geom.attributes.normal) {
                        geom.computeVertexNormals();
                    }
                }

                // Polish material: ensure standard material with subtle emissive
                if (!child.material || !child.material.map) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: mascotColorTex,
                        normalMap: mascotNormalTex,
                        roughness: 0.52,
                        metalness: 0.1,
                        transparent: true,
                        alphaTest: 0.05,
                        side: THREE.DoubleSide
                    });
                } else {
                    if (child.material.map) child.material.map.colorSpace = THREE.SRGBColorSpace;
                }
                child.material.emissive = new THREE.Color(0x1a2436);
                child.material.emissiveMap = mascotColorTex;
                child.material.emissiveIntensity = 0.2;
                child.material.needsUpdate = true;
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
        const depthTex = texLoader.load('./assets/husky_depth.png');

        const planeGeo = new THREE.PlaneGeometry(2.7, 2.7, 128, 128);
        const planeMat = new THREE.MeshStandardMaterial({
            map: mascotColorTex,
            displacementMap: depthTex,
            displacementScale: 0.75,
            normalMap: mascotNormalTex,
            roughness: 0.52,
            metalness: 0.1,
            emissive: new THREE.Color(0x1a2436),
            emissiveMap: mascotColorTex,
            emissiveIntensity: 0.2,
            transparent: true,
            alphaTest: 0.05,
            side: THREE.DoubleSide
        });

        const fallbackMesh = new THREE.Mesh(planeGeo, planeMat);
        fallbackMesh.position.z = 0;
        mascotMesh = fallbackMesh;
        setupMascotGeometry(fallbackMesh);
    };

    // Attempt loading husky.glb first, fallback to depth mesh
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
        './assets/husky.glb',
        (gltf) => {
            setupMascotGeometry(gltf.scene, gltf.animations);
            canvas.style.opacity = '1';
        },
        undefined,
        (err) => {
            console.warn('[3D Mascot] GLB load failed, falling back to procedural depth mesh:', err);
            setupFallbackDepthMesh();
            canvas.style.opacity = '1';
        }
    );

    // --- 7. TEXTURE-SWAP EYE BLINK CONTROLLER ---
    let blinkTimer = null;
    let blinkRestoreTimer = null;

    const scheduleNextBlink = () => {
        if (blinkTimer) clearTimeout(blinkTimer);
        const delay = 3000 + Math.random() * 2000; // 3 - 5 seconds
        blinkTimer = setTimeout(() => {
            if (!isVisible || isReducedMotion || !mascotBlinkTex || !mascotMesh || !mascotMesh.material) {
                scheduleNextBlink();
                return;
            }
            // Swap to blink texture for 120ms without setting needsUpdate to preserve 60FPS
            mascotMesh.material.map = mascotBlinkTex;
            blinkRestoreTimer = setTimeout(() => {
                if (mascotMesh && mascotMesh.material) {
                    mascotMesh.material.map = mascotColorTex;
                }
                scheduleNextBlink();
            }, 120);
        }, delay);
    };
    scheduleNextBlink();

    // --- 8. PROCEDURAL EMOTES & INTERACTION SYSTEM ---
    // Raycaster for hit-testing mascot
    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2();

    const isPointerOverMascot = (clientX, clientY) => {
        if (!currentModelObject) return false;
        pointerVec.x = (clientX / window.innerWidth) * 2 - 1;
        pointerVec.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(pointerVec, camera);
        const hits = raycaster.intersectObject(currentModelObject, true);
        return hits.length > 0;
    };

    // Emote State Variables
    let danceStartTime = 0;
    let isDancing = false;
    let danceRotZ = 0;
    let danceBounceY = 0;

    let isPeeking = false;
    let holdTimeout = null;
    let holdStartX = 0, holdStartY = 0;
    let peekRotZ = 0, peekRotX = 0, peekGazeY = 0, peekGazeX = 0;

    let lastScrollTime = performance.now();
    let isIdleLooking = false;
    let nextIdleLookTime = 0;
    let idleTargetRotY = 0, idleTargetRotX = 0;
    let headShakeActive = false;
    let headShakeStartTime = 0;
    let headShakeOffset = 0;

    let comboCount = 0;
    let comboResetTimer = null;
    let isSpinning360 = false;
    let spinStartTime = 0;

    // A. Double-Click -> Dance 2.0s
    window.addEventListener('dblclick', (e) => {
        if (e.target?.closest?.('a, button, input')) return;
        if (!isPointerOverMascot(e.clientX, e.clientY)) return;
        if (isReducedMotion) return;
        isDancing = true;
        danceStartTime = performance.now();
    });

    // B. Hold 800ms -> Peek + 5-Click Combo 360 & Confetti
    window.addEventListener('pointerdown', (e) => {
        // Retain existing shockwave and nod impulse on all clicks
        triggerShockwave();

        if (e.target?.closest?.('a, button, input')) return;
        const hitMascot = isPointerOverMascot(e.clientX, e.clientY);
        if (!hitMascot) return;

        // Dispatch tap event for speech bubble & mobile mascot reactions
        window.dispatchEvent(new CustomEvent('mascot:tap'));

        // 5-Click Combo Counter
        comboCount++;
        clearTimeout(comboResetTimer);
        comboResetTimer = setTimeout(() => { comboCount = 0; }, 900);

        if (comboCount >= 5) {
            comboCount = 0;
            triggerEasterEgg360();
            cancelPeek();
            return;
        }

        // Hold detection (800ms)
        holdStartX = e.clientX;
        holdStartY = e.clientY;
        clearTimeout(holdTimeout);
        holdTimeout = setTimeout(() => {
            if (isReducedMotion || isDancing || isSpinning360) return;
            isPeeking = true;
            targetScale = 1.15;
            peekRotZ = 0.22;
            peekRotX = 0.12;
            peekGazeY = 0.35;
            peekGazeX = -0.15;
        }, 800);
    }, { passive: true });

    const cancelPeek = () => {
        clearTimeout(holdTimeout);
        holdTimeout = null;
        if (isPeeking) {
            isPeeking = false;
            targetScale = 1.0;
            peekRotZ = 0;
            peekRotX = 0;
            peekGazeY = 0;
            peekGazeX = 0;
        }
    };

    window.addEventListener('pointerup', cancelPeek, { passive: true });
    window.addEventListener('pointercancel', cancelPeek, { passive: true });
    window.addEventListener('pointermove', (e) => {
        if (holdTimeout) {
            if (Math.hypot(e.clientX - holdStartX, e.clientY - holdStartY) > 15) {
                cancelPeek();
            }
        }
    }, { passive: true });

    // C. Scroll Idle 20s
    window.addEventListener('scroll', () => {
        lastScrollTime = performance.now();
        if (isIdleLooking) {
            isIdleLooking = false;
            headShakeActive = false;
            headShakeOffset = 0;
        }
    }, { passive: true });

    // D. Easter Egg 360 Spin + Confetti
    const triggerEasterEgg360 = () => {
        if (isReducedMotion) return;
        isSpinning360 = true;
        spinStartTime = performance.now();

        if (typeof window.confetti === 'function') {
            window.confetti({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#00f5ff', '#a855f7', '#ff4655', '#ffffff', '#ffd700'],
                disableForReducedMotion: true
            });
            setTimeout(() => {
                window.confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 60,
                    origin: { x: 0.2, y: 0.7 },
                    colors: ['#00f5ff', '#a855f7', '#ffffff']
                });
                window.confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 60,
                    origin: { x: 0.8, y: 0.7 },
                    colors: ['#00f5ff', '#ff4655', '#ffd700']
                });
            }, 250);
        }
    };

    // --- 9. MOUSE TRACKING & GYRO ---
    let mouseNormX = 0;
    let mouseNormY = 0;
    let targetRotY = 0;
    let targetRotX = 0;
    let targetRotZ = 0;

    const onPointerMove = (e) => {
        mouseNormX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseNormY = (e.clientY / window.innerHeight - 0.5) * 2;

        targetRotY = mouseNormX * 0.45;
        targetRotX = mouseNormY * 0.35;
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
            targetRotX = betaNorm * 0.35;
        }, { passive: true });
    }

    // Card hover interaction
    const cards = document.querySelectorAll('.card');
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (!isPeeking) targetScale = 1.05;
        });
        card.addEventListener('mouseleave', () => {
            if (!isPeeking) targetScale = 1.0;
        });
    });

    // --- 10. RESIZE, MOTION & VISIBILITY ---
    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        updateCameraPosition();
    };
    window.addEventListener('resize', onResize);

    const motionQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let isReducedMotion = motionQuery ? motionQuery.matches : false;
    let isVisible = !document.hidden;
    let animationFrameId = null;
    let isRunning = false;

    const stopLoop = () => {
        isRunning = false;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (blinkTimer) clearTimeout(blinkTimer);
        if (blinkRestoreTimer) clearTimeout(blinkRestoreTimer);
    };

    const startLoop = () => {
        if (isRunning || isReducedMotion || !isVisible) return;
        isRunning = true;
        clock.start();
        animationFrameId = requestAnimationFrame(animate);
        scheduleNextBlink();
    };

    const updateMotionState = (reduced) => {
        isReducedMotion = reduced;
        if (isReducedMotion) {
            canvas.style.display = 'none';
            stopLoop();
        } else {
            canvas.style.display = '';
            startLoop();
        }
    };

    if (motionQuery) {
        const handleMotionChange = (e) => updateMotionState(e.matches);
        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', handleMotionChange);
        } else if (typeof motionQuery.addListener === 'function') {
            motionQuery.addListener(handleMotionChange);
        }
    }

    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
        if (isVisible && !isReducedMotion) {
            startLoop();
        } else {
            stopLoop();
        }
    });

    if (isReducedMotion) {
        canvas.style.display = 'none';
    }

    // --- 11. RENDER LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
        if (!isRunning || isReducedMotion || !isVisible) {
            isRunning = false;
            animationFrameId = null;
            return;
        }
        animationFrameId = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        const now = performance.now();

        // Update Blender animation mixer
        if (mixer) {
            mixer.update(delta);
        }

        // Smooth two-way scale lerp (fixes one-way scale bug)
        if (Math.abs(currentScale - targetScale) > 0.0005) {
            currentScale += (targetScale - currentScale) * 0.08;
            mascotGroup.scale.setScalar(currentScale);
        }

        // Emote 1: Dance (2.0s duration)
        if (isDancing) {
            const elapsed = (now - danceStartTime) / 1000;
            if (elapsed >= 2.0) {
                isDancing = false;
                danceRotZ = 0;
                danceBounceY = 0;
            } else {
                const envelope = Math.sin((elapsed / 2.0) * Math.PI);
                danceRotZ = Math.sin(elapsed * 25.0) * 0.22 * envelope;
                danceBounceY = Math.abs(Math.sin(elapsed * 16.0)) * 0.20 * envelope;
            }
        } else {
            danceRotZ = 0;
            danceBounceY = 0;
        }

        // Emote 2: Scroll Idle (20s)
        if (!isDancing && !isPeeking && !isSpinning360 && (now - lastScrollTime > 20000)) {
            if (!isIdleLooking) {
                isIdleLooking = true;
                nextIdleLookTime = now;
            }
            if (now >= nextIdleLookTime) {
                idleTargetRotY = (Math.random() - 0.5) * 0.8;
                idleTargetRotX = (Math.random() - 0.5) * 0.4;
                nextIdleLookTime = now + 2500 + Math.random() * 1500;
                if (Math.random() < 0.35) {
                    headShakeActive = true;
                    headShakeStartTime = now;
                }
            }
            if (headShakeActive) {
                const shakeElapsed = (now - headShakeStartTime) / 1000;
                if (shakeElapsed >= 0.8) {
                    headShakeActive = false;
                    headShakeOffset = 0;
                } else {
                    const env = Math.sin((shakeElapsed / 0.8) * Math.PI);
                    headShakeOffset = Math.sin(shakeElapsed * 28.0) * 0.16 * env;
                }
            }
        } else {
            isIdleLooking = false;
            headShakeActive = false;
            idleTargetRotY = 0;
            idleTargetRotX = 0;
            headShakeOffset = 0;
        }

        // Emote 3: 360 Spin on currentModelObject (prevents Euler angle flipping on mascotGroup)
        if (isSpinning360 && currentModelObject) {
            const spinElapsed = (now - spinStartTime) / 900; // 0.9s duration
            if (spinElapsed >= 1.0) {
                isSpinning360 = false;
                currentModelObject.rotation.y = 0;
            } else {
                const t = spinElapsed;
                const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                currentModelObject.rotation.y = ease * Math.PI * 2;
            }
        }

        // Lerp rotation towards mouse / idle target with emote offsets
        const activeTargetRotY = (isIdleLooking ? idleTargetRotY : targetRotY) + peekGazeY + headShakeOffset;
        const activeTargetRotX = (isIdleLooking ? idleTargetRotX : targetRotX) + nodOffset + peekRotX + peekGazeX;
        const activeTargetRotZ = targetRotZ + danceRotZ + peekRotZ;

        mascotGroup.rotation.y += (activeTargetRotY - mascotGroup.rotation.y) * 0.055;
        mascotGroup.rotation.x += (activeTargetRotX - mascotGroup.rotation.x) * 0.055;
        mascotGroup.rotation.z += (activeTargetRotZ - mascotGroup.rotation.z) * 0.055;

        // If rigged head bone exists, apply fine gaze tracking
        if (headBone) {
            headBone.rotation.y += (activeTargetRotY * 0.6 - headBone.rotation.y) * 0.1;
            headBone.rotation.x += (activeTargetRotX * 0.6 - headBone.rotation.x) * 0.1;
        }

        // Spring nod physics
        nodVelocity += (-nodOffset * 18.0) * delta;
        nodVelocity *= 0.88;
        nodOffset += nodVelocity;

        // Gentle breathing float + dance bounce (fixes position.y override bug)
        const isMobile = window.innerWidth < 768;
        const basePosY = isMobile ? 0.35 : 0.05;
        mascotGroup.position.y = basePosY + Math.sin(time * 1.5) * 0.07 + danceBounceY;

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

    if (!isReducedMotion) {
        startLoop();
    }

    // Export pulse function & mascot mesh accessor for inspection
    window.pulse3DMascot = triggerShockwave;
    window.getMascotMesh = () => mascotMesh;
})();
