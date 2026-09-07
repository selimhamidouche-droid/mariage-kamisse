// Material and lighting adjustments, shared by the generated scene bundle.
export function refineEnvelope(scene, envelope, renderer, keyLight, paper) {
  renderer.toneMappingExposure = 0.95;
  scene.environmentIntensity = 0.22;
  scene.traverse(light => {
    if (light.isHemisphereLight) light.intensity = 0.12;
  });
  keyLight.position.set(-1.6, 2.2, 4);
  keyLight.color.set('#fff7ec');
  keyLight.intensity = 2.7;
  keyLight.shadow.normalBias = 0.0004;
  keyLight.shadow.bias = -0.000025;
  const fill = keyLight.clone();
  fill.castShadow = false;
  fill.color.set('#dce7ff');
  fill.intensity = 0.12;
  fill.position.set(3, -0.5, 3);
  scene.add(fill);

  // A separate, finer bump layer keeps the paper colour soft and the grain small.
  const grain = paper.clone();
  // Non-repeating cotton fibres: no woven grid in either colour or relief.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  context.fillStyle = '#808080';
  context.fillRect(0, 0, 1024, 1024);
  let seed = 2718;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 75000; i++) {
    const x = random() * 1024, y = random() * 1024;
    const shade = 75 + Math.floor(random() * 105);
    context.strokeStyle = `rgba(${shade},${shade},${shade},0.35)`;
    context.lineWidth = 0.5 + random();
    context.beginPath();
    context.moveTo(x, y);
    const angle = random() * Math.PI * 2, length = 2 + random() * 9;
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  grain.image = canvas;
  grain.colorSpace = '';
  grain.repeat.set(1, 1);
  grain.needsUpdate = true;
  envelope.traverse(object => {
    if (!object.isMesh) return;
    object.material = object.material.clone();
    const material = object.material;
    if (object.name.startsWith('Envelope')) {
      material.map = null;
      material.color.set('#f4eedf');
      material.metalness = 0;
      material.roughness = 0.87;
      material.bumpMap = grain;
      material.bumpScale = 0.0014;
      material.envMapIntensity = 0.45;
    } else if (object.name === 'WaxSeal') {
      material.color.set('#740b20');
      material.metalness = 0.05;
      material.roughness = 0.23;
      material.envMapIntensity = 1.4;
      roundWaxRim(object);
    } else if (object.name.startsWith('GoldDetail')) {
      material.color.set('#d9b66c');
      material.metalness = 0.85;
      material.roughness = 0.28;
      material.envMapIntensity = 1.15;
      // Lower the embossed assembly with the wax, preserving the flap hinge.
      const positions = object.geometry.attributes.position;
      const normals = object.geometry.attributes.normal;
      for (let i = 0; i < positions.count; i++) {
        if (normals) {
          positions.setX(i, positions.getX(i) + normals.getX(i) * 0.00022);
          positions.setY(i, positions.getY(i) + normals.getY(i) * 0.00022);
        }
        positions.setZ(i, 0.031 + (positions.getZ(i) - 0.029) * 0.78);
      }
      positions.needsUpdate = true;
      object.geometry.computeVertexNormals();
      object.geometry.computeBoundingSphere();
    }
    material.needsUpdate = true;
  });
}

function roundWaxRim(mesh) {
  // Smooth cross-section of poured wax, keeping the reference's uneven outline.
  const profile = [[0,.050],[.075,.050],[.098,.051],[.106,.059],
    [.114,.067],[.125,.068],[.138,.057],[.148,.042],[.148,.033],[.130,.029],[0,.029]];
  const vertices = [], indices = [], sides = 192, steps = 6;
  const cubic = (a,b,c,d,t) => 0.5*((2*b)+(-a+c)*t+
    (2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  for (let j=0; j<= (profile.length-1)*steps; j++) {
    const segment = Math.min(profile.length-2, Math.floor(j/steps));
    const t = j/steps-segment;
    const a=profile[Math.max(0,segment-1)], b=profile[segment];
    const c=profile[segment+1], d=profile[Math.min(profile.length-1,segment+2)];
    const radius=Math.max(0,cubic(a[0],b[0],c[0],d[0],t));
    const z=0.031+(cubic(a[1],b[1],c[1],d[1],t)-0.029)*0.78;
    for(let i=0;i<sides;i++) {
      const angle=2*Math.PI*i/sides;
      const irregular=1+.028*Math.sin(3*angle+.6)+.018*Math.sin(5*angle-1)+.009*Math.cos(9*angle);
      vertices.push(radius*Math.cos(angle)*irregular,-.032+radius*Math.sin(angle)*irregular,z);
      if(j>0) {
        const k=(j-1)*sides+i, next=(j-1)*sides+(i+1)%sides;
        indices.push(k,next,next+sides,k,next+sides,k+sides);
      }
    }
  }
  const geometry=new mesh.geometry.constructor();
  const Attribute=mesh.geometry.attributes.position.constructor;
  geometry.setAttribute('position',new Attribute(new Float32Array(vertices),3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  mesh.geometry=geometry;
}

