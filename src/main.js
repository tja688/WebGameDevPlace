import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { setupFlowEffect } from "./flowEffect.js";
import modelUrl from "../res/gyy.glb?url";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);
dracoLoader.preload();

const container = document.getElementById("game-root");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15181b);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  200
);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xfff2d6, 1.6);
keyLight.position.set(4, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x8ab4ff, 0.45);
fillLight.position.set(-5, 3, -3);
scene.add(fillLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const clock = new THREE.Clock();
let mixer = null;
let modelRoot = null;
let flowEffect = null;

function removeOuterShell(root) {
  const shell = root.getObjectByName("外壳");
  if (shell) {
    shell.visible = false;
  }
}

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.load(
  modelUrl,
  (gltf) => {
    modelRoot = gltf.scene;
    modelRoot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    removeOuterShell(modelRoot);

    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    modelRoot.scale.setScalar(scale);
    modelRoot.position.sub(center.multiplyScalar(scale));

    const groundedBox = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y -= groundedBox.min.y;

    scene.add(modelRoot);

    floor.position.y = 0;

    const framedBox = new THREE.Box3().setFromObject(modelRoot);
    const framedCenter = framedBox.getCenter(new THREE.Vector3());
    const framedSize = framedBox.getSize(new THREE.Vector3());
    const distance =
      framedSize.length() / (2 * Math.tan((camera.fov * Math.PI) / 360));

    controls.target.copy(framedCenter);
    camera.position.set(
      framedCenter.x + distance * 0.35,
      framedCenter.y + distance * 0.25,
      framedCenter.z + distance
    );
    controls.update();

    flowEffect = setupFlowEffect({
      modelRoot,
      camera,
      domElement: renderer.domElement
    });

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(modelRoot);
      for (const clip of gltf.animations) {
        mixer.clipAction(clip).play();
      }
    }
  },
  undefined,
  (error) => {
    console.error("Failed to load gyy.glb", error);
  }
);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  if (flowEffect) {
    flowEffect.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
animate();
