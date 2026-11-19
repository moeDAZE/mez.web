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
const RIBBON_TURNS = 1.35
const SNOW_FLOOR = -6
const SNOW_SPAN = 22
const BASE_DISTANCE = 17
const FIT_HALF_WIDTH = 4.6

const SILVERS = ['#c5ccd6', '#d5dbe3', '#e7edf4', '#f4f7fb', '#ffffff']
const STAR_OUTER = 0.72
const STAR_INNER = 0.3

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
  const layers = 8
  const branchesPerLayer = 8

  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    let x = 0
    let y = 0
    let z = 0

    if (roll < 0.04) {
      const h = Math.random()
      y = -TREE_HEIGHT / 2 + h * TREE_HEIGHT * 0.96
      const trunk = 0.05 + Math.random() * 0.04
      const angle = Math.random() * Math.PI * 2
      x = Math.cos(angle) * trunk
      z = Math.sin(angle) * trunk
    } else if (roll < 0.46) {
      const h = Math.pow(Math.random(), 0.9)
      const profile = TREE_RADIUS * Math.pow(1 - h, 0.7)
      const radius = profile * Math.sqrt(Math.random()) * 0.82
      const angle = Math.random() * Math.PI * 2
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = -TREE_HEIGHT / 2 + h * TREE_HEIGHT * 0.94 - radius * 0.12
    } else {
      const layer = Math.min(layers - 1, Math.floor(Math.pow(Math.random(), 0.85) * layers))
      const layerT = layer / (layers - 1)
      const yBase = -TREE_HEIGHT / 2 + Math.pow(layerT, 0.92) * TREE_HEIGHT * 0.94
      const reach = TREE_RADIUS * Math.pow(1 - layerT, 0.7)
      const branch = Math.floor(Math.random() * branchesPerLayer)
      const branchAngle = (branch / branchesPerLayer) * Math.PI * 2 + layer * 0.5
      const along = Math.pow(Math.random(), 0.8)
      const radius = reach * (0.15 + 0.85 * along)
      const thickness = reach * (0.05 + 0.2 * along) * Math.sqrt(Math.random())
      const side = Math.random() * Math.PI * 2
      const angle = branchAngle + (Math.cos(side) * thickness) / Math.max(radius, 0.2)
      const droop = along * along * (0.42 + 0.22 * (1 - layerT))
      x = Math.cos(angle) * radius
      z = Math.sin(angle) * radius
      y = yBase - droop + Math.sin(side) * thickness * 0.65
    }

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    randomScatter(scatter, i)
    phases[i] = Math.random()

    const ornament = Math.random() < 0.07
    setColor(colors, i, pick(SILVERS), ornament ? 0.75 : 0.62)
    sizes[i] = ornament ? 2.2 + Math.random() * 1.4 : 0.65 + Math.random() * 0.85
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
    { offset: 0, color: '#f7f8fb' },
    { offset: (Math.PI * 2) / 3, color: '#e7edf4' },
    { offset: (Math.PI * 4) / 3, color: '#d5dbe3' },
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
      setColor(colors, i, ribbon.color, 0.7)
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

function starCorners() {
  const corners: Array<THREE.Vector2> = []
  for (let k = 0; k < 10; k++) {
    const angle = (k / 10) * Math.PI * 2 + Math.PI / 2
    const radius = k % 2 === 0 ? STAR_OUTER : STAR_INNER
    corners.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius))
  }
  return corners
}

function pointsFromPositions(
  positions: Float32Array,
  color: string,
  boost: number,
  size: number,
) {
  const count = positions.length / 3
  const scatter = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    randomScatter(scatter, i)
    setColor(colors, i, color, boost)
    sizes[i] = size * (0.85 + Math.random() * 0.3)
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

function buildStarOutlineGeometry(count: number) {
  const corners = starCorners()
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const edge = i % corners.length
    const t = (Math.floor(i / corners.length) + Math.random()) / Math.ceil(count / corners.length)
    const a = corners[edge]
    const b = corners[(edge + 1) % corners.length]
    const tangent = b.clone().sub(a)
    const normal = new THREE.Vector2(-tangent.y, tangent.x).normalize()
    const offset = (Math.random() - 0.5) * 0.035
    positions[i * 3] = a.x + (b.x - a.x) * t + normal.x * offset
    positions[i * 3 + 1] = a.y + (b.y - a.y) * t + normal.y * offset
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.02
  }
  return pointsFromPositions(positions, '#d5dbe3', 0.42, 1.1)
}

function sampleText(text: string) {
  const width = 640
  const height = 280
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 210px "Times New Roman", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)
  const pixels = ctx.getImageData(0, 0, width, height).data
  const hits: Array<THREE.Vector2> = []
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (pixels[(y * width + x) * 4 + 3] > 140) {
        hits.push(new THREE.Vector2(x / width - 0.5, 0.5 - y / height))
      }
    }
  }
  return hits
}

function buildLetterGeometry(count: number) {
  const hits = sampleText('UU')
  const positions = new Float32Array(count * 3)
  const width = 0.6
  const height = 0.38
  for (let i = 0; i < count; i++) {
    const hit = hits.length > 0 ? hits[Math.floor(Math.random() * hits.length)] : new THREE.Vector2()
    positions[i * 3] = hit.x * width + (Math.random() - 0.5) * 0.008
    positions[i * 3 + 1] = hit.y * height + (Math.random() - 0.5) * 0.008
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.015
  }
  return pointsFromPositions(positions, '#ffffff', 0.48, 0.7)
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
    setColor(colors, i, inRing ? '#d5dbe3' : '#e8eef5', inRing ? 0.7 : 0.5)
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

  const starGroup = new THREE.Group()
  starGroup.position.y = TREE_HEIGHT / 2 + 0.72
  treeGroup.add(starGroup)

  const starMaterial = createPointsMaterial(treeVertexShader, {
    ...shared,
    uSize: { value: 28 },
  })
  const letterMaterial = createPointsMaterial(treeVertexShader, {
    ...shared,
    uSize: { value: 14 },
  })
  const star = new THREE.Points(buildStarOutlineGeometry(Math.floor(900 * scale)), starMaterial)
  const letters = new THREE.Points(buildLetterGeometry(Math.floor(1800 * scale)), letterMaterial)
  starGroup.add(star, letters)

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
      for (const points of [tree, ribbons, star, letters, ground, snow]) {
        points.geometry.dispose()
      }
      starMaterial.dispose()
      letterMaterial.dispose()
      for (const points of [tree, ribbons, ground, snow]) {
        ;(points.material as THREE.Material).dispose()
      }
      bloom.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
