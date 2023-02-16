import { useMemo, useRef, useEffect } from "react";
import {
  Color,
  Object3D,
  InstancedMesh,
  AdditiveBlending,
  Vector3,
} from "three";
import {
  getColorContrast,
  hexToRgb,
  pickRandom,
  pickRandomDecimalFromInterval,
  pickRandomIntFromInterval,
} from "./utils";

const bgCount = pickRandomIntFromInterval(100, 200);
const bgShape = pickRandom([0, 1]);

export function BgObjects({
  bgColor,
  secondaryColor,
}: {
  bgColor: string;
  secondaryColor: string;
}) {
  const bgObjects = useMemo(
    () =>
      new Array(bgCount).fill(null).map(() => ({
        color: pickRandom([
          ...new Array(5).fill(null).map(() => bgColor),
          secondaryColor,
        ]),
        shape: bgShape,
        scale: pickRandomDecimalFromInterval(0.2, 0.8),
        position: new Vector3(
          pickRandomDecimalFromInterval(-5, 5),
          pickRandomDecimalFromInterval(-5, 5),
          0
        ),
      })),
    [bgColor, secondaryColor]
  );

  const tempColor = useMemo(() => new Color(), []);
  const tempObject = useMemo(() => new Object3D(), []);
  const meshRef = useRef<InstancedMesh>();
  const colorArray = useMemo(
    () =>
      Float32Array.from(
        new Array(bgObjects.length)
          .fill(null)
          .flatMap((o, i) => tempColor.set(bgObjects[i].color).toArray())
      ),
    [bgObjects, tempColor]
  );

  useEffect(() => {
    let i = 0;

    for (let x = 0; x < bgObjects.length; x++) {
      tempObject.position.set(
        bgObjects[i].position.x,
        bgObjects[i].position.y,
        bgObjects[i].position.z
      );
      tempObject.scale.set(
        bgObjects[i].scale,
        bgObjects[i].scale,
        bgObjects[i].scale
      );
      tempObject.updateMatrix();

      const id = i++;
      meshRef.current!.geometry.attributes.color.needsUpdate = true;
      meshRef.current!.setMatrixAt(id, tempObject.matrix);
    }

    meshRef.current!.instanceMatrix.needsUpdate = true;
  }, [tempObject, bgObjects]);

  const colorContrast = useMemo(
    () => getColorContrast(hexToRgb(bgColor), hexToRgb(secondaryColor)),
    [bgColor, secondaryColor]
  );

  console.log(colorContrast);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, bgObjects.length]}
    >
      {bgShape === 0 ? (
        <circleBufferGeometry args={[1, 64]} attach="geometry">
          <instancedBufferAttribute
            attachObject={["attributes", "color"]}
            args={[colorArray, 3]}
          />
        </circleBufferGeometry>
      ) : (
        <ringBufferGeometry args={[0.99, 1, 64]} attach="geometry">
          <instancedBufferAttribute
            attachObject={["attributes", "color"]}
            args={[colorArray, 3]}
          />
        </ringBufferGeometry>
      )}
      <meshStandardMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        opacity={
          bgShape === 0
            ? colorContrast > 5
              ? 0.02
              : 0.05
            : colorContrast > 3.5
            ? 0.05
            : 0.3
        }
        vertexColors
      />
    </instancedMesh>
  );
}
