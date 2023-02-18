export const COLORS = [
  "#dc202e",
  "#2d338b",
  "#76306b",
  "#ea8c2d",
  "#c06e86",
  "#0f9ebe",
  "#1c6ff1",
  "#eb3434",
  "#cb4e4d",
  "#ffce00",
  "#ff48e6",
  "#bd22a8",
  "#30f8a0",
  "#249582",
  "#ffffff",
];

export const BG_COLORS = [
  "#000000",
  "#111111",
  "#272727",
  "#000080",
  "#0f1638",
  "#143261",
  "#06518c",
  "#152a30",
  "#0f4c5c",
  "#004932",
  "#0d4236",
  "#c91414",
  "#9a031e",
  "#3d0100",
  "#7e1c3b",
];

export const STRIPE_COLORS = [
  "#dc202e",
  "#2d338b",
  "#76306b",
  "#ea8c2d",
  "#c06e86",
  "#0f9ebe",
  "#1c6ff1",
  "#eb3434",
  "#cb4e4d",
  "#ffce00",
  "#ff48e6",
  "#bd22a8",
  "#30f8a0",
  "#249582",
];

export const getBgPlaneParams = (
  bgPlaneType: number
): {
  x: number;
  y: number;
  width: number;
  height: number;
} => {
  switch (bgPlaneType) {
    case 0:
      return {
        x: 0,
        y: -3.75,
        width: 15,
        height: 7.5,
      };
    case 1:
      return {
        x: 0,
        y: 3.75,
        width: 15,
        height: 7.5,
      };
    case 2:
      return {
        x: -3.75,
        y: 0,
        width: 7.5,
        height: 15,
      };
    case 3:
      return {
        x: 3.75,
        y: 0,
        width: 7.5,
        height: 15,
      };
    case 4:
      return {
        x: -3.75,
        y: -3.75,
        width: 7.5,
        height: 7.5,
      };
    case 5:
      return {
        x: 0,
        y: -3.75,
        width: 7.5,
        height: 7.5,
      };
    case 6:
      return {
        x: 3.75,
        y: -3.75,
        width: 7.5,
        height: 7.5,
      };
    case 7:
      return {
        x: -3.75,
        y: 0,
        width: 7.5,
        height: 7.5,
      };
    case 8:
      return {
        x: 3.75,
        y: 0,
        width: 7.5,
        height: 7.5,
      };
    case 9:
      return {
        x: -3.75,
        y: 3.75,
        width: 7.5,
        height: 7.5,
      };
    case 10:
      return {
        x: 0,
        y: 3.75,
        width: 7.5,
        height: 7.5,
      };
    case 11:
      return {
        x: 3.75,
        y: 3.75,
        width: 7.5,
        height: 7.5,
      };

    default:
      return {
        x: 0,
        y: 0,
        width: 7.5,
        height: 7.5,
      };
  }
};
