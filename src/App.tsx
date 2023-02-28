import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Scene, { instrument } from "./Scene";
import { Sampler } from "tone";

console.log(
  "%c * Computer Emotions * ",
  "color: #d80fe7; font-size: 14px; background-color: #000000;"
);

console.log(
  "%c http://www.computeremotions.com ",
  "font-size: 12px; background-color: #000000;"
);

const path = instrument === 0 ? "hats" : "pops";
const baseUrl = `${process.env.PUBLIC_URL}/audio/${path}/`;

export interface Sample {
  index: number;
  sampler: Sampler;
}

export const HITSOUT: Sample[] = [
  {
    index: 0,
    sampler: new Sampler({
      urls: {
        1: `out.mp3`,
      },
      baseUrl,
    }),
  },
];

export const HITS: Sample[] = [
  {
    index: 0,
    sampler: new Sampler({
      urls: {
        1: `1.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 1,
    sampler: new Sampler({
      urls: {
        1: `2.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 2,
    sampler: new Sampler({
      urls: {
        1: `3.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 3,
    sampler: new Sampler({
      urls: {
        1: `4.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 4,
    sampler: new Sampler({
      urls: {
        1: `5.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 5,
    sampler: new Sampler({
      urls: {
        1: `6.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 6,
    sampler: new Sampler({
      urls: {
        1: `7.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 7,
    sampler: new Sampler({
      urls: {
        1: `8.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 8,
    sampler: new Sampler({
      urls: {
        1: `9.mp3`,
      },
      baseUrl,
    }),
  },
  {
    index: 9,
    sampler: new Sampler({
      urls: {
        1: `10.mp3`,
      },
      baseUrl,
    }),
  },
];

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <Canvas
      ref={canvasRef}
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={window.devicePixelRatio}
    >
      <Suspense fallback={null}>
        <Scene canvasRef={canvasRef} />
      </Suspense>
    </Canvas>
  );
};

export default App;
