// Gradient sky dome with sun disc, moon and stars.
import * as THREE from 'three';

export function buildSky(scene) {
  const uniforms = {
    uTop: { value: new THREE.Color('#3f8fe0') }, uHorizon: { value: new THREE.Color('#bfe6ff') },
    uBottom: { value: new THREE.Color('#bfe6ff') },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, -0.5).normalize() }, uSunColor: { value: new THREE.Color('#fff4d6') },
    uSunSize: { value: 0.035 }, uSunI: { value: 1.0 },
    uMoonDir: { value: new THREE.Vector3(-0.3, 0.6, -0.7).normalize() }, uMoon: { value: 0 },
    uStars: { value: 0 }, uTime: { value: 0 }, uBlack: { value: 0 },
  };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww * vec4(1,1,0.9999,1); }',
    fragmentShader: `
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor, uMoonDir; uniform float uSunSize, uSunI, uMoon, uStars, uTime, uBlack;
      varying vec3 vDir;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 c = y > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, y), 0.8)) : mix(uHorizon, uBottom, smoothstep(0.0, -0.1, y));
        float sd = dot(d, normalize(uSunDir));
        c += uSunColor * uSunI * (smoothstep(1.0 - uSunSize * 0.02, 1.0 - uSunSize * 0.015, sd) * 3.0 + pow(max(sd, 0.0), 60.0) * 0.6 + pow(max(sd, 0.0), 8.0) * 0.15);
        if (uStars > 0.0) {
          vec3 g = floor(d * 260.0); float s = h3(g);
          float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 40.0);
          c += vec3(1.0) * step(0.9965, s) * tw * uStars * smoothstep(-0.05, 0.2, y);
        }
        if (uMoon > 0.0) {
          float md = dot(d, normalize(uMoonDir));
          c += vec3(0.95, 0.97, 1.0) * uMoon * (smoothstep(0.9994, 0.9996, md) * 1.6 + pow(max(md, 0.0), 300.0) * 0.4);
        }
        c = mix(c, vec3(0.0), uBlack);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  mesh.renderOrder = -10; mesh.frustumCulled = false; scene.add(mesh);
  return { mesh, uniforms };
}
