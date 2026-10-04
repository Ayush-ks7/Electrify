import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { BoxGeometry, ConeGeometry, MeshStandardMaterial } from "three";
import type { ViewProps } from "./Locality";
const box = new BoxGeometry(1, 1, 1);
const roof = new ConeGeometry(1.2, 0.65, 4);
const walls = new MeshStandardMaterial({ color: "#f4f5f1", roughness: 0.85 });
const roofMaterial = new MeshStandardMaterial({
  color: "#7b96b0",
  roughness: 0.8,
});
const selectedMaterial = new MeshStandardMaterial({ color: "#387dcc" });
const reviewMaterial = new MeshStandardMaterial({ color: "#d7a049" });
const transformerMaterial = new MeshStandardMaterial({ color: "#0f52ba" });
const groundMaterial = new MeshStandardMaterial({ color: "#e5edeb" });
const roadMaterial = new MeshStandardMaterial({ color: "#d2dce4" });
const doorMaterial = new MeshStandardMaterial({ color: "#59809e" });
function FitCamera() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const factor = Math.max(1, 1.8 / (size.width / size.height));
    camera.position.set(17 * factor, 20 * factor, 22 * factor);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}
export default function Scene({ data, selected, onSelect }: ViewProps) {
  // Html's portal type assumes a mounted element; this sibling mounts before Canvas.
  const overlay = useRef<HTMLDivElement>(null!);
  const [hover, setHover] = useState<string | null>(null);
  const nodes = useMemo(
    () =>
      data.transformers.flatMap((t, ti) =>
        t.consumers.map((id, i) => ({
          id,
          transformer: t.id,
          x: ti * 14 - 7 + ((i % 5) - 2) * 2.2,
          z: i < 5 ? -3.3 : 3.3,
        })),
      ),
    [data.transformers],
  );
  const active = hover ?? selected;
  const isConnected = (id: string, t: string) => active === id || active === t;
  return (
    <>
      <div ref={overlay} className="scene-overlay" />
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [17, 20, 22], fov: 42 }}
        fallback={
          <div className="scene-fallback">
            WebGL is unavailable. Select 2D Graph or use the node list.
          </div>
        }
        aria-label="Interactive 3D locality"
      >
        <color attach="background" args={["#f2f6fa"]} />
        <ambientLight intensity={1.7} />
        <directionalLight position={[10, 20, 8]} intensity={2.2} />
        <mesh
          geometry={box}
          material={groundMaterial}
          position={[0, -0.3, 0]}
          scale={[30, 0.4, 13]}
        />
        <mesh
          geometry={box}
          material={roadMaterial}
          position={[0, -0.07, 0]}
          scale={[30, 0.06, 2]}
        />
        <mesh
          geometry={box}
          material={roadMaterial}
          position={[0, -0.06, 0]}
          scale={[1.5, 0.07, 13]}
        />
        {data.transformers.map((t, ti) => {
          const x = ti * 14 - 7;
          const highlight =
            active === t.id ||
            nodes.some((n) => n.id === active && n.transformer === t.id);
          return (
            <group
              key={t.id}
              position={[x, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(t.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(t.id);
              }}
              onPointerOut={() => setHover(null)}
            >
              <mesh
                geometry={box}
                material={highlight ? selectedMaterial : transformerMaterial}
                position={[0, 0.7, 0]}
                scale={[1, 1.3, 0.8]}
              />
              <mesh
                geometry={box}
                material={doorMaterial}
                position={[0, 1.45, 0]}
                scale={[1.25, 0.15, 1]}
              />
              <Html portal={overlay} center position={[0, 2.05, 0]}>
                <button
                  className={`scene-label ${highlight ? "selected" : ""}`}
                  style={{ pointerEvents: "auto" }}
                  aria-label={`Inspect transformer ${t.id}`}
                  onMouseEnter={() => setHover(t.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelect(t.id)}
                >
                  {t.id} · Transformer
                </button>
              </Html>
            </group>
          );
        })}
        {nodes.map((n) => {
          const tIndex = data.transformers.findIndex(
            (t) => t.id === n.transformer,
          );
          const highlight = isConnected(n.id, n.transformer);
          const review = data.consumers.find((c) => c.id === n.id)
            ?.investigation?.requires_review;
          return (
            <group key={n.id}>
              <Line
                points={[
                  [tIndex * 14 - 7, 0.08, 0],
                  [n.x, 0.08, 0],
                  [n.x, 0.08, n.z],
                ]}
                color={highlight ? "#0f52ba" : "#a7becb"}
                lineWidth={highlight ? 2 : 1}
              />
              <group
                position={[n.x, 0, n.z]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHover(n.id);
                }}
                onPointerOut={() => setHover(null)}
              >
                <mesh
                  geometry={box}
                  material={walls}
                  position={[0, 0.55, 0]}
                  scale={[1.4, 1.1, 1.25]}
                />
                <mesh
                  geometry={roof}
                  material={
                    highlight
                      ? selectedMaterial
                      : review
                        ? reviewMaterial
                        : roofMaterial
                  }
                  rotation={[0, Math.PI / 4, 0]}
                  position={[0, 1.42, 0]}
                />
                <mesh
                  geometry={box}
                  material={doorMaterial}
                  position={[0, 0.35, 0.635]}
                  scale={[0.32, 0.7, 0.03]}
                />
                <Html portal={overlay} center position={[0, 2.05, 0]}>
                  <button
                    className={`scene-label ${highlight ? "selected" : ""}`}
                    style={{ pointerEvents: "auto" }}
                    aria-label={`Inspect consumer ${n.id}`}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSelect(n.id)}
                  >
                    {n.id}
                  </button>
                </Html>
              </group>
            </group>
          );
        })}
        <FitCamera />
        <OrbitControls
          makeDefault
          enableDamping={false}
          minDistance={10}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.15}
        />
      </Canvas>
    </>
  );
}
