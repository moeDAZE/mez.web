const sharedVaryings = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
`

const pointSize = /* glsl */ `
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.6 + aPhase * 12.0);
  gl_PointSize = min(uSize * aSize * uPixelRatio * twinkle / -mvPosition.z, 8.0 * uPixelRatio);
  vColor = aColor;
`

export const treeVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uExplode;
  attribute vec3 aScatter;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  ${sharedVaryings}

  void main() {
    float e = uExplode * (0.75 + 0.25 * sin(aPhase * 7.0));
    vec3 p = mix(position, aScatter, e);
    p.x += sin(uTime * 0.9 + aPhase * 6.0) * 0.02;
    p.z += cos(uTime * 0.7 + aPhase * 6.0) * 0.02;
    ${pointSize}
    vAlpha = 0.45 + 0.55 * twinkle;
  }
`

export const ribbonVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uExplode;
  uniform float uHeight;
  uniform float uRadius;
  uniform float uTurns;
  attribute vec3 aScatter;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aOffset;
  attribute vec3 aJitter;
  ${sharedVaryings}

  void main() {
    float s = fract(aPhase + uTime * 0.00175);
    float y = -uHeight * 0.5 + s * uHeight;
    float r = uRadius * (1.0 - s) + 0.35;
    float angle = s * uTurns * 6.2831853 + aOffset;
    vec3 spiral = vec3(cos(angle) * r, y, sin(angle) * r) + aJitter;
    vec3 p = mix(spiral, aScatter, uExplode);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float spark = fract(sin(aPhase * 127.1 + dot(aJitter.xz, vec2(311.7, 74.7))) * 43758.5453);
    float wave = sin(uTime * (0.7 + spark * 2.4) + spark * 6.2831853);
    float twinkle = pow(clamp(0.5 + 0.5 * wave, 0.0, 1.0), 5.0);
    gl_PointSize = min(uSize * aSize * uPixelRatio * (0.3 + twinkle) / -mvPosition.z, 8.0 * uPixelRatio);
    vColor = aColor;
    vAlpha = (0.12 + 0.88 * twinkle) * smoothstep(0.0, 0.06, s) * smoothstep(1.0, 0.94, s);
  }
`

export const snowVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uOpacity;
  uniform float uFloor;
  uniform float uSpan;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  ${sharedVaryings}

  void main() {
    vec3 p = position;
    float speed = 0.35 + fract(aPhase * 3.7) * 0.6;
    p.y = uFloor + mod(position.y - uFloor - uTime * speed, uSpan);
    p.x += sin(uTime * 0.6 + aPhase * 20.0) * 0.4;
    p.z += cos(uTime * 0.5 + aPhase * 15.0) * 0.4;
    ${pointSize}
    vAlpha = uOpacity * (0.5 + 0.5 * twinkle);
  }
`

export const pointFragmentShader = /* glsl */ `
  ${sharedVaryings}

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float strength = pow(clamp(1.0 - d * 2.0, 0.0, 1.0), 3.2);
    gl_FragColor = vec4(vColor, strength * vAlpha);
  }
`
