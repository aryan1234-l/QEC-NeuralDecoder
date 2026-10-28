/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DataQubit, PauliType, SpacetimeDefect, Stabilizer, SurfaceCodeState } from '../types/quantum';
import { DecodedCorrectionResult } from '../quantum/decoders';

interface QuantumVisualizer3DProps {
  state: SurfaceCodeState;
  decodedResult?: DecodedCorrectionResult | null;
  selectedQubitId?: string | null;
  onSelectQubit: (qubitId: string) => void;
  onInjectError: (qubitId: string, error: PauliType) => void;
  viewMode: 'lattice2d' | 'isometric3d' | 'spacetimePrism';
  showDecorations: {
    showStabilizerPlaquettes: boolean;
    showErrorStrings: boolean;
    showCorrectionStrings: boolean;
    showBlochVectors: boolean;
    showLabels: boolean;
  };
  theme: 'dark' | 'light';
}

export const QuantumVisualizer3D: React.FC<QuantumVisualizer3DProps> = ({
  state,
  decodedResult,
  selectedQubitId,
  onSelectQubit,
  viewMode,
  showDecorations,
  theme,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number>(0);
  const isSoftwareGlRef = useRef<boolean>(false);
  const substrateRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Mesh registries for fast updates and raycasting
  const qubitMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const stabMeshMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const errorLinesGroupRef = useRef<THREE.Group | null>(null);
  const spacetimeGroupRef = useRef<THREE.Group | null>(null);

  const [hoveredQubit, setHoveredQubit] = useState<DataQubit | null>(null);

  const isDark = theme === 'dark';

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const glProbe = document.createElement('canvas').getContext('webgl2');
    let isSoftware = true;
    if (glProbe) {
      const ext = glProbe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER;
      const gpu = String(glProbe.getParameter(param));
      glProbe.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }
    isSoftwareGlRef.current = isSoftware;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const bgColor = isDark ? 0x0b0f17 : 0xf8fafc;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 25, 65);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 15, 17);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftware,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftware;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback
    }

    // 5. Clean Balanced Studio Lighting (Solid natural lighting, no neon colored light floods)
    const ambientLight = new THREE.AmbientLight(isDark ? 0x334155 : 0x94a3b8, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(10, 18, 12);
    keyLight.castShadow = !isSoftware;
    if (!isSoftware) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0x94a3b8 : 0x64748b, 1.0);
    fillLight.position.set(-10, 12, -10);
    scene.add(fillLight);

    // 6. Substrate Plane - Sharp Rectangular Silicon Chip Base
    const substrateGeo = new THREE.BoxGeometry(28, 0.4, 28);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x151b26 : 0xe2e8f0,
      roughness: 0.65,
      metalness: 0.4,
    });
    const substrate = new THREE.Mesh(substrateGeo, substrateMat);
    substrate.position.y = -0.2;
    substrate.receiveShadow = !isSoftware;
    scene.add(substrate);
    substrateRef.current = substrate;

    // Technical grid helper
    const gridHelper = new THREE.GridHelper(
      28,
      28,
      isDark ? 0x334155 : 0x94a3b8,
      isDark ? 0x1e293b : 0xcbd5e1
    );
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Groups for dynamic elements
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);
    errorLinesGroupRef.current = linesGroup;

    const spacetimeGroup = new THREE.Group();
    scene.add(spacetimeGroup);
    spacetimeGroupRef.current = spacetimeGroup;

    // 7. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftware;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.02;
    controls.minDistance = 4;
    controls.maxDistance = 45;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 8. Animation & Render Loop
    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const stateSync = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (stateSync === gl.UNSIGNALED) {
          frameIdRef.current = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameIdRef.current = window.setTimeout(cb, 60);
        }
      };
      frameIdRef.current = window.setTimeout(poll, 6);
    }

    function renderLoop() {
      controls.update();
      renderer.render(scene, camera);

      if (isSoftware) {
        afterDraw(renderLoop);
      } else {
        frameIdRef.current = requestAnimationFrame(renderLoop);
      }
    }

    renderLoop();

    // 9. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftware) {
        clearTimeout(frameIdRef.current);
      } else {
        cancelAnimationFrame(frameIdRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update theme colors in Three.js scene dynamically
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const bgColor = isDark ? 0x0b0f17 : 0xf8fafc;
    scene.background = new THREE.Color(bgColor);
    if (scene.fog) {
      scene.fog.color = new THREE.Color(bgColor);
    }

    if (substrateRef.current) {
      const mat = substrateRef.current.material as THREE.MeshStandardMaterial;
      mat.color.setHex(isDark ? 0x151b26 : 0xe2e8f0);
    }

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      const newGrid = new THREE.GridHelper(
        28,
        28,
        isDark ? 0x334155 : 0x94a3b8,
        isDark ? 0x1e293b : 0xcbd5e1
      );
      newGrid.position.y = 0.01;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;
    }
  }, [isDark]);

  // Handle View Mode Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (viewMode === 'lattice2d') {
      camera.position.set(0, 16, 0.01);
      controls.target.set(0, 0, 0);
    } else if (viewMode === 'isometric3d') {
      camera.position.set(11, 13, 14);
      controls.target.set(0, 0, 0);
    } else if (viewMode === 'spacetimePrism') {
      camera.position.set(14, 11, 15);
      controls.target.set(0, 2, 0);
    }
    controls.update();
  }, [viewMode]);

  // Synchronize 3D Data Qubits, Stabilizers, and Spacetime Slices with State
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old meshes
    qubitMeshMapRef.current.forEach((mesh) => scene.remove(mesh));
    qubitMeshMapRef.current.clear();

    stabMeshMapRef.current.forEach((mesh) => scene.remove(mesh));
    stabMeshMapRef.current.clear();

    const d = state.distance;
    const spacing = 3.2;

    // --- A. Build Data Qubits (Sharp, Solid, Clean PBR Parts) ---
    state.dataQubits.forEach((qubit) => {
      const qGroup = new THREE.Group();
      qGroup.name = qubit.id;
      qGroup.userData = { qubitId: qubit.id, type: 'dataQubit' };

      const posX = qubit.x * spacing;
      const posZ = -qubit.y * spacing;
      qGroup.position.set(posX, 0, posZ);

      // Part 1: Sharp Rectangular Base Electrode (Box geometry instead of round cylinder)
      const baseGeo = new THREE.BoxGeometry(1.4, 0.1, 1.4);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isDark ? 0x1e293b : 0xcbd5e1,
        metalness: 0.6,
        roughness: 0.4,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.05;
      baseMesh.receiveShadow = !isSoftwareGlRef.current;
      qGroup.add(baseMesh);

      // Part 2: Josephson Cross Pins
      if (showDecorations.showBlochVectors) {
        const pinMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x94a3b8 : 0x64748b,
          metalness: 0.7,
          roughness: 0.3,
        });
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.16), pinMat);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.1), pinMat);
        p1.position.y = 0.12;
        p2.position.y = 0.12;
        qGroup.add(p1, p2);
      }

      // Part 3: Physical Qubit Core (Solid simple colors, no neon glow)
      let coreColor = isDark ? 0x3b82f6 : 0x2563eb; // Solid Blue when 'I' Clean
      if (qubit.error === 'X') {
        coreColor = 0xdc2626; // Solid Red for X bit-flip
      } else if (qubit.error === 'Z') {
        coreColor = 0x2563eb; // Solid Blue for Z phase-flip
      } else if (qubit.error === 'Y') {
        coreColor = 0x9333ea; // Solid Purple for Y error
      }

      const coreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.4, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: coreColor,
        metalness: 0.4,
        roughness: 0.35,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 0.32;
      coreMesh.castShadow = !isSoftwareGlRef.current;
      coreMesh.name = 'core';
      qGroup.add(coreMesh);

      // Part 4: Sharp Correction Outline Marker
      if (qubit.correction !== 'I' && showDecorations.showCorrectionStrings) {
        const corrBoxGeo = new THREE.BoxGeometry(0.9, 0.08, 0.9);
        const corrMat = new THREE.MeshStandardMaterial({
          color: 0x16a34a, // Solid Green for correction
          metalness: 0.5,
          roughness: 0.3,
        });
        const corrMesh = new THREE.Mesh(corrBoxGeo, corrMat);
        corrMesh.position.y = 0.55;
        qGroup.add(corrMesh);
      }

      // Highlight if selected - Sharp Rectangular Frame
      if (qubit.id === selectedQubitId) {
        const frameGeo = new THREE.BoxGeometry(1.6, 0.04, 1.6);
        const frameMat = new THREE.MeshBasicMaterial({
          color: isDark ? 0xf59e0b : 0xd97706, // Solid Amber
          wireframe: true,
        });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        frameMesh.position.y = 0.16;
        qGroup.add(frameMesh);
      }

      scene.add(qGroup);
      qubitMeshMapRef.current.set(qubit.id, qGroup);
    });

    // --- B. Build Stabilizer Plaquettes (Solid Flat Colors, Sharp Plaquettes) ---
    if (showDecorations.showStabilizerPlaquettes) {
      state.stabilizers.forEach((stab) => {
        const sGroup = new THREE.Group();
        sGroup.name = stab.id;
        sGroup.userData = { stabId: stab.id, type: 'stabilizer' };

        const posX = (stab.c - (d - 1) / 2) * spacing;
        const posZ = (stab.r - (d - 1) / 2) * spacing;
        sGroup.position.set(posX, 0.02, posZ);

        const isDefect = stab.value === -1;
        const isX = stab.type === 'X';

        const plaquetteSize = stab.weight === 4 ? spacing * 0.88 : spacing * 0.65;
        const plaquetteGeo = new THREE.PlaneGeometry(plaquetteSize, plaquetteSize);

        // Solid colors: X = Solid Green (#16a34a), Z = Solid Amber (#d97706)
        // Defect = Solid Red (#dc2626)
        let stabColor = isX ? 0x16a34a : 0xd97706;
        let stabOpacity = isDefect ? 0.65 : 0.22;

        if (isDefect) {
          stabColor = 0xdc2626;
        }

        const plaquetteMat = new THREE.MeshStandardMaterial({
          color: stabColor,
          transparent: true,
          opacity: stabOpacity,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const plaquetteMesh = new THREE.Mesh(plaquetteGeo, plaquetteMat);
        plaquetteMesh.rotation.x = Math.PI / 2;
        if (isX) {
          plaquetteMesh.rotation.z = Math.PI / 4; // Rotated checkerboard
        }
        sGroup.add(plaquetteMesh);

        // Stabilizer center marker - Sharp small box
        const nodeGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const nodeMat = new THREE.MeshStandardMaterial({
          color: isDefect ? 0xdc2626 : isX ? 0x16a34a : 0xd97706,
          metalness: 0.3,
          roughness: 0.5,
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.y = 0.2;
        sGroup.add(nodeMesh);

        // If Defect: add clean vertical indicator pole
        if (isDefect) {
          const poleGeo = new THREE.BoxGeometry(0.1, 2.5, 0.1);
          const poleMat = new THREE.MeshStandardMaterial({
            color: 0xdc2626,
          });
          const poleMesh = new THREE.Mesh(poleGeo, poleMat);
          poleMesh.position.y = 1.45;
          sGroup.add(poleMesh);
        }

        scene.add(sGroup);
        stabMeshMapRef.current.set(stab.id, sGroup);
      });
    }

    // --- C. Error and Correction Paths (Solid lines) ---
    const linesGroup = errorLinesGroupRef.current;
    if (linesGroup) {
      linesGroup.clear();

      // True physical errors
      if (showDecorations.showErrorStrings) {
        state.dataQubits.forEach((q) => {
          if (q.error !== 'I') {
            const posX = q.x * spacing;
            const posZ = -q.y * spacing;

            const errMarker = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 1.0, 0.12),
              new THREE.MeshStandardMaterial({
                color: q.error === 'X' ? 0xdc2626 : q.error === 'Z' ? 0x2563eb : 0x9333ea,
              })
            );
            errMarker.position.set(posX, 0.9, posZ);
            linesGroup.add(errMarker);
          }
        });
      }

      // Predicted matching correction paths
      if (showDecorations.showCorrectionStrings && decodedResult?.predictedDefectPairs) {
        decodedResult.predictedDefectPairs.forEach((pair) => {
          const fromX = (pair.from.c - (d - 1) / 2) * spacing;
          const fromZ = (pair.from.r - (d - 1) / 2) * spacing;

          let toX = fromX;
          let toZ = fromZ;

          if (pair.to === 'boundary') {
            if (pair.type === 'Z') {
              toZ = pair.from.r < d / 2 ? (-d / 2) * spacing : (d / 2) * spacing;
            } else {
              toX = pair.from.c < d / 2 ? (-d / 2) * spacing : (d / 2) * spacing;
            }
          } else {
            toX = (pair.to.c - (d - 1) / 2) * spacing;
            toZ = (pair.to.r - (d - 1) / 2) * spacing;
          }

          const startVec = new THREE.Vector3(fromX, 0.35, fromZ);
          const endVec = new THREE.Vector3(toX, 0.35, toZ);
          const dist = startVec.distanceTo(endVec);

          if (dist > 0.1) {
            const lineGeo = new THREE.CylinderGeometry(0.06, 0.06, dist, 8);
            const lineMat = new THREE.MeshStandardMaterial({
              color: 0x16a34a, // Solid green
              metalness: 0.3,
              roughness: 0.4,
            });
            const lineMesh = new THREE.Mesh(lineGeo, lineMat);

            const mid = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
            lineMesh.position.copy(mid);
            lineMesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              endVec.clone().sub(startVec).normalize()
            );
            linesGroup.add(lineMesh);
          }
        });
      }
    }

    // --- D. Spacetime Multi-Round Layers ---
    const spacetimeGroup = spacetimeGroupRef.current;
    if (spacetimeGroup) {
      spacetimeGroup.clear();

      if (viewMode === 'spacetimePrism') {
        const totalSlices = Math.min(5, Math.max(3, state.spacetimeHistory.length));
        const layerHeight = 2.4;

        for (let t = 0; t < totalSlices; t++) {
          const layerGrid = new THREE.GridHelper(
            d * spacing + 2,
            d,
            isDark ? 0x334155 : 0x94a3b8,
            isDark ? 0x1e293b : 0xe2e8f0
          );
          layerGrid.position.y = t * layerHeight;
          spacetimeGroup.add(layerGrid);

          const historyEntry = state.spacetimeHistory[t];
          if (historyEntry) {
            historyEntry.defects.forEach((defect) => {
              const defX = (defect.c - (d - 1) / 2) * spacing;
              const defZ = (defect.r - (d - 1) / 2) * spacing;

              const defBox = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.35, 0.35),
                new THREE.MeshStandardMaterial({
                  color: defect.type === 'X' ? 0x16a34a : 0xd97706,
                })
              );
              defBox.position.set(defX, t * layerHeight + 0.25, defZ);
              spacetimeGroup.add(defBox);

              if (t > 0) {
                const vertBar = new THREE.Mesh(
                  new THREE.BoxGeometry(0.06, layerHeight, 0.06),
                  new THREE.MeshStandardMaterial({
                    color: 0x2563eb,
                  })
                );
                vertBar.position.set(defX, (t - 0.5) * layerHeight + 0.25, defZ);
                spacetimeGroup.add(vertBar);
              }
            });
          }
        }
      }
    }
  }, [state, decodedResult, selectedQubitId, viewMode, showDecorations, isDark]);

  // Raycasting for interactive click & hover on qubits
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const candidates: THREE.Object3D[] = [];
    qubitMeshMapRef.current.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) candidates.push(child);
      });
    });

    const intersects = raycaster.intersectObjects(candidates, false);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && !current.userData?.qubitId) {
        current = current.parent;
      }
      if (current && current.userData?.qubitId) {
        onSelectQubit(current.userData.qubitId);
      }
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene) return;

    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    const y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const qubitCandidates: THREE.Object3D[] = [];
    qubitMeshMapRef.current.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) qubitCandidates.push(child);
      });
    });

    const intersects = raycaster.intersectObjects(qubitCandidates, false);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && !current.userData?.qubitId) {
        current = current.parent;
      }
      if (current && current.userData?.qubitId) {
        const found = state.dataQubits.find((q) => q.id === current?.userData.qubitId);
        setHoveredQubit(found || null);
        return;
      }
    }

    setHoveredQubit(null);
  };

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden ${
        isDark ? 'bg-[#0b0f17]' : 'bg-[#f8fafc]'
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />

      {/* Floating Info Tooltip for Hovered Qubit - Sharp Edges */}
      {hoveredQubit && (
        <div
          className={`absolute top-16 left-6 z-20 pointer-events-none border p-2.5 text-xs font-mono shadow-md ${
            isDark
              ? 'bg-[#0b0f17] border-slate-700 text-slate-200'
              : 'bg-white border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 mb-1 border-b pb-1 font-bold">
            <span>{hoveredQubit.id}</span>
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              ({hoveredQubit.r}, {hoveredQubit.c})
            </span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            <div>
              State: <span className="font-semibold text-red-600 dark:text-red-400">{hoveredQubit.error}</span>
            </div>
            <div>
              Correction: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{hoveredQubit.correction}</span>
            </div>
            <div>
              Effective: <span className="font-semibold text-blue-600 dark:text-blue-400">{hoveredQubit.effectiveError}</span>
            </div>
          </div>
          <div className={`mt-1.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Click to select qubit
          </div>
        </div>
      )}
    </div>
  );
};
