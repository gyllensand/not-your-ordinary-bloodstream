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
  getSizeByAspect,
  pickRandom,
  pickRandomColorWithTheme,
  pickRandomDecimalFromInterval,
  pickRandomIntFromInterval,
} from "./utils";
import { COLORS, BG_COLORS, LIGHT_BG_COLORS, PALETTES } from "./constants";
import { Bloom, EffectComposer, Noise } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { start } from "tone";
import { BgObjects } from "./BgObjects";

const instrument = pickRandom([0, 1, 1]);
const pitch = pickRandom(["C#-1", "D-1"]);
const bgColor = pickRandom(BG_COLORS);
const primaryColor = pickRandom(COLORS);
const secondaryColor = pickRandom(COLORS);
console.log(bgColor, primaryColor);
const texturePattern = pickRandom([0, 1]);
const hasTexturePattern = pickRandom([
  ...new Array(5).fill(null).map(() => false),
  true,
]);

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
    let item = {} as ShapeParam;

    while (!doneIterating) {
      const currentRadius = pickRandom([
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
};

function Line({ start, end }: { start: Vector3; end: Vector3 }) {
  return (
    <QuadraticBezierLine
      lineWidth={1}
      start={start}
      end={end}
      blending={AdditiveBlending}
      depthWrite={false}
      toneMapped={false}
      // @ts-ignore
      color={primaryColor}
    />
  );
}

interface RingProps {
  innerRadius: number;
  outerRadius: number;
  color: string;
  position: Vector3;
  thetaStart: number;
  thetaLength: number;
  factor: number;
  thetaSpeed: number;
  wireframe: boolean;
  index: number;
  hasBackground: boolean;
  backgroundIndex: number;
  hasTexture: boolean;
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
          1,
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
    ? pickRandom([...new Array(9).fill(null).map(() => false), true])
    : false;

  const hasBackground = hasTexture
    ? true
    : ringCount < 2
    ? false
    : pickRandom([...new Array(9).fill(null).map(() => false), true]);

  const backgroundIndex = hasTexture ? 0 : pickRandom([0, 1]);

  return new Array(ringCount).fill(null).map<RingProps>((o, index) => {
    const currentIndex = pickRandom([
      ...new Array(10).fill(null).map(() => index),
      0,
      pickRandom([...new Array(ringCount).fill(null).map((_, i) => i)]),
    ]);

    const innerRadius =
      ringCount < 2
        ? shape.radius / 2
        : shape.radius - innerRadiusOffset - currentIndex * 0.1;
    const outerRadius = shape.radius - currentIndex * 0.1;
    const color = pickRandomColorWithTheme(
      primaryColor,
      COLORS,
      COLORS.length * 3
    );
    const position = new Vector3(
      shape.x > 0
        ? shape.x + currentIndex * (Math.abs(shape.x) * 0.1)
        : shape.x - currentIndex * (Math.abs(shape.x) * 0.1),
      shape.y > 0
        ? shape.y + currentIndex * (Math.abs(shape.y) * 0.1)
        : shape.y - currentIndex * (Math.abs(shape.y) * 0.1),
      -currentIndex
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

    return {
      // roughness,
      // metalness,
      innerRadius,
      outerRadius,
      color,
      position,
      thetaStart,
      thetaSpeed,
      thetaLength,
      factor,
      wireframe,
      index,
      hasBackground,
      backgroundIndex,
      hasTexture,
    };
  });
});

const Shape = ({
  rings,
  texture,
}: {
  rings: RingProps[];
  texture: { map: Texture };
}) => {
  const [springs, setSprings] = useSprings(rings.length, (i) => ({
    scale: [1, 1, 1],
  }));

  // useEffect(() => {
  //   setSprings.start((i) => ({
  //     from: {
  //       scale: [1, 1, 1],
  //     },
  //     to: {
  //       scale: [0.9, 0.9, 0.9],
  //     },
  //     delay: i * 100,
  //     loop: { reverse: true },
  //     config: { mass: 10, tension: 50, friction: 25 },
  //   }));
  // }, [setSprings]);

  return (
    <group>
      {rings.map((o, i) => (
        // @ts-ignore
        <a.group key={i} {...springs[i]}>
          <Ring {...o} />
        </a.group>
      ))}
      {rings[0].hasBackground && (
        <mesh position={rings[rings[0].backgroundIndex].position}>
          <ringBufferGeometry
            args={[
              0,
              rings[rings[0].backgroundIndex].outerRadius,
              128,
              2,
              0,
              Math.PI * 2,
            ]}
          />
          <MeshWobbleMaterial
            factor={rings[rings[0].backgroundIndex].factor}
            speed={0}
            color={rings[rings[0].backgroundIndex].color}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            opacity={0.1}
            map={rings[0].hasTexture ? texture.map : undefined}
          />
        </mesh>
      )}
    </group>
  );
};

const Ring = (ring: RingProps) => {
  const ref = useRef<Mesh<RingGeometry>>();
  const lastInnerRadius = useRef(ring.innerRadius);
  const lastThetaStart = useRef(ring.thetaStart);
  const lastThetaLength = useRef(ring.thetaLength);
  let geometry = useMemo(
    () =>
      new RingBufferGeometry(
        lastInnerRadius.current,
        ring.outerRadius,
        128,
        2,
        lastThetaStart.current,
        lastThetaLength.current
      ),
    [ring]
  );

  // useFrame(({ clock }) => {
  //   if (!ref.current) {
  //     return;
  //   }

  //   // lastInnerRadius.current -=
  //   //   Math.sin(clock.getElapsedTime() / (ring.thetaSpeed / 100)) / 1000;

  //   // lastThetaStart.current +=
  //   //   Math.sin(clock.getElapsedTime()) / ring.thetaSpeed;
  //   // lastThetaLength.current =
  //   //   ring.thetaLength + Math.sin(clock.getElapsedTime() / ring.thetaSpeed) * 2;

  //   geometry = new RingBufferGeometry(
  //     lastInnerRadius.current,
  //     ring.outerRadius,
  //     128,
  //     2,
  //     lastThetaStart.current,
  //     lastThetaLength.current
  //   );

  //   ref.current.geometry.dispose();
  //   ref.current.geometry = geometry;
  // });

  return (
    <mesh ref={ref} position={ring.position}>
      <ringBufferGeometry
        args={[
          ring.innerRadius,
          ring.outerRadius,
          128,
          2,
          ring.thetaStart,
          ring.thetaLength,
        ]}
      />
      <MeshWobbleMaterial
        factor={ring.factor}
        speed={0}
        color={ring.color}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
        wireframe={ring.wireframe}
      />
    </mesh>
  );
};

const Scene = ({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement> }) => {
  const { aspect } = useThree((state) => ({
    aspect: state.viewport.aspect,
  }));

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

  const linePaths = useMemo(() => shapes.map((o) => o[0].position), []);

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <OrbitControls enabled={true} />
      <ambientLight />

      <group
        scale={[
          getSizeByAspect(1, aspect),
          getSizeByAspect(1, aspect),
          getSizeByAspect(1, aspect),
        ]}
      >
        {shapes.map((shape, i) => (
          <Float rotationIntensity={0} key={i}>
            <Shape
              key={i}
              rings={shape}
              texture={texturePattern === 0 ? texture : texture2}
            />
          </Float>
        ))}

        <BgObjects bgColor={bgColor} secondaryColor={secondaryColor} />

        {/* {linePaths.map((path, i, arr) =>
          i < arr.length - 1 ? (
            <Line key={i} start={path} end={arr[i + 1]} />
          ) : null
        )} */}
      </group>

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
