import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import { isMobile } from "react-device-detect";
import {
  Color,
  Object3D,
  InstancedMesh,
  AdditiveBlending,
  Vector3,
} from "three";
import { colorContrast } from "./Scene";
import {
  getSizeByAspect,
  minMaxNumber,
  pickRandom,
  pickRandomDecimalFromInterval,
  pickRandomIntFromInterval,
} from "./utils";

const bgCount = pickRandomIntFromInterval(100, 200);
const bgShape = pickRandom([0, 1]);

export function BgObjects({
  bgColor,
  secondaryColor,
  aspect,
}: {
  bgColor: string;
  secondaryColor: string;
  aspect: number;
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
        positionOffset: pickRandomDecimalFromInterval(2, 10),
        position: new Vector3(
          pickRandomDecimalFromInterval(-5, 5),
          pickRandomDecimalFromInterval(-5, 5),
          pickRandomDecimalFromInterval(-3, 0)
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
        getSizeByAspect(bgObjects[i].scale, aspect),
        getSizeByAspect(bgObjects[i].scale, aspect),
        getSizeByAspect(bgObjects[i].scale, aspect)
      );
      tempObject.updateMatrix();

      const id = i++;
      meshRef.current!.geometry.attributes.color.needsUpdate = true;
      meshRef.current!.setMatrixAt(id, tempObject.matrix);
    }

    meshRef.current!.instanceMatrix.needsUpdate = true;
  }, [tempObject, bgObjects, aspect]);

  useFrame((state) => {
    if (isMobile) {
      return;
    }

    let i = 0;

    for (let x = 0; x < bgObjects.length; x++) {
      tempObject.position.set(
        bgObjects[i].position.x + state.mouse.x / bgObjects[i].positionOffset,
        bgObjects[i].position.y +
          -(Math.PI / 2 + state.mouse.y / bgObjects[i].positionOffset),
        bgObjects[i].position.z
      );
      tempObject.scale.set(
        getSizeByAspect(bgObjects[i].scale, aspect),
        getSizeByAspect(bgObjects[i].scale, aspect),
        getSizeByAspect(bgObjects[i].scale, aspect)
      );
      tempObject.updateMatrix();

      const id = i++;
      meshRef.current!.geometry.attributes.color.needsUpdate = true;
      meshRef.current!.setMatrixAt(id, tempObject.matrix);
    }

    meshRef.current!.instanceMatrix.needsUpdate = true;
  });

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
        transparent
        opacity={
          bgShape === 0
            ? colorContrast > 5
              ? 0.02
              : 0.05
            : colorContrast > 3.5
            ? 0.1
            : 0.4
        }
        vertexColors
      />
    </instancedMesh>
  );
}
