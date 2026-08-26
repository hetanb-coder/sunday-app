import { Skia } from '@shopify/react-native-skia';
import {
  D3_PRODUCTION_OPENING_PACING,
  D3_PRODUCTION_PACING,
  getAnchoredUnfurlNodes,
  type AnchoredUnfurlConfig,
  type AnchoredUnfurlFrame,
  type AnchoredUnfurlNode,
} from './d3AnchoredUnfurl';

export type D4MotionDirection = 'opening' | 'closing';

const clamp01 = (value: number) => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

const smoothStep = (value: number) => {
  'worklet';
  const next = clamp01(value);
  return next * next * (3 - 2 * next);
};

const smootherStep = (value: number) => {
  'worklet';
  const next = clamp01(value);
  return next * next * next * (next * (next * 6 - 15) + 10);
};

const powerEase = (value: number, exponent: number) => {
  'worklet';
  return 1 - Math.pow(1 - clamp01(value), exponent);
};

const local = (progress: number, start: number, end: number) => {
  'worklet';
  return clamp01((progress - start) / Math.max(0.01, end - start));
};

const mixNumber = (from: number, to: number, amount: number) => {
  'worklet';
  return from + (to - from) * amount;
};

const mixNode = (
  from: AnchoredUnfurlNode,
  to: AnchoredUnfurlNode,
  amount: number,
): AnchoredUnfurlNode => {
  'worklet';
  return {
    x: mixNumber(from.x, to.x, amount),
    y: mixNumber(from.y, to.y, amount),
    inX: mixNumber(from.inX, to.inX, amount),
    inY: mixNumber(from.inY, to.inY, amount),
    outX: mixNumber(from.outX, to.outX, amount),
    outY: mixNumber(from.outY, to.outY, amount),
  };
};

type Point = { x: number; y: number };

const point = (node: AnchoredUnfurlNode): Point => {
  'worklet';
  return { x: node.x, y: node.y };
};
const controlOut = (node: AnchoredUnfurlNode): Point => {
  'worklet';
  return { x: node.x + node.outX, y: node.y + node.outY };
};
const controlIn = (node: AnchoredUnfurlNode): Point => {
  'worklet';
  return { x: node.x + node.inX, y: node.y + node.inY };
};
const mixPoint = (from: Point, to: Point, amount: number): Point => {
  'worklet';
  return {
    x: mixNumber(from.x, to.x, amount),
    y: mixNumber(from.y, to.y, amount),
  };
};

/** Exact De Casteljau split of one cubic at t=0.5. */
const splitCubicHalf = (from: AnchoredUnfurlNode, to: AnchoredUnfurlNode) => {
  'worklet';
  const p0 = point(from);
  const p1 = controlOut(from);
  const p2 = controlIn(to);
  const p3 = point(to);
  const p01 = mixPoint(p0, p1, 0.5);
  const p12 = mixPoint(p1, p2, 0.5);
  const p23 = mixPoint(p2, p3, 0.5);
  const p012 = mixPoint(p01, p12, 0.5);
  const p123 = mixPoint(p12, p23, 0.5);
  const midpoint = mixPoint(p012, p123, 0.5);
  return {
    fromOut: { x: p01.x - p0.x, y: p01.y - p0.y },
    midpoint: {
      x: midpoint.x,
      y: midpoint.y,
      inX: p012.x - midpoint.x,
      inY: p012.y - midpoint.y,
      outX: p123.x - midpoint.x,
      outY: p123.y - midpoint.y,
    } satisfies AnchoredUnfurlNode,
    toIn: { x: p23.x - p3.x, y: p23.y - p3.y },
  };
};

/**
 * Converts the live eight-node D3 cubic contour to twelve nodes without changing
 * its geometry. The top, upper-right, lower-left and top-left spans are split.
 */
export const subdivideD3ContourToD4 = (nodes: AnchoredUnfurlNode[]) => {
  'worklet';
  const split01 = splitCubicHalf(nodes[0], nodes[1]);
  const split23 = splitCubicHalf(nodes[2], nodes[3]);
  const split67 = splitCubicHalf(nodes[6], nodes[7]);
  const split70 = splitCubicHalf(nodes[7], nodes[0]);
  return [
    { ...nodes[0], inX: split70.toIn.x, inY: split70.toIn.y, outX: split01.fromOut.x, outY: split01.fromOut.y },
    split01.midpoint,
    { ...nodes[1], inX: split01.toIn.x, inY: split01.toIn.y },
    { ...nodes[2], outX: split23.fromOut.x, outY: split23.fromOut.y },
    split23.midpoint,
    { ...nodes[3], inX: split23.toIn.x, inY: split23.toIn.y },
    { ...nodes[4] },
    { ...nodes[5] },
    { ...nodes[6], outX: split67.fromOut.x, outY: split67.fromOut.y },
    { ...split67.midpoint },
    { ...nodes[7], inX: split67.toIn.x, inY: split67.toIn.y, outX: split70.fromOut.x, outY: split70.fromOut.y },
    split70.midpoint,
  ];
};

const getD4FinalNodes = (
  sheet: AnchoredUnfurlFrame,
  topRadius = 30,
): AnchoredUnfurlNode[] => {
  'worklet';
  const left = sheet.x;
  const top = sheet.y;
  const right = sheet.x + sheet.width;
  const bottom = sheet.y + sheet.height;
  const k = 0.5522847498;
  const topStart = left + topRadius;
  const topEnd = right - topRadius;
  const topMid = (topStart + topEnd) / 2;
  const rightMid = (top + topRadius + bottom) / 2;
  const bottomMid = (left + right) / 2;
  const leftStraightHeight = Math.max(1, bottom - (top + topRadius));
  const lowerLeftY = bottom - leftStraightHeight / 3;
  const upperLeftY = top + topRadius + leftStraightHeight / 3;
  const topLeftArcStart: AnchoredUnfurlNode = {
    x: left,
    y: top + topRadius,
    inX: 0,
    inY: 0,
    outX: 0,
    outY: -topRadius * k,
  };
  const topLeftArcEnd: AnchoredUnfurlNode = {
    x: topStart,
    y: top,
    inX: -topRadius * k,
    inY: 0,
    outX: 0,
    outY: 0,
  };
  const topLeftArcSplit = splitCubicHalf(topLeftArcStart, topLeftArcEnd);

  return [
    { x: topStart, y: top, inX: topLeftArcSplit.toIn.x, inY: topLeftArcSplit.toIn.y, outX: (topMid - topStart) / 3, outY: 0 },
    { x: topMid, y: top, inX: -(topMid - topStart) / 3, inY: 0, outX: (topEnd - topMid) / 3, outY: 0 },
    { x: topEnd, y: top, inX: -(topEnd - topMid) / 3, inY: 0, outX: topRadius * k, outY: 0 },
    { x: right, y: top + topRadius, inX: 0, inY: -topRadius * k, outX: 0, outY: (rightMid - (top + topRadius)) / 3 },
    { x: right, y: rightMid, inX: 0, inY: -(rightMid - (top + topRadius)) / 3, outX: 0, outY: (bottom - rightMid) / 3 },
    { x: right, y: bottom, inX: 0, inY: -(bottom - rightMid) / 3, outX: -(right - bottomMid) / 3, outY: 0 },
    { x: bottomMid, y: bottom, inX: (right - bottomMid) / 3, inY: 0, outX: -(bottomMid - left) / 3, outY: 0 },
    { x: left, y: bottom, inX: (bottomMid - left) / 3, inY: 0, outX: 0, outY: -(bottom - lowerLeftY) / 3 },
    { x: left, y: lowerLeftY, inX: 0, inY: (bottom - lowerLeftY) / 3, outX: 0, outY: -(lowerLeftY - upperLeftY) / 3 },
    { x: left, y: upperLeftY, inX: 0, inY: (lowerLeftY - upperLeftY) / 3, outX: 0, outY: -(upperLeftY - (top + topRadius)) / 3 },
    { x: left, y: top + topRadius, inX: 0, inY: (upperLeftY - (top + topRadius)) / 3, outX: topLeftArcSplit.fromOut.x, outY: topLeftArcSplit.fromOut.y },
    topLeftArcSplit.midpoint,
  ];
};

const getD4LocalAmounts = (progress: number) => {
  'worklet';
  return [
    powerEase(local(progress, 0.13, 0.70), 2.5),
    powerEase(local(progress, 0.18, 0.76), 2.15),
    powerEase(local(progress, 0.30, 0.82), 2.5),
    smoothStep(local(progress, 0.26, 0.84)),
    smoothStep(local(progress, 0.30, 0.90)),
    smoothStep(local(progress, 0.32, 0.92)),
    smoothStep(local(progress, 0.38, 0.90)),
    smoothStep(local(progress, 0.38, 0.86)),
    smoothStep(local(progress, 0.36, 0.86)),
    smoothStep(local(progress, 0.28, 0.82)),
    powerEase(local(progress, 0.13, 0.72), 2.5),
    powerEase(local(progress, 0.15, 0.74), 2.3),
  ];
};

const getDestinationConvergence = (progress: number) => {
  'worklet';
  const early = 0.06 * smoothStep((progress - 0.45) / (0.62 - 0.45));
  const final = smoothStep((progress - 0.62) / (0.96 - 0.62));
  return early + (1 - early) * final;
};

const capHandles = (nodes: AnchoredUnfurlNode[]) => {
  'worklet';
  return nodes.map((node, index) => {
    const previous = nodes[(index + nodes.length - 1) % nodes.length];
    const next = nodes[(index + 1) % nodes.length];
    const incomingCap = Math.max(1, Math.hypot(node.x - previous.x, node.y - previous.y) * 0.72);
    const outgoingCap = Math.max(1, Math.hypot(next.x - node.x, next.y - node.y) * 0.72);
    const inLength = Math.hypot(node.inX, node.inY);
    const outLength = Math.hypot(node.outX, node.outY);
    const inScale = inLength > incomingCap ? incomingCap / inLength : 1;
    const outScale = outLength > outgoingCap ? outgoingCap / outLength : 1;
    return {
      ...node,
      inX: node.inX * inScale,
      inY: node.inY * inScale,
      outX: node.outX * outScale,
      outY: node.outY * outScale,
    };
  });
};

const alignOrganicTangents = (nodes: AnchoredUnfurlNode[]) => {
  'worklet';
  const capped = capHandles(nodes);
  return capped.map((node, index) => {
    // N5/N7 are the two intentional square bottom-corner tangent breaks.
    if (index === 5 || index === 7) return node;
    const inLength = Math.hypot(node.inX, node.inY);
    const outLength = Math.hypot(node.outX, node.outY);
    if (inLength < 0.0001 || outLength < 0.0001) return node;
    const forwardInX = -node.inX / inLength;
    const forwardInY = -node.inY / inLength;
    const forwardOutX = node.outX / outLength;
    const forwardOutY = node.outY / outLength;
    const tangentX = forwardInX + forwardOutX;
    const tangentY = forwardInY + forwardOutY;
    const tangentLength = Math.hypot(tangentX, tangentY);
    if (tangentLength < 0.0001) return node;
    const unitX = tangentX / tangentLength;
    const unitY = tangentY / tangentLength;
    return {
      ...node,
      inX: -unitX * inLength,
      inY: -unitY * inLength,
      outX: unitX * outLength,
      outY: unitY * outLength,
    };
  });
};

export const getD4AnchoredUnfurlNodes = (
  progress: number,
  fab: AnchoredUnfurlFrame,
  sheet: AnchoredUnfurlFrame,
  direction: D4MotionDirection = 'opening',
) => {
  'worklet';
  const p = clamp01(progress);
  const d3Config: AnchoredUnfurlConfig = direction === 'closing'
    ? D3_PRODUCTION_PACING
    : D3_PRODUCTION_OPENING_PACING;
  const d3Nodes = getAnchoredUnfurlNodes(p, fab, sheet, d3Config, 0).map((node) => ({ ...node }));
  const subdividedD3 = subdivideD3ContourToD4(d3Nodes);
  const d4Start = subdivideD3ContourToD4(
    getAnchoredUnfurlNodes(0, fab, sheet, d3Config, 0).map((node) => ({ ...node })),
  );
  const finalNodes = getD4FinalNodes(sheet);
  const amounts = getD4LocalAmounts(p);
  const independentD4 = capHandles(
    d4Start.map((node, index) => mixNode(node, finalNodes[index], amounts[index])),
  );
  const shoulderActivation = smootherStep((p - 0.30) / 0.10);
  const activated = subdividedD3.map((node, index) => mixNode(node, independentD4[index], shoulderActivation));
  const convergence = getDestinationConvergence(p);
  const converged = activated.map((node, index) => mixNode(node, finalNodes[index], convergence));
  if (p <= 0.30) return subdividedD3;
  if (p >= 1) return finalNodes;
  return alignOrganicTangents(converged);
};

export const buildD4AnchoredUnfurlPath = (
  progress: number,
  fab: AnchoredUnfurlFrame,
  sheet: AnchoredUnfurlFrame,
  direction: D4MotionDirection = 'opening',
) => {
  'worklet';
  const nodes = getD4AnchoredUnfurlNodes(progress, fab, sheet, direction);
  const path = Skia.Path.Make();
  path.moveTo(nodes[0].x, nodes[0].y);
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    const next = nodes[(index + 1) % nodes.length];
    path.cubicTo(
      current.x + current.outX,
      current.y + current.outY,
      next.x + next.inX,
      next.y + next.inY,
      next.x,
      next.y,
    );
  }
  path.close();
  return path;
};
