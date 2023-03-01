import {
  OrbitControls,
  QuadraticBezierLine,
  MeshWobbleMaterial,
  Float,
  useTexture,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { a, useSprings } from "@react-spring/three";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  AdditiveBlending,
  DoubleSide,
  RepeatWrapping,
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
import { HITS, HITSOUT } from "./App";

export const instrument = pickRandom([0, 1, 1]);
const bgColor = pickRandom(BG_COLORS);
const primaryColor = pickRandom(COLORS);
const secondaryColor = pickRandom(STRIPE_COLORS);
export const colorContrast = getColorContrast(
  hexToRgb(bgColor),
  hexToRgb(secondaryColor)
);
const hasbgPlane = pickRandom([
  ...new Array(3).fill(null).map(() => false),
  true,
]);
const bgPlaneType = pickRandom([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const bgPlaneParams = getBgPlaneParams(bgPlaneType);
const hasMetalness = pickRandom([
  ...new Array(23).fill(null).map(() => 0),
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
  bbox?: {
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
      const x =
        currentRadius > 4
          ? pickRandom([
              pickRandomDecimalFromInterval(-4, -2),
              pickRandomDecimalFromInterval(2, 4),
            ])
          : pickRandomDecimalFromInterval(-4, 4);
      const y =
        currentRadius > 4
          ? pickRandom([
              pickRandomDecimalFromInterval(-4, -2),
              pickRandomDecimalFromInterval(2, 4),
            ])
          : pickRandomDecimalFromInterval(-4, 4);

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
          (o.bbox &&
            bbox.x[0] < o.bbox.x[0] &&
            bbox.x[1] < o.bbox.x[0] &&
            bbox.x[0] < o.bbox.x[1] &&
            bbox.x[1] < o.bbox.x[1]) ||
          (o.bbox &&
            bbox.x[0] > o.bbox.x[0] &&
            bbox.x[1] > o.bbox.x[0] &&
            bbox.x[0] > o.bbox.x[1] &&
            bbox.x[1] > o.bbox.x[1]) ||
          (o.bbox &&
            bbox.y[0] < o.bbox.y[0] &&
            bbox.y[1] < o.bbox.y[0] &&
            bbox.y[0] < o.bbox.y[1] &&
            bbox.y[1] < o.bbox.y[1]) ||
          (o.bbox &&
            bbox.y[0] > o.bbox.y[0] &&
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
  wireframe: boolean;
  index: number;
  alteredIndex: number;
  hasBackground: boolean;
  backgroundIndex: number;
  hasTexture: boolean;
  radius: number;
  posX: number;
  posY: number;
  metalness: number;
  roughness: number;
  composition: number;
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
  [5, 10],
  [10, 20],
  [15, 30],
  [15, 30],
  [20, 40],
];

const generateShape = (params: ShapeParam, currentArray?: ShapeParam[]) => {
  const ringCount =
    !currentArray || currentArray.length > 1
      ? pickRandom(
          [
            pickRandom([1, 2], currentArray ? undefined : Math.random),
            ...[
              !currentArray
                ? pickRandomIntFromInterval(
                    ringCounts[Math.round(params.radius) - 1][0],
                    40,
                    currentArray ? undefined : Math.random
                  )
                : pickRandomIntFromInterval(
                    ringCounts[Math.round(params.radius) - 1][0],
                    ringCounts[Math.round(params.radius) - 1][1],
                    currentArray ? undefined : Math.random
                  ),
            ],
            ...new Array(30)
              .fill(null)
              .map(() =>
                pickRandomIntFromInterval(
                  ringCounts[Math.round(params.radius) - 1][0],
                  ringCounts[Math.round(params.radius) - 1][1],
                  currentArray ? undefined : Math.random
                )
              ),
          ],
          currentArray ? undefined : Math.random
        )
      : pickRandomIntFromInterval(
          ringCounts[Math.round(params.radius) - 1][0],
          ringCounts[Math.round(params.radius) - 1][1],
          currentArray ? undefined : Math.random
        );

  const factor = pickRandomDecimalFromInterval(
    ringFactors[Math.round(params.radius) - 1][0],
    ringFactors[Math.round(params.radius) - 1][1],
    2,
    currentArray ? undefined : Math.random
  );
  const theta = pickRandomDecimalFromInterval(
    -Math.PI * 2,
    Math.PI * 2,
    2,
    currentArray ? undefined : Math.random
  );
  const innerRadiusOffset = pickRandomDecimalFromInterval(
    radiusOffsets[Math.round(params.radius) - 1][0],
    radiusOffsets[Math.round(params.radius) - 1][1],
    2,
    currentArray ? undefined : Math.random
  );
  const hasTexture =
    !currentArray || hasTexturePattern
      ? pickRandom(
          [...new Array(2).fill(null).map(() => false), true],
          currentArray ? undefined : Math.random
        )
      : false;

  const hasBackground = hasTexture
    ? true
    : ringCount < 2
    ? false
    : pickRandom(
        [...new Array(7).fill(null).map(() => false), true],
        currentArray ? undefined : Math.random
      );

  const backgroundIndex =
    hasTexture || !hasBackground
      ? 0
      : pickRandom([0, 1], currentArray ? undefined : Math.random);

  return new Array(ringCount).fill(null).map<RingProps>((o, index) => {
    const alteredIndex = pickRandom(
      [
        ...new Array(8).fill(null).map(() => index),
        pickRandom(
          [...new Array(ringCount).fill(null).map((_, i) => i)],
          currentArray ? undefined : Math.random
        ),
      ],
      currentArray ? undefined : Math.random
    );

    const innerRadius =
      ringCount < 2
        ? params.radius / 2
        : params.radius - innerRadiusOffset - alteredIndex * 0.1;
    const outerRadius = params.radius - alteredIndex * 0.1;
    const color = !currentArray
      ? pickRandomColorWithTheme(
          primaryColor,
          COLORS,
          COLORS.length,
          Math.random
        )
      : pickRandomColorWithTheme(primaryColor, COLORS, COLORS.length * 3);

    const thetaStart = pickRandomDecimalFromInterval(
      theta -
        pickRandomDecimalFromInterval(
          0.05,
          0.1,
          2,
          currentArray ? undefined : Math.random
        ),
      theta +
        pickRandomDecimalFromInterval(
          0.05,
          0.1,
          2,
          currentArray ? undefined : Math.random
        ),
      2,
      currentArray ? undefined : Math.random
    );
    const thetaLength = pickRandom(
      [
        Math.PI * 2,
        Math.PI * 2,
        Math.PI * 1.5,
        pickRandomDecimalFromInterval(
          Math.PI * 1.9,
          Math.PI * 2,
          2,
          currentArray ? undefined : Math.random
        ),
        pickRandomDecimalFromInterval(
          Math.PI * 1.9,
          Math.PI * 2,
          2,
          currentArray ? undefined : Math.random
        ),
      ],
      currentArray ? undefined : Math.random
    );
    const wireframe =
      ringCount === 1 && params.radius > 3
        ? false
        : pickRandom(
            [false, false, false, false, true],
            currentArray ? undefined : Math.random
          );
    const metalness = pickRandom(
      [0, 0.8],
      currentArray ? undefined : Math.random
    );

    const composition =
      ringCount +
      metalness +
      color.charCodeAt(6) +
      params.x +
      params.y +
      thetaStart +
      thetaLength +
      innerRadius +
      outerRadius +
      params.radius +
      factor;

    return {
      roughness: metalness === 0 ? 1 : 0.4,
      metalness,
      innerRadius,
      outerRadius,
      color,
      posX: params.x,
      posY: params.y,
      radius: params.radius,
      thetaStart,
      thetaLength,
      factor,
      wireframe,
      index,
      alteredIndex,
      hasBackground,
      backgroundIndex,
      hasTexture,
      composition,
    };
  });
};

const shapes = shapeParameters.map((params) =>
  generateShape(params, shapeParameters)
);

const shapeComposition = shapes.reduce(
  (total, value) =>
    (total += value.reduce((total, value) => (total += value.composition), 0)),
  0
);

// @ts-ignore
window.$fxhashFeatures = {
  instrument,
  bgColor,
  primaryColor,
  secondaryColor,
  shapeCount: shapeParameters.length,
  shapeComposition,
  hasMetalness,
  hasLines,
  hasTexturePattern,
};

const Shape = ({
  rings,
  texture,
  aspect,
}: {
  rings: RingProps[];
  texture: { map: Texture };
  aspect: number;
}) => {
  const toneInitialized = useRef(false);
  const initialRenderDone = useRef(false);
  const isReentering = useRef(false);
  const [currentRings, setCurrentRings] = useState(rings);
  const [ringSprings, setRingSprings] = useSprings(
    currentRings.length,
    (i) => ({
      scale: [1, 1, 1],
    })
  );

  const onShapePress = useCallback(async () => {
    if (!isReentering.current) {
      return;
    }

    const pitch = pickRandom(
      ["C#-2", "E#-2", "G#-2", "C#-1", "E#-1", "G#-1"],
      Math.random
    );

    if (!toneInitialized.current) {
      await start();
      toneInitialized.current = true;
    }

    const audioSequence = currentRings.map(() => pickRandom(HITS, Math.random));
    let currentSampleIndex = 0;
    isReentering.current = false;
    setRingSprings.stop();
    setRingSprings.start((i) => ({
      from: {
        scale: ringSprings[i].scale.get(),
      },
      to: {
        scale: [0, 0, 0],
      },
      onStart: () => {
        if (i % 3 !== 0 || !audioSequence[currentSampleIndex]) {
          return;
        }

        if (toneInitialized.current) {
          audioSequence[currentSampleIndex].sampler.triggerAttack(pitch);
        }

        currentSampleIndex++;
      },
      onRest: () => {
        if (ringSprings.every(({ scale }) => scale.get()[0] === 0)) {
          const newRings = generateShape({
            radius: currentRings[0].radius,
            x: currentRings[0].posX,
            y: currentRings[0].posY,
          });

          setCurrentRings(newRings);
        }
      },
      delay: currentRings[i].alteredIndex * 30,
      config: {
        mass: 1,
        tension: currentRings[0].radius > 3.5 ? 150 : 200,
        friction: 25,
      },
    }));
  }, [setRingSprings, ringSprings, currentRings]);

  useEffect(() => {
    if (!initialRenderDone.current) {
      initialRenderDone.current = true;
      isReentering.current = true;
      return;
    }

    const pitch = pickRandom(
      ["C#-2", "E#-2", "G#-2", "C#-1", "E#-1", "G#-1"],
      Math.random
    );

    if (toneInitialized.current) {
      HITSOUT[0].sampler.triggerAttack(pitch);
    }

    setTimeout(() => {
      isReentering.current = true;
    }, 100);

    setRingSprings.start((i) => ({
      from: {
        scale: [0, 0, 0],
      },
      to: {
        scale: [1, 1, 1],
      },
      delay: currentRings[i].alteredIndex * 30,
      config: { mass: 1, tension: 200, friction: 25 },
    }));
  }, [setRingSprings, currentRings]);

  const backgroundOpacity = useMemo(
    () => pickRandomDecimalFromInterval(0.1, 0.3),
    []
  );
  const { backgroundIndex } = useMemo(() => currentRings[0], [currentRings]);
  const {
    posX,
    posY,
    alteredIndex,
    hasBackground,
    hasTexture,
    color,
    factor,
    outerRadius,
  } = useMemo(
    () => currentRings[backgroundIndex],
    [currentRings, backgroundIndex]
  );

  const pos = useCallback(
    (i: number) =>
      new Vector3(
        posX > 0
          ? getSizeByAspect(posX, aspect) +
            i * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1)
          : getSizeByAspect(posX, aspect) -
            i * (Math.abs(getSizeByAspect(posX, aspect)) * 0.1),
        posY > 0
          ? getSizeByAspect(posY, aspect) +
            i * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1)
          : getSizeByAspect(posY, aspect) -
            i * (Math.abs(getSizeByAspect(posY, aspect)) * 0.1),
        -i
      ),
    [posX, posY, aspect]
  );

  return (
    <group onPointerDown={onShapePress}>
      {currentRings.map((o, i, array) => (
        <Ring
          key={i}
          {...o}
          springs={ringSprings[o.index]}
          aspect={aspect}
          allRings={array}
        />
      ))}
      {hasBackground && (
        // @ts-ignore
        <a.mesh position={pos(alteredIndex)} {...ringSprings[0]}>
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
            speed={currentRings[0].outerRadius > 2 ? 0.2 : 0}
            color={color}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
            opacity={backgroundOpacity}
            map={hasTexture ? texture.map : undefined}
          />
        </a.mesh>
      )}
      <mesh position={pos(0)} visible={false}>
        <ringBufferGeometry
          args={[0, getSizeByAspect(currentRings[0].radius, aspect)]}
        />
      </mesh>
    </group>
  );
};

const Ring = ({
  innerRadius,
  thetaStart,
  thetaLength,
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
  allRings,
}: RingProps & {
  aspect: number;
  allRings: RingProps[];
  springs: {
    scale: SpringValue<number[]>;
  };
}) => {
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
    <a.mesh position={pos} {...springs}>
      <ringBufferGeometry
        args={[
          getSizeByAspect(innerRadius, aspect),
          getSizeByAspect(outerRadius, aspect),
          128,
          2,
          thetaStart,
          thetaLength,
        ]}
      />
      <MeshWobbleMaterial
        factor={getSizeByAspect(factor, aspect, true, 2)}
        speed={allRings[0].outerRadius > 2 ? 0.2 : 0}
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
  const controls = useRef<OrbitControlsImpl>(null);
  const { aspect } = useThree((state) => ({
    aspect: state.viewport.aspect,
  }));

  useEffect(() => {
    HITSOUT.forEach((hit) => {
      if (instrument === 0) {
        hit.sampler.volume.value = -15;
      }

      hit.sampler.toDestination();
    });

    HITS.forEach((hit) => {
      if (instrument === 0) {
        hit.sampler.volume.value = -10;
      }

      hit.sampler.toDestination();
    });
  }, []);

  useFrame((state) => {
    if (!controls.current || isMobile) {
      return;
    }

    controls.current.setAzimuthalAngle(-state.mouse.x / 100);
    controls.current.setPolarAngle(Math.PI / 2 + state.mouse.y / 100);
    controls.current.update();
  });

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

  const linePaths = useMemo(
    () => shapes.map((o) => ({ x: o[0].posX, y: o[0].posY })),
    []
  );

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <OrbitControls ref={controls} enabled={false} />
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

      <EffectComposer>
        <Bloom
          kernelSize={KernelSize.LARGE}
          luminanceThreshold={0}
          luminanceSmoothing={0.4}
          intensity={0.6}
        />
        <Noise opacity={0.1} />
      </EffectComposer>
    </>
  );
};

export default Scene;
