import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

import {
  pointFragmentShader,
  ribbonVertexShader,
  snowVertexShader,
  treeVertexShader,
} from './shaders'

export interface ChristmasTreeController {
  explode: () => void
  setSnow: (enabled: boolean) => void
  setAutoRotate: (enabled: boolean) => void
  dispose: () => void
}

const TREE_HEIGHT = 8
const TREE_RADIUS = 3.2
const RIBBON_TURNS = 4.5
const SNOW_FLOOR = -6
const SNOW_SPAN = 22
const BASE_DISTANCE = 17
const FIT_HALF_WIDTH = 4.6

const GREENS = ['#0f9d58', '#16c172', '#2ee59d', '#0b7a4b', '#7cf5b8']
const ORNAMENTS = ['#ff3b5c', '#ffd166', '#ff8fab', '#5ec8ff', '#fff4d6']

function randomScatter(target: Float32Array, i: number) {
  const r = 7 + Math.random() * 9
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  target[i * 3] = r * Math.sin(phi) * Math.cos(theta)
  target[i * 3 + 1] = r * Math.cos(phi)
  target[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
}

function setColor(target: Float32Array, i: number, hex: string, boost = 1) {
  const c = new THREE.Color(hex)
  target[i * 3] = c.r * boost
  target[i * 3 + 1] = c.g * boost
  target[i * 3 + 2] = c.b * boost
}

function pick<T>(list: Array<T>) {
  return list[Math.floor(Math.random() * list.length)]
}

function createPointsMaterial(
  vertexShader: string,
  uniforms: Record<string, THREE.IUniform>,
) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: pointFragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

function buildTreeGeometry(count: number) {
  const positions = new Float32Array(count * 3)
  const scatter = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const arms = 9

  for (let i = 0; i < count; i++) {
    const h = 1 - Math.sqrt(Math.random()) * 0.98
    const y = -TREE_HEIGHT / 2 + h * TREE_HEIGHT
    const layerRadius = TREE_RADIUS * (1 - h)
    const onArm = Math.random() < 0.7
    const arm = Math.floor(Math.random() * arms)
    const angle = onArm
      ? (arm / arms) * Math.PI * 2 + h * Math.PI * 6 + (Math.random() - 0.5) * 0.35
      : Math.random() * Math.PI * 2
    const radius = onArm
      ? layerRadius * (0.55 + 0.45 * Math.random())
      : layerRadius * Math.sqrt(Math.random())
    const droop = (radius / TREE_RADIUS) * 0.35

    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = y - droop + (Math.random() - 0.5) * 0.15
    positions[i * 3 + 2] = Math.sin(angle) * radius
    randomScatter(scatter, i)
    phases[i] = Math.random()

    const roll = Math.random()
    if (roll < 0.08) {
      setColor(colors, i, pick(ORNAMENTS), 1.1)
      sizes[i] = 2.4 + Math.random() * 2
    } else if (roll < 0.12) {
      setColor(colors, i, '#ffffff', 0.8)
      sizes[i] = 1.2 + Math.random()
    } else {
      setColor(colors, i, pick(GREENS), 0.7)
      sizes[i] = 0.7 + Math.random() * 0.9
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  return geometry
}

function buildRibbonGeometry(countPerRibbon: number) {
  const ribbons = [
    { offset: 0, color: '#ffd166' },
    { offset: Math.PI, color: '#ff6b8b' },
  ]
  const count = countPerRibbon * ribbons.length
  const positions = new Float32Array(count * 3)
  const scatter = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const offsets = new Float32Array(count)
  const jitter = new Float32Array(count * 3)

  ribbons.forEach((ribbon, r) => {
    for (let j = 0; j < countPerRibbon; j++) {
      const i = r * countPerRibbon + j
      phases[i] = j / countPerRibbon
      offsets[i] = ribbon.offset
      jitter[i * 3] = (Math.random() - 0.5) * 0.12
      jitter[i * 3 + 1] = (Math.random() - 0.5) * 0.12
      jitter[i * 3 + 2] = (Math.random() - 0.5) * 0.12
      randomScatter(scatter, i)
      setColor(colors, i, ribbon.color, 0.9)
      sizes[i] = 1.1 + Math.random() * 0.8
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
  geometry.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 3))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20)
  return geometry
}

function buildStarGeometry(count: number) {
  const outer = 0.65
  const inner = 0.27
  const corners: Array<THREE.Vector2> = []
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2
    const r = k % 2 === 0 ? outer : inner
    corners.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r))
  }

  const positions = new Float32Array(count * 3)
  const scatter = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const k = Math.floor(Math.random() * 10)
    const a = corners[k]
    const b = corners[(k + 1) % 10]
    let u = Math.random()
    let v = Math.random()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }
    positions[i * 3] = a.x * u + b.x * v
    positions[i * 3 + 1] = a.y * u + b.y * v
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.12
    randomScatter(scatter, i)
    setColor(colors, i, Math.random() < 0.8 ? '#ffd166' : '#fff6d5', 1.1)
    sizes[i] = 1.2 + Math.random() * 1.2
    phases[i] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  return geometry
}

function buildGroundGeometry(count: number) {
  const positions = new Float32Array(count * 3)
  const scatter = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const inRing = Math.random() < 0.55
    const radius = inRing
      ? TREE_RADIUS + 0.4 + Math.random() * 0.6
      : 1 + Math.pow(Math.random(), 0.6) * 10
    const angle = Math.random() * Math.PI * 2
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = -TREE_HEIGHT / 2 - 0.45 + (Math.random() - 0.5) * 0.05
    positions[i * 3 + 2] = Math.sin(angle) * radius
    randomScatter(scatter, i)
    setColor(colors, i, inRing ? '#ffd166' : pick(['#5ec8ff', '#a78bfa', '#ffffff']), inRing ? 1 : 0.6)
    sizes[i] = inRing ? 0.9 + Math.random() * 0.6 : 0.5 + Math.random() * 0.8
    phases[i] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  return geometry
}

function buildSnowGeometry(count: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 32
    positions[i * 3 + 1] = SNOW_FLOOR + Math.random() * SNOW_SPAN
    positions[i * 3 + 2] = (Math.random() - 0.5) * 32
    setColor(colors, i, '#e8f4ff', 0.5)
    sizes[i] = 0.6 + Math.random() * 1.4
    phases[i] = Math.random()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)
  return geometry
}

export function createChristmasTree(
  container: HTMLElement,
): ChristmasTreeController {
  const isCompact =
    window.matchMedia('(max-width: 768px)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  const scale = isCompact ? 0.65 : 1
  const haloSize = isCompact ? 2 : 3
  const pixelRatio = Math.min(window.devicePixelRatio, 2)

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
  renderer.setPixelRatio(pixelRatio)
  // EffectComposer render targets visibly lift non-black clear colors.
  renderer.setClearColor('#000000')
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.touchAction = 'none'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(0, 3, BASE_DISTANCE)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.6, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.autoRotate = false
  controls.autoRotateSpeed = 0.9
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.panSpeed = 1
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  }
  controls.minDistance = 6
  controls.maxDistance = 40
  controls.maxPolarAngle = Math.PI * 0.62

  const shared = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uExplode: { value: 0 },
  }

  const treeGroup = new THREE.Group()
  scene.add(treeGroup)

  const treeMaterial = createPointsMaterial(treeVertexShader, {
    ...shared,
    uSize: { value: 30 },
  })
  const tree = new THREE.Points(buildTreeGeometry(Math.floor(16000 * scale)), treeMaterial)
  treeGroup.add(tree)

  const ribbonMaterial = createPointsMaterial(ribbonVertexShader, {
    ...shared,
    uSize: { value: 38 },
    uHeight: { value: TREE_HEIGHT },
    uRadius: { value: TREE_RADIUS + 0.15 },
    uTurns: { value: RIBBON_TURNS },
  })
  const ribbons = new THREE.Points(buildRibbonGeometry(Math.floor(1400 * scale)), ribbonMaterial)
  treeGroup.add(ribbons)

  const starMaterial = createPointsMaterial(treeVertexShader, {
    ...shared,
    uSize: { value: 40 },
  })
  const star = new THREE.Points(buildStarGeometry(Math.floor(1200 * scale)), starMaterial)
  star.position.y = TREE_HEIGHT / 2 + 0.55
  treeGroup.add(star)

  const haloMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: '#ffcf66',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const halo = new THREE.Sprite(haloMaterial)
  halo.scale.setScalar(haloSize)
  halo.position.y = star.position.y
  treeGroup.add(halo)

  const groundMaterial = createPointsMaterial(treeVertexShader, {
    ...shared,
    uSize: { value: 32 },
  })
  const ground = new THREE.Points(buildGroundGeometry(Math.floor(3500 * scale)), groundMaterial)
  scene.add(ground)

  const snowOpacity = { value: 1 }
  const snowMaterial = createPointsMaterial(snowVertexShader, {
    uTime: shared.uTime,
    uPixelRatio: shared.uPixelRatio,
    uSize: { value: 30 },
    uOpacity: snowOpacity,
    uFloor: { value: SNOW_FLOOR },
    uSpan: { value: SNOW_SPAN },
  })
  const snow = new THREE.Points(buildSnowGeometry(Math.floor(1800 * scale)), snowMaterial)
  scene.add(snow)

  const composer = new EffectComposer(renderer)
  composer.setPixelRatio(pixelRatio)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.2, 0.55)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  let userZoomed = false
  let fittedDistance = BASE_DISTANCE
  const fitCamera = () => {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    const widthFit = FIT_HALF_WIDTH / (Math.tan(halfFov) * camera.aspect)
    fittedDistance = Math.min(Math.max(BASE_DISTANCE, widthFit), controls.maxDistance)
    camera.position
      .sub(controls.target)
      .setLength(fittedDistance)
      .add(controls.target)
  }

  const resize = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (!userZoomed) fitCamera()
    renderer.setSize(width, height)
    composer.setSize(width, height)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  resize()

  let autoRotateEnabled = false
  let resumeTimer: ReturnType<typeof setTimeout> | undefined
  const onControlStart = () => {
    controls.autoRotate = false
    clearTimeout(resumeTimer)
  }
  const onControlEnd = () => {
    if (Math.abs(camera.position.distanceTo(controls.target) - fittedDistance) > 0.05) {
      userZoomed = true
    }
    clearTimeout(resumeTimer)
    if (autoRotateEnabled) {
      resumeTimer = setTimeout(() => {
        controls.autoRotate = true
      }, 2500)
    }
  }
  controls.addEventListener('start', onControlStart)
  controls.addEventListener('end', onControlEnd)

  let explodeTarget = 0
  let explodeTimer: ReturnType<typeof setTimeout> | undefined
  const explode = () => {
    explodeTarget = 1
    clearTimeout(explodeTimer)
    explodeTimer = setTimeout(() => {
      explodeTarget = 0
    }, 1400)
  }

  const downAt = new THREE.Vector2()
  const activePointers = new Set<number>()
  let gesturePointerCount = 0
  const onPointerDown = (e: PointerEvent) => {
    activePointers.add(e.pointerId)
    gesturePointerCount = Math.max(gesturePointerCount, activePointers.size)
    downAt.set(e.clientX, e.clientY)
  }
  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId)
    const isTap =
      gesturePointerCount === 1 &&
      downAt.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 8
    if (activePointers.size === 0) gesturePointerCount = 0
    if (isTap) explode()
  }
  const onPointerCancel = (e: PointerEvent) => {
    activePointers.delete(e.pointerId)
    if (activePointers.size === 0) gesturePointerCount = 0
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerCancel)

  let snowTarget = 1
  const timer = new THREE.Timer()
  timer.connect(document)
  let frame = 0

  const tick = (timestamp: number) => {
    timer.update(timestamp)
    const delta = Math.min(timer.getDelta(), 0.05)
    const elapsed = timer.getElapsed()
    shared.uTime.value = elapsed

    const ease = explodeTarget > shared.uExplode.value ? 5 : 1.8
    shared.uExplode.value += (explodeTarget - shared.uExplode.value) * Math.min(1, delta * ease)
    snowOpacity.value += (snowTarget - snowOpacity.value) * Math.min(1, delta * 3)
    snow.visible = snowOpacity.value > 0.01

    star.rotation.y = elapsed * 0.8
    const pulse = 1 + Math.sin(elapsed * 2.4) * 0.15
    halo.scale.setScalar(haloSize * pulse * (1 - shared.uExplode.value * 0.7))
    ground.rotation.y = -elapsed * 0.05

    controls.update()
    composer.render()
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)

  return {
    explode,
    setSnow: (enabled) => {
      snowTarget = enabled ? 1 : 0
    },
    setAutoRotate: (enabled) => {
      autoRotateEnabled = enabled
      controls.autoRotate = enabled
    },
    dispose: () => {
      cancelAnimationFrame(frame)
      timer.dispose()
      clearTimeout(resumeTimer)
      clearTimeout(explodeTimer)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel)
      controls.removeEventListener('start', onControlStart)
      controls.removeEventListener('end', onControlEnd)
      controls.dispose()
      for (const points of [tree, ribbons, star, ground, snow]) {
        points.geometry.dispose()
        ;(points.material as THREE.Material).dispose()
      }
      haloMaterial.map?.dispose()
      haloMaterial.dispose()
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}

function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.2, 'rgba(255,220,140,0.6)')
  gradient.addColorStop(1, 'rgba(255,200,100,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}
