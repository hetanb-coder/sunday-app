import { Skia } from '@shopify/react-native-skia';

export type AnchoredUnfurlFrame = { x: number; y: number; width: number; height: number };
export type AnchoredUnfurlNode = { x: number; y: number; inX: number; inY: number; outX: number; outY: number };
export type AnchoredUnfurlConfig = {
  openingDuration: number; closingDuration: number; anticipationDuration: number;
  upperLeftReleaseStart: number; upperLeftCurve: number; widthLead: number;
  heightLag: number; anchorHold: number; anchorRelease: number; finalSettle: number;
  colorStart: number; colorDuration: number; fadeStart: number; fadeEnd: number;
  leadingBroadeningDelay: number; secondaryCatchUp: number; lowerCatchUp: number;
  leadingResolveDelay: number;
  secondaryResolveDelay: number; lowerResolveDelay: number;
  convergenceStart: number; convergenceMidpoint: number; convergenceEnd: number;
  earlyConvergenceAmount: number;
};

export const D3_TUNED_DEFAULTS: AnchoredUnfurlConfig = {
  openingDuration: 330, closingDuration: 290, anticipationDuration: 45,
  upperLeftReleaseStart: 0.13, upperLeftCurve: 2.5, widthLead: 0.04,
  heightLag: 0.04, anchorHold: 0.76, anchorRelease: 0.92, finalSettle: 0.9,
  colorStart: 0.86, colorDuration: 0.14, fadeStart: 0.4, fadeEnd: 0.55,
  leadingBroadeningDelay: 0, secondaryCatchUp: 0, lowerCatchUp: 0,
  leadingResolveDelay: 0,
  secondaryResolveDelay: 0, lowerResolveDelay: 0,
  convergenceStart: 1, convergenceMidpoint: 1, convergenceEnd: 1,
  earlyConvergenceAmount: 0,
};

export const D3_PRODUCTION_PACING: AnchoredUnfurlConfig = {
  ...D3_TUNED_DEFAULTS,
  openingDuration: 480,
  closingDuration: 400,
  anticipationDuration: 55,
};

export const D3_PRODUCTION_OPENING_PACING: AnchoredUnfurlConfig = {
  ...D3_PRODUCTION_PACING,
  openingDuration: 500,
  widthLead: -0.08,
  heightLag: 0.14,
  anchorHold: 0.3,
  anchorRelease: 0.9,
  leadingBroadeningDelay: 0.02,
  leadingResolveDelay: 0.18,
  secondaryCatchUp: 0.2,
  lowerCatchUp: 0.36,
  secondaryResolveDelay: 0.18,
  lowerResolveDelay: 0.22,
  convergenceStart: 0.45,
  convergenceMidpoint: 0.62,
  convergenceEnd: 0.96,
  earlyConvergenceAmount: 0.06,
  finalSettle: 0.92,
};

const clamp01 = (value: number) => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};
const smoothStep = (value: number) => {
  'worklet';
  const next = clamp01(value);
  return next * next * (3 - 2 * next);
};
const interpolateNode = (from: AnchoredUnfurlNode, to: AnchoredUnfurlNode, amount: number): AnchoredUnfurlNode => {
  'worklet';
  return {
    x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount,
    inX: from.inX + (to.inX - from.inX) * amount, inY: from.inY + (to.inY - from.inY) * amount,
    outX: from.outX + (to.outX - from.outX) * amount, outY: from.outY + (to.outY - from.outY) * amount,
  };
};

export const getAnchoredUnfurlNodes = (
  progress: number,
  fab: AnchoredUnfurlFrame,
  sheet: AnchoredUnfurlFrame,
  config: AnchoredUnfurlConfig = D3_TUNED_DEFAULTS,
  bottomCornerRadius = 30,
) => {
  'worklet';
  const fabX = fab.x + fab.width / 2;
  const fabY = fab.y + fab.height / 2;
  const fabScale = Math.max(fab.width, fab.height) / 58;
  const anticipation = clamp01(config.anticipationDuration / config.openingDuration);
  const pressure = smoothStep(progress / anticipation);
  const centerX = fabX - pressure * 0.7 * fabScale;
  const centerY = fabY - pressure * 0.9 * fabScale;
  const radiusX = fab.width / 2 + pressure * 0.7 * fabScale;
  const radiusY = fab.height / 2 - pressure * 0.5 * fabScale;
  const handle = 0.2652164898;
  const startNodes: AnchoredUnfurlNode[] = Array.from({ length: 8 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 4;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    return { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY, inX: -tangentX * radiusX * handle, inY: -tangentY * radiusY * handle, outX: tangentX * radiusX * handle, outY: tangentY * radiusY * handle };
  });
  const topRadius = 30;
  const bottomRadius = bottomCornerRadius;
  const k = 0.5522847498;
  const topEdge = Math.max(1, sheet.width - topRadius * 2);
  const bottomEdge = Math.max(1, sheet.width - bottomRadius * 2);
  const rightEdge = Math.max(1, sheet.height - topRadius - bottomRadius);
  const leftEdge = rightEdge;
  const left = sheet.x; const top = sheet.y; const right = sheet.x + sheet.width; const bottom = sheet.y + sheet.height;
  const finalNodes: AnchoredUnfurlNode[] = [
    { x: left + topRadius, y: top, inX: -topRadius * k, inY: 0, outX: topEdge / 3, outY: 0 },
    { x: right - topRadius, y: top, inX: -topEdge / 3, inY: 0, outX: topRadius * k, outY: 0 },
    { x: right, y: top + topRadius, inX: 0, inY: -topRadius * k, outX: 0, outY: rightEdge / 3 },
    { x: right, y: bottom - bottomRadius, inX: 0, inY: -rightEdge / 3, outX: 0, outY: bottomRadius * k },
    { x: right - bottomRadius, y: bottom, inX: bottomRadius * k, inY: 0, outX: -bottomEdge / 3, outY: 0 },
    { x: left + bottomRadius, y: bottom, inX: bottomEdge / 3, inY: 0, outX: -bottomRadius * k, outY: 0 },
    { x: left, y: bottom - bottomRadius, inX: 0, inY: bottomRadius * k, outX: 0, outY: -leftEdge / 3 },
    { x: left, y: top + topRadius, inX: 0, inY: leftEdge / 3, outX: 0, outY: -topRadius * k },
  ];
  const powerEase = (value: number) => 1 - Math.pow(1 - clamp01(value), config.upperLeftCurve);
  const local = (start: number, end: number, leading = false) => {
    const raw = clamp01((progress - start) / Math.max(0.01, end - start));
    return leading ? powerEase(raw) : smoothStep(raw);
  };
  const settleBoost = smoothStep((progress - config.finalSettle) / Math.max(0.01, 0.99 - config.finalSettle));
  const leadingBroadeningDelay = config.leadingBroadeningDelay;
  const leadingResolveDelay = config.leadingResolveDelay;
  const secondaryCatchUp = config.secondaryCatchUp;
  const lowerCatchUp = config.lowerCatchUp;
  const secondaryResolveDelay = config.secondaryResolveDelay;
  const lowerResolveDelay = config.lowerResolveDelay;
  const amounts = [
    local(0.13, 0.7, true),
    local(0.3, 0.82, true),
    local(0.38 - config.widthLead - secondaryCatchUp, 0.8 - secondaryCatchUp + secondaryResolveDelay),
    local(config.anchorHold, config.anchorRelease),
    local(config.anchorHold + 0.02, Math.min(0.99, config.anchorRelease + 0.02)),
    local(0.6 + config.heightLag - lowerCatchUp, 0.86 + config.heightLag - lowerCatchUp + lowerResolveDelay),
    local(0.42 + config.heightLag - secondaryCatchUp, 0.74 + config.heightLag - secondaryCatchUp + secondaryResolveDelay),
    local(0.13, 0.72, true),
  ].map((amount) => Math.max(amount, settleBoost));
  const nodes = startNodes.map((node, index) => interpolateNode(node, finalNodes[index], amounts[index]));
  const curvatureIn = smoothStep((progress - 0.26) / 0.14);
  const curvatureOut = 1 - smoothStep((progress - 0.52) / 0.16);
  const midCurvature = curvatureIn * curvatureOut;
  const curveShoulder = (fromIndex: number, toIndex: number, bendRatio: number) => {
    const from = nodes[fromIndex];
    const to = nodes[toIndex];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const normalX = dy / distance;
    const normalY = -dx / distance;
    const bend = Math.min(distance * bendRatio, 42 * fabScale);
    const targetOutX = dx * 0.34 + normalX * bend;
    const targetOutY = dy * 0.34 + normalY * bend;
    const targetInX = -dx * 0.34 + normalX * bend;
    const targetInY = -dy * 0.34 + normalY * bend;
    from.outX += (targetOutX - from.outX) * midCurvature;
    from.outY += (targetOutY - from.outY) * midCurvature;
    to.inX += (targetInX - to.inX) * midCurvature;
    to.inY += (targetInY - to.inY) * midCurvature;

    const tangentLengthCap = distance * 0.24;
    const fromIncomingLength = Math.min(Math.hypot(from.inX, from.inY), tangentLengthCap);
    const fromOutgoingLength = Math.max(1, Math.hypot(from.outX, from.outY));
    const toOutgoingLength = Math.min(Math.hypot(to.outX, to.outY), tangentLengthCap);
    const toIncomingLength = Math.max(1, Math.hypot(to.inX, to.inY));
    const alignedFromInX = -from.outX / fromOutgoingLength * fromIncomingLength;
    const alignedFromInY = -from.outY / fromOutgoingLength * fromIncomingLength;
    const alignedToOutX = -to.inX / toIncomingLength * toOutgoingLength;
    const alignedToOutY = -to.inY / toIncomingLength * toOutgoingLength;
    from.inX += (alignedFromInX - from.inX) * midCurvature;
    from.inY += (alignedFromInY - from.inY) * midCurvature;
    to.outX += (alignedToOutX - to.outX) * midCurvature;
    to.outY += (alignedToOutY - to.outY) * midCurvature;
  };
  curveShoulder(1, 2, 0.16);
  curveShoulder(6, 7, 0.1);
  const earlyConvergence = config.earlyConvergenceAmount * smoothStep(
    (progress - config.convergenceStart) /
    Math.max(0.01, config.convergenceMidpoint - config.convergenceStart),
  );
  const finalConvergence = smoothStep(
    (progress - config.convergenceMidpoint) /
    Math.max(0.01, config.convergenceEnd - config.convergenceMidpoint),
  );
  const convergence = earlyConvergence + (1 - earlyConvergence) * finalConvergence;
  return nodes.map((node, index) => interpolateNode(node, finalNodes[index], convergence));
};

export const buildAnchoredUnfurlPath = (
  progress: number,
  fab: AnchoredUnfurlFrame,
  sheet: AnchoredUnfurlFrame,
  config: AnchoredUnfurlConfig = D3_TUNED_DEFAULTS,
  bottomCornerRadius = 30,
) => {
  'worklet';
  const nodes = getAnchoredUnfurlNodes(progress, fab, sheet, config, bottomCornerRadius);
  const path = Skia.Path.Make();
  path.moveTo(nodes[0].x, nodes[0].y);
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index]; const next = nodes[(index + 1) % nodes.length];
    path.cubicTo(current.x + current.outX, current.y + current.outY, next.x + next.inX, next.y + next.inY, next.x, next.y);
  }
  path.close();
  return path;
};
