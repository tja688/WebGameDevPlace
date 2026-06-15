import * as THREE from "three";

function getFlowBounds(flowSource) {
  const box = new THREE.Box3();

  flowSource.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    child.geometry.computeBoundingBox();
    if (child.geometry.boundingBox) {
      box.union(child.geometry.boundingBox);
    }
  });

  if (box.isEmpty()) {
    return {
      min: new THREE.Vector3(-1, -1, -1),
      range: new THREE.Vector3(1, 1, 1)
    };
  }

  const range = box.getSize(new THREE.Vector3());
  range.set(
    Math.max(range.x, 0.0001),
    Math.max(range.y, 0.0001),
    Math.max(range.z, 0.0001)
  );

  return {
    min: box.min.clone(),
    range
  };
}

function copyWorldTransformRelativeToRoot(source, target, root) {
  source.updateWorldMatrix(true, false);
  root.updateWorldMatrix(true, false);

  const matrix = root.matrixWorld.clone().invert().multiply(source.matrixWorld);
  matrix.decompose(target.position, target.quaternion, target.scale);
}

function createFlowMaterial(bounds) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMix: { value: 0 },
      uBoundsMin: { value: bounds.min },
      uBoundsRange: { value: bounds.range },
      uColor: { value: new THREE.Color(0x00a8ff) },
      uCore: { value: new THREE.Color(0xb9ffff) }
    },
    vertexShader: `
      uniform vec3 uBoundsMin;
      uniform vec3 uBoundsRange;
      varying float vAlong;
      varying vec2 vUv;

      void main() {
        vec3 normalizedPosition = (position - uBoundsMin) / uBoundsRange;
        vAlong = clamp(normalizedPosition.y, 0.0, 1.0);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uMix;
      uniform vec3 uColor;
      uniform vec3 uCore;
      varying float vAlong;
      varying vec2 vUv;

      void main() {
        float uvBand = fract(vUv.y * 7.0 - uTime * 1.75);
        float heightBand = fract(vAlong * 9.0 - uTime * 1.4);
        float streak = max(
          smoothstep(0.62, 0.98, uvBand),
          smoothstep(0.68, 1.0, heightBand)
        );
        float pulse = 0.65 + 0.35 * sin(vAlong * 24.0 - uTime * 7.0);
        vec3 color = mix(uColor, uCore, streak * pulse);
        float alpha = (0.16 + streak * 0.45) * uMix;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

function createEdgeMaterial() {
  return new THREE.LineBasicMaterial({
    color: 0x74f7ff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

function createSparkMaterial(bounds) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMix: { value: 0 },
      uBoundsMin: { value: bounds.min },
      uBoundsRange: { value: bounds.range }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uMix;
      uniform vec3 uBoundsMin;
      uniform vec3 uBoundsRange;
      varying float vSpark;

      void main() {
        vec3 normalizedPosition = (position - uBoundsMin) / uBoundsRange;
        float along = clamp(normalizedPosition.y, 0.0, 1.0);
        float head = fract(along * 5.5 - uTime * 1.7);
        vSpark = smoothstep(0.74, 1.0, head) * uMix;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (5.0 + vSpark * 10.0) * uMix / max(0.35, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vSpark;

      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float glow = smoothstep(0.5, 0.0, length(p));
        float alpha = glow * vSpark;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(0.45, 0.95, 1.0, alpha * 0.7);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

export function setupFlowEffect({ modelRoot, camera, domElement }) {
  const state = {
    hoverTarget: 0,
    hoverCurrent: 0,
    time: 0,
    overlays: [],
    materials: [],
    geometries: [],
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2()
  };

  const flowSource = modelRoot.getObjectByName("流动模型");
  if (!flowSource) {
    console.warn("Flow mesh 流动模型 not found");
    return {
      update() {},
      dispose() {}
    };
  }

  flowSource.visible = false;
  const bounds = getFlowBounds(flowSource);

  flowSource.traverse((child) => {
    if (!child.isMesh) return;

    const material = createFlowMaterial(bounds);
    const sparkMaterial = createSparkMaterial(bounds);
    const edgeMaterial = createEdgeMaterial();
    state.materials.push(material);
    state.materials.push(sparkMaterial);
    state.materials.push(edgeMaterial);

    const overlay = child.clone();
    overlay.material = material;
    overlay.userData.isFlowOverlay = true;
    overlay.castShadow = false;
    overlay.receiveShadow = false;
    overlay.frustumCulled = false;
    overlay.renderOrder = 80;
    overlay.visible = false;
    copyWorldTransformRelativeToRoot(child, overlay, modelRoot);
    overlay.scale.multiplyScalar(1.035);
    modelRoot.add(overlay);
    state.overlays.push(overlay);

    const sparks = new THREE.Points(child.geometry, sparkMaterial);
    sparks.name = `${child.name || "flow"}_sparks`;
    sparks.userData.isFlowOverlay = true;
    sparks.frustumCulled = false;
    sparks.renderOrder = 81;
    sparks.visible = false;
    copyWorldTransformRelativeToRoot(child, sparks, modelRoot);
    sparks.scale.multiplyScalar(1.05);
    modelRoot.add(sparks);
    state.overlays.push(sparks);

    const edgeGeometry = new THREE.EdgesGeometry(child.geometry, 12);
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.name = `${child.name || "flow"}_edges`;
    edges.userData.isFlowOverlay = true;
    edges.frustumCulled = false;
    edges.renderOrder = 82;
    edges.visible = false;
    copyWorldTransformRelativeToRoot(child, edges, modelRoot);
    edges.scale.multiplyScalar(1.055);
    modelRoot.add(edges);
    state.geometries.push(edgeGeometry);
    state.overlays.push(edges);
  });

  function isHoverHit(object) {
    let current = object;
    while (current) {
      if (current.userData?.isFlowOverlay) return false;
      current = current.parent;
    }
    return true;
  }

  function setHover(active) {
    state.hoverTarget = active ? 1 : 0;
    domElement.style.cursor = active ? "pointer" : "";
  }

  function onPointerMove(event) {
    const rect = domElement.getBoundingClientRect();
    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    state.raycaster.setFromCamera(state.pointer, camera);
    const hits = state.raycaster
      .intersectObject(modelRoot, true)
      .filter((hit) => hit.object.visible && isHoverHit(hit.object));

    setHover(hits.length > 0);
  }

  function onPointerLeave() {
    setHover(false);
  }

  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerleave", onPointerLeave);

  return {
    update(delta) {
      state.time += delta;
      state.hoverCurrent +=
        (state.hoverTarget - state.hoverCurrent) * Math.min(1, delta * 8);

      const active = state.hoverCurrent > 0.02;
      for (const overlay of state.overlays) {
        overlay.visible = active;
        if (overlay.material.uniforms) {
          overlay.material.uniforms.uTime.value = state.time;
          overlay.material.uniforms.uMix.value = state.hoverCurrent;
        } else {
          overlay.material.opacity = state.hoverCurrent * 0.35;
        }
      }
    },
    dispose() {
      domElement.removeEventListener("pointermove", onPointerMove);
      domElement.removeEventListener("pointerleave", onPointerLeave);
      domElement.style.cursor = "";
      for (const overlay of state.overlays) {
        overlay.parent?.remove(overlay);
      }
      for (const material of state.materials) {
        material.dispose();
      }
      for (const geometry of state.geometries) {
        geometry.dispose();
      }
    }
  };
}
