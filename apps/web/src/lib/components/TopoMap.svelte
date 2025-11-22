<!-- src/lib/components/TopoMap.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { createNoise2D } from 'simplex-noise';
	import gsap from 'gsap';

	let el: HTMLDivElement;

	onMount(() => {
		// Scene
		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0xffffff, 85, 300);

		// Camera (fixed)
		const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
		camera.position.set(0, 30, 78);
		camera.lookAt(0, 0, 0);

		// Renderer
		const renderer = new THREE.WebGLRenderer({
			alpha: true,
			antialias: true,
			powerPreference: 'high-performance'
		});
		renderer.setPixelRatio(window.devicePixelRatio);
		el.appendChild(renderer.domElement);

		// Plane
		const size = 280;
		const segs = 90;
		const geo = new THREE.PlaneGeometry(size, size, segs, segs);
		geo.rotateX(-Math.PI / 2);

		// Invisible fill mesh
		const meshMat = new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0,
			depthWrite: false,
			depthTest: false
		});
		const plane = new THREE.Mesh(geo, meshMat);
		scene.add(plane);

		// Wireframe overlay
		let wireGeo = new THREE.WireframeGeometry(geo);
		const wireMat = new THREE.LineBasicMaterial({
			color: 0xc8c7c4,
			transparent: true,
			opacity: 0.55,
			depthTest: false,
			depthWrite: false
		});
		const wire = new THREE.LineSegments(wireGeo, wireMat);
		wire.position.y = 0.02;
		scene.add(wire);

		// Noise params
		const noise2D = createNoise2D();
		let amp = 0;
		const targetAmp = 3.8;

		// Broad hills
		const freqA = 0.022;
		const freqB = 0.006;

		// Valley profile (independent of noise)
		const valleyHeight = 25.0; // how high the left/right walls rise
		const valleyCurvePow = 1.6; // 1.2–2.0 = smooth bowl, higher = steeper walls

		function updateTerrain() {
			const pos = geo.attributes.position as THREE.BufferAttribute;
			const half = size / 2;

			for (let i = 0; i < pos.count; i++) {
				const x = pos.getX(i);
				const z = pos.getZ(i);

				// 0 at center -> 1 at left/right edges
				const nx = Math.abs(x) / half;

				// Smooth U-shaped bowl (cosine-based curve)
				// edgeProfile: 0 center, 1 edge, with curved slope
				const edgeProfile = Math.pow((1 - Math.cos(Math.PI * nx)) * 0.5, valleyCurvePow);
				const bowl = edgeProfile * valleyHeight;

				// Terrain noise on top of bowl
				const nA = noise2D(x * freqA, z * freqA);
				const nB = noise2D(x * freqB, z * freqB);
				const noise = (nA * 0.8 + nB * 0.2) * amp;

				const y = bowl + noise;
				pos.setY(i, y);
			}

			pos.needsUpdate = true;
			geo.computeVertexNormals();

			// sync wireframe
			wire.geometry.dispose();
			wireGeo.dispose();
			wireGeo = new THREE.WireframeGeometry(geo);
			wire.geometry = wireGeo;
		}
		// Rise once on load, then stay static
		gsap.to(
			{ a: 0 },
			{
				a: targetAmp,
				duration: 1.4,
				ease: 'power3.out',
				onUpdate() {
					amp = (this.targets() as any)[0].a;
					updateTerrain();
				}
			}
		);

		// Resize
		const resize = () => {
			const { width, height } = el.getBoundingClientRect();
			if (width === 0 || height === 0) return;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height, true);
		};
		resize();
		window.addEventListener('resize', resize);

		// Render loop (no movement)
		let raf = 0;
		const animate = () => {
			raf = requestAnimationFrame(animate);
			renderer.render(scene, camera);
		};
		animate();

		// Cleanup
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);

			wire.geometry.dispose();
			wireMat.dispose();
			meshMat.dispose();
			geo.dispose();
			renderer.dispose();

			el.removeChild(renderer.domElement);
		};
	});
</script>

<div bind:this={el} class="pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
