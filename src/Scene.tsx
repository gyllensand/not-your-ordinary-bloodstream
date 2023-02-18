import {
  OrbitControls,
  QuadraticBezierLine,
  MeshWobbleMaterial,
  Float,
  useTexture,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { a, useSpring, useSprings } from "@react-spring/three";
import { RefObject, useCallback, useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  RepeatWrapping,
  RingBufferGeometry,
  RingGeometry,
  Texture,
  Vector3,
} from "three";
import { isMobile } from "react-device-detect";
import {
  getColorContrast,
  getSizeByAspect,
  getSizeByWidthAspect,
  hexToRgb,
  pickRandom,
  pickRandomColorWithTheme,
  pickRandomDecimalFromInterval,
  pickRandomIntFromInterval,
} from "./utils";
import {
  COLORS,
  BG_COLORS,
  STRIPE_COLORS,
  getBgPlaneParams,
} from "./constants";
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { start } from "tone";
import { BgObjects } from "./BgObjects";
import { SpringValue } from "react-spring";

const instrument = pickRandom([0, 1, 1]);
const pitch = pickRandom(["C#-1", "D-1"]);
const bgColor = pickRandom(BG_COLORS);
const primaryColor = pickRandom(COLORS);
const secondaryColor = pickRandom(STRIPE_COLORS);
export const colorContrast = getColorContrast(
  hexToRgb(bgColor),
  hexToRgb(secondaryColor)
);
const hasbgPlane = pickRandom([
  ...new Array(8).fill(null).map(() => false),
  true,
]);
const bgPlaneType = pickRandom([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const bgPlaneParams = getBgPlaneParams(bgPlaneType);
const hasMetalness = pickRandom([
  ...new Array(28).fill(null).map(() => 0),
  1,
  2,
]);

const texturePattern = pickRandom([0, 1]);
const hasTexturePattern = pickRandom([
  ...new Array(4).fill(null).map(() => false),
  true,
]);
const hasLines = pickRandom([false, false, false, true]);

interface ShapeParam {
  x: number;
  y: number;
  radius: number;
  bbox: {
    x: number[];
    y: number[];
  };
}

const shapeCount = pickRandomIntFromInterval(5, 10);
const shapeParameters = new Array(shapeCount)
  .fill(null)
  .reduce<ShapeParam[]>((array, current, index) => {
    if (index === 0) {
      const currentRadius = pickRandomDecimalFromInterval(3, 5);
      const x = pickRandomDecimalFromInterval(-4, 4);
      const y = pickRandomDecimalFromInterval(-4, 4);

      array = [
        {
          x,
          y,
          radius: currentRadius,
          bbox: {
            x: [x - currentRadius, x + currentRadius],
            y: [y - currentRadius, y + currentRadius],
          },
        },
      ];

      return array;
    }
    let i = 0;
    let doneIterating = false;
    let needsExtra = false;
    let item = {} as ShapeParam;

    while (!doneIterating) {
      const currentRadius = needsExtra
        ? pickRandomDecimalFromInterval(0.5, 0.5)
        : pickRandom([
            pickRandomDecimalFromInterval(0.5, 5),
            pickRandomDecimalFromInterval(1, 5),
          ]);
      const x = pickRandomDecimalFromInterval(-4, 4);
      const y = pickRandomDecimalFromInterval(-4, 4);

      const bbox = {
        x: [x - currentRadius, x + currentRadius],
        y: [y - currentRadius, y + currentRadius],
      };

      const foundSpace = array.every(
        (o, i) =>
          (bbox.x[0] < o.bbox.x[0] &&
            bbox.x[1] < o.bbox.x[0] &&
            bbox.x[0] < o.bbox.x[1] &&
            bbox.x[1] < o.bbox.x[1]) ||
          (bbox.x[0] > o.bbox.x[0] &&
            bbox.x[1] > o.bbox.x[0] &&
            bbox.x[0] > o.bbox.x[1] &&
            bbox.x[1] > o.bbox.x[1]) ||
          (bbox.y[0] < o.bbox.y[0] &&
            bbox.y[1] < o.bbox.y[0] &&
            bbox.y[0] < o.bbox.y[1] &&
            bbox.y[1] < o.bbox.y[1]) ||
          (bbox.y[0] > o.bbox.y[0] &&
            bbox.y[1] > o.bbox.y[0] &&
            bbox.y[0] > o.bbox.y[1] &&
            bbox.y[1] > o.bbox.y[1])
      );

      if (foundSpace) {
        doneIterating = true;
        item = {
          x,
          y,
          radius: currentRadius,
          bbox,
        };
      }

      i++;

      if (i === 10000) {
        if (array.length === 1) {
          needsExtra = true;
        } else {
          doneIterating = true;
          return array;
        }
      }

      if (i === 15000) {
        doneIterating = true;
        return array;
      }
    }

    array.push(item);
    return array;
  }, []);

// @ts-ignore
window.$fxhashFeatures = {
  instrument,
  pitch,
  bgColor,
  primaryColor,
  secondaryColor,
  shapeCount,
};

function Line({
  start,
  end,
  aspect,
}: {
  start: { x: number; y: number };
  end: { x: number; y: number };
  aspect: number;
}) {
  return (
    <>
      <QuadraticBezierLine
        lineWidth={0.2}
        start={[
          getSizeByAspect(start.x, aspect),
          getSizeByAspect(start.y, aspect),
          0,
        ]}
        end={[
          getSizeByAspect(end.x, aspect),
          getSizeByAspect(end.y, aspect),
          0,
        ]}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        opacity={0.5}
        // @ts-ignore
        color={secondaryColor}
      />
      <mesh
        position={[
          getSizeByAspect(start.x, aspect),
          getSizeByAspect(start.y, aspect),
          0,
        ]}
      >
        <circleBufferGeometry args={[getSizeByAspect(0.05, aspect), 64]} />
        <meshStandardMaterial
          color={secondaryColor}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          opacity={0.5}
        />
      </mesh>
    </>
  );
}

interface RingProps {
  innerRadius: number;
  outerRadius: number;
  color: string;
  thetaStart: number;
  thetaLength: number;
  factor: number;
  thetaSpeed: number;
  wireframe: boolean;
  index: number;
  alteredIndex: number;
  hasBackground: boolean;
  backgroundIndex: number;
  hasTexture: boolean;
  posX: number;
  posY: number;
  metalness: number;
  roughness: number;
}

const ringFactors = [
  [2, 2.5],
  [1.2, 2],
  [1, 1.5],
  [0.8, 1.2],
  [0.5, 0.8],
];

const radiusOffsets = [
  [0.05, 0.15],
  [0.05, 0.15],
  [0.05, 0.2],
  [0.1, 0.25],
  [0.15, 0.35],
];

const ringCounts = [
  [10, 20],
  [10, 20],
  [15, 30],
  [15, 30],
  [20, 40],
];

const shapes = shapeParameters.map<RingProps[]>((shape) => {
  const ringCount =
    shapeParameters.length > 1
      ? pickRandom([
          pickRandom([1, 2]),
          ...new Array(30)
            .fill(null)
            .map(() =>
              pickRandomIntFromInterval(
                ringCounts[Math.round(shape.radius) - 1][0],
                ringCounts[Math.round(shape.radius) - 1][1]
              )
            ),
        ])
      : pickRandomIntFromInterval(
          ringCounts[Math.round(shape.radius) - 1][0],
          ringCounts[Math.round(shape.radius) - 1][1]
        );

  const factor = pickRandomDecimalFromInterval(
    ringFactors[Math.round(shape.radius) - 1][0],
    ringFactors[Math.round(shape.radius) - 1][1]
  );
  const theta = pickRandomDecimalFromInterval(-Math.PI * 2, Math.PI * 2);
  const innerRadiusOffset = pickRandomDecimalFromInterval(
    radiusOffsets[Math.round(shape.radius) - 1][0],
    radiusOffsets[Math.round(shape.radius) - 1][1]
  );
  const hasTexture = hasTexturePattern
    ? pickRandom([...new Array(4).fill(null).map(() => false), true])
    : false;

  const hasBackground = hasTexture
    ? true
    : ringCount < 2
    ? false
    : pickRandom([...new Array(7).fill(null).map(() => false), true]);

  const backgroundIndex = hasTexture || !hasBackground ? 0 : pickRandom([0, 1]);

  return new Array(ringCount).fill(null).map<RingProps>((o, index) => {
    const alteredIndex = pickRandom([
      ...new Array(8).fill(null).map(() => index),
      pickRandom([...new Array(ringCount).fill(null).map((_, i) => i)]),
    ]);

    const innerRadius =
      ringCount < 2
        ? shape.radius / 2
        : shape.radius - innerRadiusOffset - alteredIndex * 0.1;
    const outerRadius = shape.radius - alteredIndex * 0.1;
    const color = pickRandomColorWithTheme(
      primaryColor,
      COLORS,
      COLORS.length * 3
    );
    const thetaStart = pickRandomDecimalFromInterval(
      theta - pickRandomDecimalFromInterval(0.05, 0.1),
      theta + pickRandomDecimalFromInterval(0.05, 0.1)
    );
    const thetaLength = pickRandom([
      Math.PI * 2,
      Math.PI * 2,
      Math.PI * 1.5,
      pickRandomDecimalFromInterval(Math.PI * 1.9, Math.PI * 2),
      pickRandomDecimalFromInterval(Math.PI * 1.9, Math.PI * 2),
    ]);
    const thetaSpeed = pickRandomDecimalFromInterval(500, 2000);
    const wireframe =
      ringCount === 1 && shape.radius > 3
        ? false
        : pickRandom([false, false, false, false, true]);
    const metalness = pickRandom([0, 0.8]);

    return {
      roughness: metalness === 0 ? 1 : 0.4,
      metalness: metalness,
      innerRadius,
      outerRadius,
      color,
      posX: shape.x,
      posY: shape.y,
      thetaStart,
      thetaSpeed,
      thetaLength,
      factor,
      wireframe,
      index,
      alteredIndex,
      hasBackground,
      backgroundIndex,
      hasTexture,
    };
  });
});

const Shape = ({
  rings,
  texture,
  aspect,
}: {
  rings: RingProps[];
  texture: { map: Texture };
  aspect: number;
}) => {
  const [ringSprings, setRingSprings] = useSprings(rings.length, (i) => ({
    scale: [1, 1, 1],
  }));
  
  // useEffect(() => {
  //   setRingSprings.start((i) => ({
  //     from: {
  //       scale: [1, 1, 1],
  //     },
  //     to: {
  //       scale: [0.95, 0.95, 0.95],
  //     },
  //     delay: i * 100,
  //     loop: { reverse: true },
  //     config: { mass: 5, tension: 150, friction: 25 },
  //   }));
  // }, [setRingSprings, aspect, rings]);

  const backgroundOpacity = useMemo(
    () => pickRandomDecimalFromInterval(0.1, 0.3),
    []
  );
  const { backgroundIndex } = useMemo(() => rings[0], [rings]);
  const {
    posX,
    posY,
    alteredIndex,
    hasBackground,
    hasTexture,
    color,
    factor,
    outerRadius,
  } = useMemo(() => rings[backgroundIndex], [rings, backgroundIndex]);

  const pos = useMemo(
    () =>
      new Vector3(
        posX > 0
          ? getSizeByAspect(posX, aspect) +
            alteredIndex * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1)
          : getSizeByAspect(posX, aspect) -
            alteredIndex * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1),
        posY > 0
          ? getSizeByAspect(posY, aspect) +
            alteredIndex * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1)
          : getSizeByAspect(posY, aspect) -
            alteredIndex * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1),
        -alteredIndex
      ),
    [posX, posY, alteredIndex, aspect]
  );

  return (
    <group>
      {rings.map((o, i) => (
        <Ring key={i} {...o} springs={ringSprings[i]} aspect={aspect} />
      ))}
      {hasBackground && (
        <mesh position={pos}>
          <ringBufferGeometry
            args={[
              0,
              getSizeByAspect(outerRadius, aspect),
              128,
              2,
              0,
              Math.PI * 2,
            ]}
          />
          <MeshWobbleMaterial
            factor={getSizeByAspect(factor, aspect, true, 2)}
            speed={0}
            color={color}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            opacity={backgroundOpacity}
            map={hasTexture ? texture.map : undefined}
          />
        </mesh>
      )}
    </group>
  );
};

const Ring = ({
  innerRadius,
  thetaStart,
  thetaLength,
  thetaSpeed,
  outerRadius,
  factor,
  color,
  wireframe,
  aspect,
  posX,
  posY,
  alteredIndex,
  metalness,
  roughness,
  springs,
}: RingProps & {
  aspect: number;
  springs: {
    scale: SpringValue<number[]>;
  };
}) => {
  const ref = useRef<Mesh<RingGeometry>>();
  const lastThetaStart = useRef(thetaStart);
  let geometry = useMemo(
    () =>
      new RingBufferGeometry(
        getSizeByAspect(innerRadius, aspect),
        getSizeByAspect(outerRadius, aspect),
        128,
        2,
        lastThetaStart.current,
        thetaLength
      ),
    [outerRadius, innerRadius, thetaLength, aspect]
  );

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }

    lastThetaStart.current +=
      (Math.sin(clock.getElapsedTime() / 2) / thetaSpeed) * 2;

    geometry = new RingBufferGeometry(
      getSizeByAspect(innerRadius, aspect),
      getSizeByAspect(outerRadius, aspect),
      128,
      2,
      lastThetaStart.current,
      thetaLength
    );

    ref.current.geometry.dispose();
    ref.current.geometry = geometry;
  });

  const pos = useMemo(
    () =>
      new Vector3(
        posX > 0
          ? getSizeByAspect(posX, aspect) +
            alteredIndex * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1)
          : getSizeByAspect(posX, aspect) -
            alteredIndex * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1),
        posY > 0
          ? getSizeByAspect(posY, aspect) +
            alteredIndex * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1)
          : getSizeByAspect(posY, aspect) -
            alteredIndex * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1),
        -alteredIndex
      ),
    [posX, posY, alteredIndex, aspect]
  );

  return (
    // @ts-ignore
    <a.mesh ref={ref} position={pos} {...springs} geometry={geometry}>
      {/* <ringBufferGeometry
        args={[
          getSizeByAspect(innerRadius, aspect),
          getSizeByAspect(outerRadius, aspect),
          128,
          2,
          thetaStart,
          thetaLength,
        ]}
      /> */}
      <MeshWobbleMaterial
        factor={getSizeByAspect(factor, aspect, true, 2)}
        speed={0}
        color={color}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
        wireframe={wireframe}
        roughness={hasMetalness ? (metalness !== 0 ? roughness : 0) : 0}
        metalness={hasMetalness ? metalness : 0}
      />
    </a.mesh>
  );
};

const Scene = ({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) => {
  const { aspect } = useThree((state) => ({
    aspect: state.viewport.aspect,
  }));

  const controls = useRef<OrbitControlsImpl>(null)
  const texture = useTexture({
    map: `${process.env.PUBLIC_URL}/textures/pattern.jpg`,
  });
  const texture2 = useTexture({
    map: `${process.env.PUBLIC_URL}/textures/pattern2.jpg`,
  });

  Object.keys(texture).forEach((key) => {
    texture[key as keyof typeof texture].wrapS = RepeatWrapping;
    texture[key as keyof typeof texture].wrapT = RepeatWrapping;
    texture[key as keyof typeof texture].repeat.x = 6;
    texture[key as keyof typeof texture].repeat.y = 6;
  });

  Object.keys(texture2).forEach((key) => {
    texture2[key as keyof typeof texture2].wrapS = RepeatWrapping;
    texture2[key as keyof typeof texture2].wrapT = RepeatWrapping;
    texture2[key as keyof typeof texture2].repeat.x = 2;
    texture2[key as keyof typeof texture2].repeat.y = 2;
  });

  // useEffect(() => {
  //   const ref = canvasRef?.current;

  //   if (!ref) {
  //     return;
  //   }

  //   ref.addEventListener("pointerdown", onPointerDown);

  //   return () => {
  //     ref.removeEventListener("pointerdown", onPointerDown);
  //   };
  // }, [onPointerDown, canvasRef]);

  const linePaths = useMemo(
    () => shapes.map((o) => ({ x: o[0].posX, y: o[0].posY })),
    []
  );

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <OrbitControls ref={controls} enabled={true} />
      <ambientLight />

      {hasMetalness ? (
        <spotLight
          position={[0, 0, 20]}
          penumbra={0.5}
          angle={0.25}
          intensity={1}
        />
      ) : null}

      <group>
        {shapes.map((shape, i) => (
          <Float rotationIntensity={0} key={i}>
            <Shape
              key={i}
              rings={shape}
              aspect={aspect}
              texture={texturePattern === 0 ? texture : texture2}
            />
          </Float>
        ))}
      </group>

      <BgObjects
        bgColor={bgColor}
        secondaryColor={secondaryColor}
        aspect={aspect}
      />
      {hasbgPlane || shapeParameters.length === 1 ? (
        <mesh
          position={[
            getSizeByWidthAspect(bgPlaneParams.x, aspect),
            bgPlaneParams.y,
            -6,
          ]}
        >
          <planeBufferGeometry
            args={[
              getSizeByWidthAspect(bgPlaneParams.width, aspect),
              bgPlaneParams.height,
            ]}
          />
          <meshStandardMaterial
            color={secondaryColor}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            opacity={0.1}
          />
        </mesh>
      ) : null}

      {hasLines &&
        linePaths.map((path, i, arr) =>
          i < arr.length - 1 ? (
            <Line key={i} start={path} end={arr[i + 1]} aspect={aspect} />
          ) : null
        )}

      {!isMobile ? (
        <EffectComposer>
          <Bloom
            kernelSize={KernelSize.LARGE}
            luminanceThreshold={0}
            luminanceSmoothing={0.4}
            intensity={0.6}
          />
          <Noise opacity={0.1} />
        </EffectComposer>
      ) : (
        <EffectComposer>
          <Noise opacity={0.1} />
        </EffectComposer>
      )}
    </>
  );
};

export default Scene;
