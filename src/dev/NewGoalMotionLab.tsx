import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { Plus, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolateColor, runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  buildAnchoredUnfurlPath,
  D3_TUNED_DEFAULTS,
  getAnchoredUnfurlNodes,
  type AnchoredUnfurlConfig,
} from '../motion/d3AnchoredUnfurl';
import { colors } from '../theme';

type Variant = 'A' | 'B' | 'C' | 'C2' | 'D' | 'D2' | 'D3' | 'D3T' | 'E' | 'F1' | 'F2' | 'F3';
type FocusRiseDestination = 'E1' | 'E2';
type FocusRiseEasing = 'BOriginal' | 'BSoftLaunch';
type Frame = { left: number; top: number; right: number; bottom: number };
type D3Node = { x: number; y: number; inX: number; inY: number; outX: number; outY: number };
type D3Tuning = AnchoredUnfurlConfig;
const CORAL = '#FF7D6C';
const CREAM = '#FFFDFB';
const OPEN_MS: Record<Variant, number> = { A: 300, B: 295, C: 300, C2: 350, D: 340, D2: 340, D3: 330, D3T: 330, E: 500, F1: 500, F2: 500, F3: 500 };
const CLOSE_MS: Record<Variant, number> = { A: 280, B: 275, C: 280, C2: 330, D: 320, D2: 315, D3: 290, D3T: 290, E: 380, F1: 380, F2: 380, F3: 380 };
const VARIANTS: Array<{ id: Variant; label: string }> = [
  { id: 'A', label: 'Ribbon' }, { id: 'B', label: 'Radial' }, { id: 'C', label: 'Wave' }, { id: 'C2', label: 'Liquid' }, { id: 'D', label: 'Metaball' }, { id: 'D2', label: 'Merge' }, { id: 'D3', label: 'Baseline' }, { id: 'D3T', label: 'Tuned' }, { id: 'E', label: 'Focus Rise' }, { id: 'F1', label: 'Soft Landing' }, { id: 'F2', label: 'Place & Settle' }, { id: 'F3', label: 'Lifted Card' },
];
const TUNING_CONTROLS: Array<{ key: keyof D3Tuning; label: string; step: number; min: number; max: number; digits?: number }> = [
  { key: 'openingDuration', label: 'Open ms', step: 5, min: 280, max: 380 },
  { key: 'closingDuration', label: 'Close ms', step: 5, min: 250, max: 340 },
  { key: 'anticipationDuration', label: 'Anticipation ms', step: 5, min: 25, max: 75 },
  { key: 'upperLeftReleaseStart', label: 'UL release start', step: 0.01, min: 0.05, max: 0.25, digits: 2 },
  { key: 'upperLeftCurve', label: 'UL acceleration', step: 0.1, min: 2, max: 5, digits: 2 },
  { key: 'widthLead', label: 'Width lead', step: 0.01, min: 0, max: 0.15, digits: 2 },
  { key: 'heightLag', label: 'Height lag', step: 0.01, min: 0, max: 0.15, digits: 2 },
  { key: 'anchorHold', label: 'Anchor hold', step: 0.01, min: 0.6, max: 0.85, digits: 2 },
  { key: 'anchorRelease', label: 'Anchor release', step: 0.01, min: 0.82, max: 0.98, digits: 2 },
  { key: 'finalSettle', label: 'Final settle', step: 0.01, min: 0.82, max: 0.96, digits: 2 },
  { key: 'colorStart', label: 'Color start', step: 0.01, min: 0.72, max: 0.94, digits: 2 },
  { key: 'colorDuration', label: 'Color duration', step: 0.01, min: 0.06, max: 0.25, digits: 2 },
  { key: 'fadeStart', label: '+ fade start', step: 0.01, min: 0.25, max: 0.55, digits: 2 },
  { key: 'fadeEnd', label: '+ fade end', step: 0.01, min: 0.4, max: 0.7, digits: 2 },
];
const clamp01 = (value: number) => { 'worklet'; return Math.max(0, Math.min(1, value)); };
const smoothStep = (value: number) => { 'worklet'; const next = clamp01(value); return next * next * (3 - 2 * next); };
const easeOutCubic = (value: number) => { 'worklet'; return 1 - Math.pow(1 - clamp01(value), 3); };
const emptyPath = () => { 'worklet'; return Skia.Path.Make(); };
const circlePath = (x: number, y: number, radius: number) => {
  'worklet';
  const path = Skia.Path.Make();
  path.addCircle(x, y, Math.max(0.5, radius));
  return path;
};
const sheetPath = (frame: Frame) => {
  'worklet';
  const path = Skia.Path.Make();
  path.addRRect(Skia.RRectXY(Skia.XYWHRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top), 30, 30));
  return path;
};

const ribbonPath = (progress: number, fabX: number, fabY: number, frame: Frame) => {
  'worklet';
  if (progress <= 0.15) {
    const pressure = smoothStep(progress / 0.15);
    return circlePath(fabX - pressure * 1.5, fabY - pressure * 1.5, 29 + pressure * 1.5);
  }
  const travel = easeOutCubic((progress - 0.15) / 0.48);
  const clear = smoothStep((progress - 0.76) / 0.24);
  if (clear >= 1) return emptyPath();
  const headX = fabX + (frame.left + (frame.right - frame.left) * 0.22 - fabX) * travel;
  const headY = fabY + (frame.top + (frame.bottom - frame.top) * 0.18 - fabY) * travel;
  const originRadius = 27 * (1 - smoothStep((progress - 0.2) / 0.5));
  const headHalf = 25 + travel * 52;
  const neckHalf = 18 + travel * 15;
  const retreatX = clear * 90;
  const retreatY = clear * 70;
  const path = Skia.Path.Make();
  path.moveTo(fabX, fabY + Math.max(2, originRadius));
  path.cubicTo(fabX - 28 * travel, fabY + neckHalf, headX - headHalf * 0.35, headY + headHalf, headX - retreatX, headY + headHalf - retreatY);
  path.cubicTo(headX - headHalf - retreatX, headY + headHalf * 0.15 - retreatY, headX - headHalf - retreatX, headY - headHalf * 0.72 - retreatY, headX - retreatX, headY - headHalf - retreatY);
  path.cubicTo(headX + headHalf * 0.55 - retreatX, headY - headHalf * 0.78 - retreatY, fabX + 10, fabY - neckHalf, fabX, fabY - Math.max(2, originRadius));
  path.cubicTo(fabX + Math.max(2, originRadius), fabY - 10, fabX + Math.max(2, originRadius), fabY + 10, fabX, fabY + Math.max(2, originRadius));
  path.close();
  return path;
};

const waveBandPath = (progress: number, frame: Frame, width: number, height: number) => {
  'worklet';
  const travel = easeOutCubic((progress - 0.14) / 0.68);
  if (travel <= 0 || progress >= 0.99) return emptyPath();
  const center = (width + height) * 0.72 * (1 - travel);
  const band = 78 + 24 * Math.sin(Math.PI * travel);
  const xBottom = frame.left + center + band;
  const xTop = frame.left + center - (frame.bottom - frame.top) * 0.64 + band;
  const path = Skia.Path.Make();
  path.moveTo(xBottom, frame.bottom + 20);
  path.cubicTo(xBottom - 34, frame.bottom * 0.78, xTop + 42, frame.top + (frame.bottom - frame.top) * 0.3, xTop, frame.top - 20);
  path.lineTo(xTop - band, frame.top - 20);
  path.cubicTo(xTop - band + 32, frame.top + (frame.bottom - frame.top) * 0.34, xBottom - band - 48, frame.bottom * 0.8, xBottom - band, frame.bottom + 20);
  path.close();
  return path;
};

const waveRevealPath = (progress: number, frame: Frame, width: number, height: number) => {
  'worklet';
  const travel = easeOutCubic((progress - 0.28) / 0.58);
  if (travel <= 0) return emptyPath();
  if (travel >= 0.99) return sheetPath(frame);
  const center = (width + height) * 0.72 * (1 - travel);
  const boundaryBottom = frame.left + center;
  const boundaryTop = frame.left + center - (frame.bottom - frame.top) * 0.64;
  const path = Skia.Path.Make();
  path.moveTo(boundaryBottom, frame.bottom + 20);
  path.cubicTo(boundaryBottom - 40, frame.bottom * 0.78, boundaryTop + 34, frame.top + (frame.bottom - frame.top) * 0.3, boundaryTop, frame.top - 20);
  path.lineTo(frame.right + 30, frame.top - 20);
  path.lineTo(frame.right + 30, frame.bottom + 20);
  path.close();
  return path;
};

const liquidTravel = (progress: number) => {
  'worklet';
  return smoothStep((progress - 0.12) / 0.88);
};

const liquidBoundaryPoints = (progress: number, frame: Frame) => {
  'worklet';
  const travel = liquidTravel(progress);
  const sheetWidth = frame.right - frame.left;
  const bend = Math.sin(Math.PI * travel);
  const bottomX = frame.right + 34 - travel * (sheetWidth + 88);
  const topX = bottomX - sheetWidth * (0.14 + bend * 0.05);
  return {
    travel,
    bottomX,
    topX,
    bottomControlX: bottomX + 34 * bend,
    topControlX: topX - 30 * bend,
  };
};

const liquidRevealPath = (progress: number, frame: Frame) => {
  'worklet';
  if (progress <= 0.12) return emptyPath();
  if (progress >= 0.995) return sheetPath(frame);
  const points = liquidBoundaryPoints(progress, frame);
  const span = frame.bottom - frame.top;
  const path = Skia.Path.Make();
  path.moveTo(points.bottomX, frame.bottom + 12);
  path.cubicTo(
    points.bottomControlX,
    frame.top + span * 0.72,
    points.topControlX,
    frame.top + span * 0.32,
    points.topX,
    frame.top - 12,
  );
  path.lineTo(frame.right + 24, frame.top - 12);
  path.lineTo(frame.right + 24, frame.bottom + 12);
  path.close();
  return path;
};

const liquidEdgePath = (progress: number, frame: Frame) => {
  'worklet';
  if (progress <= 0.12 || progress >= 0.995) return emptyPath();
  const points = liquidBoundaryPoints(progress, frame);
  const span = frame.bottom - frame.top;
  const thickness = 28;
  const path = Skia.Path.Make();
  path.moveTo(points.bottomX, frame.bottom + 12);
  path.cubicTo(points.bottomControlX, frame.top + span * 0.72, points.topControlX, frame.top + span * 0.32, points.topX, frame.top - 12);
  path.lineTo(points.topX + thickness, frame.top - 12);
  path.cubicTo(points.topControlX + thickness, frame.top + span * 0.32, points.bottomControlX + thickness, frame.top + span * 0.72, points.bottomX + thickness, frame.bottom + 12);
  path.close();
  return path;
};

const liquidLaunchPath = (progress: number, fabX: number, fabY: number) => {
  'worklet';
  if (progress <= 0.08) {
    const pressure = smoothStep(progress / 0.08);
    return circlePath(fabX - pressure * 0.6, fabY - pressure * 0.6, 29 + pressure * 0.6);
  }
  if (progress >= 0.3) return emptyPath();
  const pressure = smoothStep(progress / 0.16);
  const pull = easeOutCubic((progress - 0.08) / 0.2) * 34;
  const fade = 1 - smoothStep((progress - 0.2) / 0.1);
  const radius = 29 * fade;
  const path = Skia.Path.Make();
  path.moveTo(fabX, fabY - Math.max(1, radius));
  path.cubicTo(fabX - 10 - pull, fabY - radius - pressure * 2, fabX - radius - pull, fabY - 8, fabX - radius - pull, fabY);
  path.cubicTo(fabX - radius - pull, fabY + 10, fabX - 8, fabY + radius, fabX, fabY + radius);
  path.cubicTo(fabX + radius, fabY + radius * 0.55, fabX + radius, fabY - radius * 0.55, fabX, fabY - Math.max(1, radius));
  path.close();
  return path;
};

const metaballPath = (progress: number, fabX: number, fabY: number, frame: Frame) => {
  'worklet';
  if (progress <= 0.13) {
    const pressure = smoothStep(progress / 0.13);
    return circlePath(fabX - pressure * 0.8, fabY - pressure * 0.9, 29 + pressure * 0.8);
  }
  if (progress >= 0.995) return sheetPath(frame);

  const takeover = smoothStep((progress - 0.13) / 0.58);
  const lead = easeOutCubic(takeover);
  const catchUp = smoothStep((takeover - 0.08) / 0.92);
  const retention = 1 - smoothStep((progress - 0.5) / 0.22);
  const left = fabX - 30 + (frame.left - (fabX - 30)) * lead;
  const top = fabY - 38 + (frame.top - (fabY - 38)) * lead;
  const right = fabX + 17 + (frame.right - (fabX + 17)) * catchUp;
  const bottom = fabY + 19 + (frame.bottom - (fabY + 19)) * catchUp;
  const width = Math.max(2, right - left);
  const height = Math.max(2, bottom - top);
  const radius = 30 + 12 * Math.sin(Math.PI * takeover);
  const tl = Math.min(radius, width / 2, height / 2);
  const tr = Math.min(radius + 4, width / 2, height / 2);
  const bl = Math.min(radius + 6, width / 2, height / 2);
  const fabRadius = 29 - smoothStep((progress - 0.42) / 0.3) * 12;
  const entryY = Math.max(top + tr, Math.min(bottom - 22, fabY - fabRadius * 0.72));
  const mergeX = Math.max(left + bl, Math.min(right - 14, fabX - fabRadius * 0.72));

  const path = Skia.Path.Make();
  path.moveTo(left + tl, top);
  path.cubicTo(left + width * 0.34, top - 2 * takeover, left + width * 0.68, top - 2 * takeover, right - tr, top);
  path.cubicTo(right - tr * 0.45, top, right, top + tr * 0.45, right, top + tr);
  path.cubicTo(right + 1.5 * takeover, top + height * 0.34, right + 1.5 * takeover, entryY - 12, right, entryY);

  if (retention > 0.001) {
    const bridgeWidth = 22 + retention * 18;
    path.cubicTo(
      right - bridgeWidth * 0.15,
      entryY + bridgeWidth * 0.2,
      fabX + fabRadius * 0.76,
      fabY - fabRadius,
      fabX,
      fabY - fabRadius,
    );
    path.cubicTo(fabX + fabRadius * 0.72, fabY - fabRadius, fabX + fabRadius, fabY - fabRadius * 0.55, fabX + fabRadius, fabY);
    path.cubicTo(fabX + fabRadius, fabY + fabRadius * 0.55, fabX + fabRadius * 0.72, fabY + fabRadius, fabX, fabY + fabRadius);
    path.cubicTo(
      fabX - fabRadius * 0.65,
      fabY + fabRadius,
      mergeX + bridgeWidth * 0.3,
      bottom + bridgeWidth * 0.08,
      mergeX,
      bottom,
    );
  } else {
    path.cubicTo(right, bottom - 18, right - 8, bottom, right - 24, bottom);
    path.lineTo(mergeX, bottom);
  }

  path.cubicTo(left + width * 0.62, bottom + 1.5 * takeover, left + width * 0.32, bottom + 1.5 * takeover, left + bl, bottom);
  path.cubicTo(left + bl * 0.45, bottom, left, bottom - bl * 0.45, left, bottom - bl);
  path.cubicTo(left - takeover, top + height * 0.68, left - takeover, top + height * 0.32, left, top + tl);
  path.cubicTo(left, top + tl * 0.45, left + tl * 0.45, top, left + tl, top);
  path.close();
  return path;
};

const organicSettlePath = (progress: number, frame: Frame) => {
  'worklet';
  const settle = smoothStep((progress - 0.78) / 0.22);
  const left = frame.left + 18 * (1 - settle);
  const top = frame.top + 28 * (1 - settle);
  const right = frame.right - 4 * (1 - settle);
  const bottom = frame.bottom - 3 * (1 - settle);
  const width = right - left;
  const height = bottom - top;
  const tl = 30 + 52 * (1 - settle);
  const tr = 30 + 40 * (1 - settle);
  const br = 30 + 30 * (1 - settle);
  const bl = 30 + 46 * (1 - settle);
  const bow = 12 * (1 - settle);
  const path = Skia.Path.Make();
  path.moveTo(left + tl, top);
  path.cubicTo(left + width * 0.34, top - bow, left + width * 0.68, top - bow * 0.55, right - tr, top);
  path.cubicTo(right - tr * 0.45, top, right, top + tr * 0.45, right, top + tr);
  path.cubicTo(right + bow * 0.35, top + height * 0.34, right + bow * 0.2, top + height * 0.68, right, bottom - br);
  path.cubicTo(right, bottom - br * 0.45, right - br * 0.45, bottom, right - br, bottom);
  path.cubicTo(left + width * 0.68, bottom + bow * 0.45, left + width * 0.34, bottom + bow, left + bl, bottom);
  path.cubicTo(left + bl * 0.45, bottom, left, bottom - bl * 0.45, left, bottom - bl);
  path.cubicTo(left - bow * 0.25, top + height * 0.68, left - bow * 0.4, top + height * 0.34, left, top + tl);
  path.cubicTo(left, top + tl * 0.45, left + tl * 0.45, top, left + tl, top);
  path.close();
  return path;
};

const metaballMergePath = (progress: number, fabX: number, fabY: number, frame: Frame) => {
  'worklet';
  if (progress <= 0.15) {
    const pressure = smoothStep(progress / 0.15);
    return circlePath(fabX - pressure * 0.7, fabY - pressure * 0.8, 29 + pressure * 0.7);
  }
  if (progress >= 0.72) return organicSettlePath(progress, frame);

  const takeover = smoothStep((progress - 0.15) / 0.55);
  const sheetWidth = frame.right - frame.left;
  const sheetHeight = frame.bottom - frame.top;
  const finalCenterX = (frame.left + frame.right) / 2 + 8;
  const finalCenterY = (frame.top + frame.bottom) / 2 + 18;
  const centerX = fabX - 36 + (finalCenterX - (fabX - 36)) * easeOutCubic(takeover);
  const centerY = fabY - 42 + (finalCenterY - (fabY - 42)) * easeOutCubic(takeover);
  const radiusX = 27 + (sheetWidth * 0.48 - 27) * easeOutCubic(takeover);
  const radiusY = 30 + (sheetHeight * 0.46 - 30) * smoothStep(takeover);
  const fabRadius = 29 - 18 * smoothStep((progress - 0.38) / 0.32);
  const connection = 1 - smoothStep((progress - 0.58) / 0.14);
  const bridge = 26 + 18 * connection;
  const upperX = centerX + radiusX * 0.78;
  const upperY = centerY + radiusY * 0.08;
  const lowerX = centerX + radiusX * 0.62;
  const lowerY = centerY + radiusY * 0.76;

  const path = Skia.Path.Make();
  path.moveTo(centerX, centerY - radiusY);
  path.cubicTo(centerX - radiusX * 0.62, centerY - radiusY, centerX - radiusX, centerY - radiusY * 0.55, centerX - radiusX, centerY);
  path.cubicTo(centerX - radiusX, centerY + radiusY * 0.58, centerX - radiusX * 0.58, centerY + radiusY, centerX, centerY + radiusY);
  path.cubicTo(centerX + radiusX * 0.38, centerY + radiusY, lowerX - bridge * 0.5, lowerY + bridge * 0.12, lowerX, lowerY);
  path.cubicTo(lowerX + bridge * 0.5, lowerY + bridge * 0.05, fabX - fabRadius * 0.72, fabY + fabRadius, fabX, fabY + fabRadius);
  path.cubicTo(fabX + fabRadius * 0.72, fabY + fabRadius, fabX + fabRadius, fabY + fabRadius * 0.55, fabX + fabRadius, fabY);
  path.cubicTo(fabX + fabRadius, fabY - fabRadius * 0.55, fabX + fabRadius * 0.72, fabY - fabRadius, fabX, fabY - fabRadius);
  path.cubicTo(fabX - fabRadius * 0.68, fabY - fabRadius, upperX + bridge * 0.45, upperY - bridge * 0.15, upperX, upperY);
  path.cubicTo(centerX + radiusX, centerY - radiusY * 0.48, centerX + radiusX * 0.6, centerY - radiusY, centerX, centerY - radiusY);
  path.close();
  return path;
};

const d3Local = (progress: number, start: number, end: number, leading = false) => {
  'worklet';
  const raw = clamp01((progress - start) / (end - start));
  return leading ? easeOutCubic(raw) : smoothStep(raw);
};

const interpolateNode = (from: D3Node, to: D3Node, amount: number): D3Node => {
  'worklet';
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    inX: from.inX + (to.inX - from.inX) * amount,
    inY: from.inY + (to.inY - from.inY) * amount,
    outX: from.outX + (to.outX - from.outX) * amount,
    outY: from.outY + (to.outY - from.outY) * amount,
  };
};

const anchoredUnfurlPath = (progress: number, fabX: number, fabY: number, frame: Frame) => {
  'worklet';
  const pressure = smoothStep(progress / 0.12);
  const centerX = fabX - pressure * 0.7;
  const centerY = fabY - pressure * 0.9;
  const radiusX = 29 + pressure * 0.7;
  const radiusY = 29 - pressure * 0.5;
  const handle = 0.2652164898;
  const startNodes: D3Node[] = Array.from({ length: 8 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 4;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    return {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      inX: -tangentX * radiusX * handle,
      inY: -tangentY * radiusY * handle,
      outX: tangentX * radiusX * handle,
      outY: tangentY * radiusY * handle,
    };
  });

  const radius = 30;
  const k = 0.5522847498;
  const topEdge = Math.max(1, frame.right - frame.left - radius * 2);
  const sideEdge = Math.max(1, frame.bottom - frame.top - radius * 2);
  const finalNodes: D3Node[] = [
    { x: frame.left + radius, y: frame.top, inX: -radius * k, inY: 0, outX: topEdge / 3, outY: 0 },
    { x: frame.right - radius, y: frame.top, inX: -topEdge / 3, inY: 0, outX: radius * k, outY: 0 },
    { x: frame.right, y: frame.top + radius, inX: 0, inY: -radius * k, outX: 0, outY: sideEdge / 3 },
    { x: frame.right, y: frame.bottom - radius, inX: 0, inY: -sideEdge / 3, outX: 0, outY: radius * k },
    { x: frame.right - radius, y: frame.bottom, inX: radius * k, inY: 0, outX: -topEdge / 3, outY: 0 },
    { x: frame.left + radius, y: frame.bottom, inX: topEdge / 3, inY: 0, outX: -radius * k, outY: 0 },
    { x: frame.left, y: frame.bottom - radius, inX: 0, inY: radius * k, outX: 0, outY: -sideEdge / 3 },
    { x: frame.left, y: frame.top + radius, inX: 0, inY: sideEdge / 3, outX: 0, outY: -radius * k },
  ];
  const localProgress = [
    d3Local(progress, 0.12, 0.55, true),
    d3Local(progress, 0.2, 0.68, true),
    d3Local(progress, 0.38, 0.8),
    d3Local(progress, 0.75, 0.92),
    d3Local(progress, 0.78, 0.94),
    d3Local(progress, 0.6, 0.86),
    d3Local(progress, 0.42, 0.74),
    d3Local(progress, 0.12, 0.58, true),
  ];
  const nodes = startNodes.map((node, index) => interpolateNode(node, finalNodes[index], localProgress[index]));
  if (progress >= 0.995) return sheetPath(frame);
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

export function NewGoalMotionLab() {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [opened, setOpened] = useState(false);
  const [variant, setVariant] = useState<Variant>('C');
  const [speed, setSpeed] = useState<1 | 0.5 | 0.25>(1);
  const [playing, setPlaying] = useState(false);
  const [debugPath, setDebugPath] = useState(false);
  const [tuningOpen, setTuningOpen] = useState(false);
  const [tuning, setTuning] = useState<D3Tuning>(D3_TUNED_DEFAULTS);
  const [focusRiseDestination, setFocusRiseDestination] = useState<FocusRiseDestination>('E1');
  const [focusRiseEasing, setFocusRiseEasing] = useState<FocusRiseEasing>('BSoftLaunch');
  const [trackWidth, setTrackWidth] = useState(1);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progress = useSharedValue(0);
  const focusRiseClosing = useSharedValue(0);
  const fabLeft = width - 80;
  const fabTop = height - 154;
  const fabX = fabLeft + 29;
  const fabY = fabTop + 29;
  const frame = useMemo<Frame>(() => ({ left: 14, top: Math.max(120, height * 0.25), right: width - 14, bottom: height - 24 }), [height, width]);
  const focusStudy = variant === 'E' || variant === 'F1' || variant === 'F2' || variant === 'F3';
  const foregroundLandingStudy = variant === 'F1' || variant === 'F2' || variant === 'F3';
  const d3FabFrame = useMemo(() => ({ x: fabLeft, y: fabTop, width: 58, height: 58 }), [fabLeft, fabTop]);
  const d3SheetFrame = useMemo(() => ({ x: frame.left, y: frame.top, width: frame.right - frame.left, height: frame.bottom - frame.top }), [frame]);
  const fixedSheet = useMemo(() => sheetPath(frame), [frame]);

  const ribbon = useDerivedValue(() => ribbonPath(progress.value, fabX, fabY, frame), [fabX, fabY, frame]);
  const ribbonReveal = useDerivedValue(() => {
    const reveal = smoothStep((progress.value - 0.3) / 0.54);
    if (reveal <= 0) return emptyPath();
    if (reveal >= 0.99) return sheetPath(frame);
    const path = Skia.Path.Make();
    path.addCircle(frame.right, frame.bottom, reveal * Math.hypot(frame.right - frame.left, frame.bottom - frame.top) * 1.12);
    return path;
  }, [frame]);
  const radialRadius = useDerivedValue(() => smoothStep((progress.value - 0.16) / 0.58) * Math.hypot(frame.right - frame.left, frame.bottom - frame.top) * 1.08, [frame]);
  const radialInnerRadius = useDerivedValue(() => smoothStep((progress.value - 0.3) / 0.5) * Math.hypot(frame.right - frame.left, frame.bottom - frame.top) * 1.08, [frame]);
  const waveBand = useDerivedValue(() => waveBandPath(progress.value, frame, width, height), [frame, height, width]);
  const waveReveal = useDerivedValue(() => waveRevealPath(progress.value, frame, width, height), [frame, height, width]);
  const liquidReveal = useDerivedValue(() => liquidRevealPath(progress.value, frame), [frame]);
  const liquidEdge = useDerivedValue(() => liquidEdgePath(progress.value, frame), [frame]);
  const liquidLaunch = useDerivedValue(() => liquidLaunchPath(progress.value, fabX, fabY), [fabX, fabY]);
  const metaball = useDerivedValue(() => metaballPath(progress.value, fabX, fabY, frame), [fabX, fabY, frame]);
  const metaballColor = useDerivedValue(() => interpolateColor(
    progress.value,
    [0, 0.76, 1],
    [CORAL, CORAL, CREAM],
  ));
  const metaballMerge = useDerivedValue(() => metaballMergePath(progress.value, fabX, fabY, frame), [fabX, fabY, frame]);
  const metaballMergeColor = useDerivedValue(() => interpolateColor(
    progress.value,
    [0, 0.78, 1],
    [CORAL, CORAL, CREAM],
  ));
  const anchoredUnfurl = useDerivedValue(() => anchoredUnfurlPath(progress.value, fabX, fabY, frame), [fabX, fabY, frame]);
  const anchoredUnfurlColor = useDerivedValue(() => interpolateColor(
    progress.value,
    [0, 0.8, 1],
    [CORAL, CORAL, CREAM],
  ));
  const anchoredUnfurlTuned = useDerivedValue(
    () => buildAnchoredUnfurlPath(progress.value, d3FabFrame, d3SheetFrame, tuning, 30),
    [d3FabFrame, d3SheetFrame, tuning],
  );
  const anchoredUnfurlTunedColor = useDerivedValue(() => interpolateColor(
    progress.value,
    [0, tuning.colorStart, Math.min(1, tuning.colorStart + tuning.colorDuration)],
    [CORAL, CORAL, CREAM],
  ), [tuning]);
  const pressureOpacity = useDerivedValue(() => 1 - smoothStep((progress.value - 0.16) / 0.2));
  const materialOpacity = useDerivedValue(() => 1 - smoothStep((progress.value - 0.78) / 0.22));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: focusStudy
      ? 1 - smoothStep((progress.value - 0.12) / 0.18)
      : 1 - smoothStep((progress.value - (variant === 'D3T' ? tuning.fadeStart : variant === 'D' || variant === 'D2' || variant === 'D3' ? 0.2 : 0.12)) / (variant === 'D3T' ? Math.max(0.01, tuning.fadeEnd - tuning.fadeStart) : variant === 'D' || variant === 'D2' || variant === 'D3' ? 0.34 : 0.3)),
    transform: [{ scale: 1 - Math.sin(Math.PI * Math.min(progress.value / (focusStudy ? 0.17 : 0.16), 1)) * 0.05 }],
  }), [focusStudy, tuning, variant]);
  const focusRiseHomeStyle = useAnimatedStyle(() => {
    const depth = smoothStep((progress.value - 0.1) / 0.5);
    const finalScaleReduction = foregroundLandingStudy ? 0.018 : 0.015;
    return { transform: [{ scale: 1 - depth * finalScaleReduction }, { translateY: -depth * 3 }] };
  }, [foregroundLandingStudy]);
  const focusRiseBackdropStyle = useAnimatedStyle(() => ({
    opacity: smoothStep((progress.value - 0.1) / 0.48) * 0.14,
  }));
  const focusRiseFabStyle = useAnimatedStyle(() => {
    const pressure = Math.sin(Math.PI * Math.min(progress.value / 0.17, 1));
    return {
      opacity: 1 - smoothStep((progress.value - 0.12) / 0.18),
      transform: [{ scale: 1 - pressure * 0.05 }],
    };
  });
  const focusRiseSurfaceStyle = useAnimatedStyle(() => {
    const p = clamp01(progress.value);
    const arrival = p;
    const destinationTop = variant === 'F3' ? 22 : variant === 'F1' || variant === 'F2' ? 20 : focusRiseDestination === 'E1' ? 18 : 0;
    const sideMargin = variant === 'F3' ? 14 : 0;
    const closeElapsed = 1 - p;
    const translateY = height + (destinationTop - height) * p;
    const radiusResolve = variant === 'E' && focusRiseDestination === 'E2' ? smoothStep((p - 0.68) / 0.32) : 0;
    const settleScale = variant === 'F2'
      ? focusRiseClosing.value
        ? 1 - 0.006 * smoothStep(closeElapsed / 0.12)
        : 1 - 0.006 * smoothStep((arrival - 0.72) / 0.16) * (1 - smoothStep((arrival - 0.88) / 0.12))
      : 1;
    const separation = smoothStep((arrival - 0.25) / 0.55);
    const finalShadowOpacity = variant === 'F3' ? 0.18 : variant === 'F2' ? 0.14 : 0.12;
    return {
      left: sideMargin,
      right: sideMargin,
      height: variant === 'F3' ? Math.max(1, height - destinationTop - 14) : height,
      transform: [{ translateY }, { scale: settleScale }],
      borderTopLeftRadius: 30 * (1 - radiusResolve),
      borderTopRightRadius: 30 * (1 - radiusResolve),
      borderBottomLeftRadius: variant === 'F3' ? 30 : 0,
      borderBottomRightRadius: variant === 'F3' ? 30 : 0,
      shadowOpacity: foregroundLandingStudy
        ? finalShadowOpacity * separation
        : 0.12,
      shadowRadius: foregroundLandingStudy
        ? 12 + separation * (variant === 'F3' ? 20 : 16)
        : 24,
      elevation: foregroundLandingStudy ? Math.round(separation * (variant === 'F3' ? 14 : 10)) : 0,
    };
  }, [focusRiseDestination, foregroundLandingStudy, height, variant]);
  const focusRiseHeaderStyle = useAnimatedStyle(() => {
    const reveal = smoothStep((progress.value - 0.72) / 0.18);
    return { opacity: reveal, transform: [{ translateY: (1 - reveal) * 6 }] };
  });
  const focusRiseInputStyle = useAnimatedStyle(() => {
    const reveal = smoothStep((progress.value - 0.76) / 0.18);
    return { opacity: reveal, transform: [{ translateY: (1 - reveal) * 6 }] };
  });
  const focusRiseControlsStyle = useAnimatedStyle(() => {
    const reveal = smoothStep((progress.value - 0.8) / 0.18);
    return { opacity: reveal, transform: [{ translateY: (1 - reveal) * 6 }] };
  });

  const debugNodes = useMemo(
    () => getAnchoredUnfurlNodes(displayProgress, d3FabFrame, d3SheetFrame, tuning, 30),
    [displayProgress, d3FabFrame, d3SheetFrame, tuning],
  );
  const debugHandles = useMemo(() => {
    const path = Skia.Path.Make();
    debugNodes.forEach((node) => {
      path.moveTo(node.x, node.y); path.lineTo(node.x + node.inX, node.y + node.inY);
      path.moveTo(node.x, node.y); path.lineTo(node.x + node.outX, node.y + node.outY);
    });
    return path;
  }, [debugNodes]);

  const syncProgress = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    focusRiseClosing.value = 0;
    progress.value = next;
    setDisplayProgress(next);
    setOpened(next >= 0.99);
    setPlaying(false);
  };
  const playOpen = () => {
    setOpened(true);
    setPlaying(true);
    const duration = variant === 'D3T' ? tuning.openingDuration : OPEN_MS[variant];
    focusRiseClosing.value = 0;
    if (focusStudy) {
      const focusEasing = focusRiseEasing === 'BOriginal'
        ? Easing.bezier(0.22, 1, 0.36, 1)
        : Easing.bezier(0.25, 0.96, 0.36, 1);
      progress.value = withTiming(1, { duration: 500 / speed, easing: focusEasing }, (finished) => {
        if (finished) { runOnJS(setDisplayProgress)(1); runOnJS(setPlaying)(false); }
      });
      return;
    }
    const easing = Easing.bezier(0.2, 0.78, 0.2, 1);
    progress.value = withTiming(1, { duration: duration / speed, easing }, (finished) => {
      if (finished) { runOnJS(setDisplayProgress)(1); runOnJS(setPlaying)(false); }
    });
  };
  const playClose = () => {
    setPlaying(true);
    focusRiseClosing.value = focusStudy ? 1 : 0;
    const duration = variant === 'D3T' ? tuning.closingDuration : CLOSE_MS[variant];
    const easing = focusStudy ? Easing.bezier(0.4, 0, 0.8, 0.2) : Easing.bezier(0.55, 0, 0.25, 1);
    progress.value = withTiming(0, { duration: duration / speed, easing }, (finished) => {
      if (finished) { focusRiseClosing.value = 0; runOnJS(setDisplayProgress)(0); runOnJS(setOpened)(false); }
      if (finished) runOnJS(setPlaying)(false);
    });
  };
  const selectVariant = (next: Variant) => { setVariant(next); setTuningOpen(false); setDebugPath(false); syncProgress(0); };
  const adjustTuning = (key: keyof D3Tuning, delta: number, min: number, max: number) => {
    setTuning((current) => ({ ...current, [key]: Math.max(min, Math.min(max, Number((current[key] + delta).toFixed(3)))) }));
  };
  const scrubResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => syncProgress(event.nativeEvent.locationX / trackWidth),
    onPanResponderMove: (event) => syncProgress(event.nativeEvent.locationX / trackWidth),
  }), [trackWidth]);

  if (!__DEV__) return null;
  return (
    <>
      <Pressable style={styles.launcher} onPress={() => setVisible(true)}><Text style={styles.launcherText}>MOTION</Text></Pressable>
      <Modal visible={visible} animationType="none" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stage}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => opened && playClose()} />
            <View pointerEvents="box-none" style={styles.header}>
              <View><Text style={styles.kicker}>DEVELOPMENT ONLY</Text><Text style={styles.title}>New Goal Motion Lab</Text></View>
              <Pressable onPress={() => setVisible(false)} style={styles.close}><X size={18} color="#52525B" /></Pressable>
            </View>
            <View style={styles.selector}>
              {VARIANTS.map((item) => (
                <Pressable key={item.id} onPress={() => selectVariant(item.id)} style={[styles.variant, variant === item.id && styles.variantActive]}>
                  <Text style={[styles.variantLetter, variant === item.id && styles.variantTextActive]}>{item.id}</Text>
                  <Text style={[styles.variantLabel, variant === item.id && styles.variantTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            {focusStudy ? (
              <>
                <Animated.View pointerEvents="none" style={[styles.focusRiseHome, focusRiseHomeStyle]}>
                  <Text style={styles.focusRiseHomeEyebrow}>TODAY</Text>
                  <Text style={styles.focusRiseHomeTitle}>Your focus</Text>
                  <View style={styles.focusRiseHero}><View style={styles.focusRiseHeroAccent} /><View style={styles.focusRiseHeroBody}><View style={styles.focusRiseLineWide} /><View style={styles.focusRiseLineShort} /></View></View>
                  <View style={styles.focusRiseCards}><View style={styles.focusRiseCard} /><View style={styles.focusRiseCard} /></View>
                  <View style={styles.navMock}><View style={styles.navPill} /><View style={styles.navPill} /><View style={styles.navPill} /></View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.focusRiseBackdrop, focusRiseBackdropStyle]} />
                <Animated.View pointerEvents="none" style={[styles.focusRiseSurface, foregroundLandingStudy && styles.foregroundLandingSurface, focusRiseSurfaceStyle]}>
                  <Animated.View style={[styles.focusRiseContentHeader, focusRiseHeaderStyle]}>
                    <Text style={styles.focusRiseKicker}>CREATE</Text>
                    <Text style={styles.focusRiseTitle}>New Goal</Text>
                    <Text style={styles.focusRiseSubtitle}>What would feel meaningful to move forward?</Text>
                  </Animated.View>
                  <Animated.View style={[styles.focusRiseInputGroup, focusRiseInputStyle]}>
                    <Text style={styles.focusRiseLabel}>GOAL</Text>
                    <View style={styles.focusRiseInput}><Text style={styles.focusRisePlaceholder}>Name your next goal</Text></View>
                  </Animated.View>
                  <Animated.View style={[styles.focusRiseSupportGroup, focusRiseControlsStyle]}>
                    <Text style={styles.focusRiseLabel}>MAKE IT YOURS</Text>
                    <View style={styles.focusRiseChips}><View style={styles.focusRiseChip}><Text style={styles.focusRiseChipText}>Personal</Text></View><View style={styles.focusRiseChip}><Text style={styles.focusRiseChipText}>No due date</Text></View></View>
                    <View style={styles.focusRiseCreate}><Text style={styles.focusRiseCreateText}>Create Goal</Text></View>
                  </Animated.View>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.focusRiseFab, { left: fabLeft, top: fabTop }, focusRiseFabStyle]} />
              </>
            ) : <View pointerEvents="none" style={styles.navMock}><View style={styles.navPill} /><View style={styles.navPill} /><View style={styles.navPill} /></View>}
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              {variant === 'A' && <><Group clip={fixedSheet}><Path path={ribbonReveal} color={CREAM} /></Group><Path path={ribbon} color={CORAL} opacity={materialOpacity} /></>}
              {variant === 'B' && <><Group clip={fixedSheet}><Circle cx={frame.right} cy={frame.bottom} r={radialRadius} color={CORAL} /><Circle cx={frame.right} cy={frame.bottom} r={radialInnerRadius} color={CREAM} /></Group><Circle cx={fabX} cy={fabY} r={29} color={CORAL} opacity={pressureOpacity} /></>}
              {variant === 'C' && <><Group clip={fixedSheet}><Path path={waveReveal} color={CREAM} /></Group><Path path={waveBand} color={CORAL} /><Circle cx={fabX} cy={fabY} r={29} color={CORAL} opacity={pressureOpacity} /></>}
              {variant === 'C2' && <><Group clip={fixedSheet}><Path path={liquidReveal} color={CREAM} /><Path path={liquidEdge} color={CORAL} /></Group><Path path={liquidLaunch} color={CORAL} /></>}
              {variant === 'D' && <Path path={metaball} color={metaballColor} />}
              {variant === 'D2' && <Path path={metaballMerge} color={metaballMergeColor} />}
              {variant === 'D3' && <Path path={anchoredUnfurl} color={anchoredUnfurlColor} />}
              {variant === 'D3T' && <Path path={anchoredUnfurlTuned} color={anchoredUnfurlTunedColor} />}
              {variant === 'D3T' && debugPath && !playing && <><Path path={debugHandles} color="rgba(80,70,110,0.55)" style="stroke" strokeWidth={1} />{debugNodes.map((node, index) => <React.Fragment key={index}><Circle cx={node.x} cy={node.y} r={4} color={index === 3 || index === 4 ? '#7C3AED' : '#2563EB'} /><Circle cx={node.x + node.inX} cy={node.y + node.inY} r={2.5} color="#8B5CF6" /><Circle cx={node.x + node.outX} cy={node.y + node.outY} r={2.5} color="#8B5CF6" /></React.Fragment>)}<Circle cx={(debugNodes[3].x + debugNodes[4].x) / 2} cy={(debugNodes[3].y + debugNodes[4].y) / 2} r={28} color="rgba(124,58,237,0.12)" /></>}
            </Canvas>
            <Animated.View pointerEvents="none" style={[styles.plus, { left: fabLeft + 15, top: fabTop + 15 }, plusStyle]}><Plus size={28} color="#fff" strokeWidth={2.7} /></Animated.View>
            {!opened && <Pressable style={[styles.fabHit, { left: fabLeft, top: fabTop }]} onPress={playOpen} />}
            {opened && <Pressable style={[styles.surfaceHit, { top: frame.top }]} onPress={() => {}} />}
            {variant === 'D3T' && <View style={styles.tunedActions}><Pressable onPress={() => setTuningOpen((current) => !current)} style={[styles.tunedAction, tuningOpen && styles.tunedActionActive]}><Text style={styles.tunedActionText}>TUNE</Text></Pressable><Pressable disabled={playing} onPress={() => setDebugPath((current) => !current)} style={[styles.tunedAction, debugPath && styles.tunedActionActive, playing && styles.tunedActionDisabled]}><Text style={styles.tunedActionText}>DEBUG PATH</Text></Pressable></View>}
            {variant === 'E' && <View style={styles.focusRiseVariantToggle}><Pressable onPress={() => setFocusRiseDestination('E1')} style={[styles.tunedAction, focusRiseDestination === 'E1' && styles.tunedActionActive]}><Text style={styles.tunedActionText}>E1 NEAR FULL</Text></Pressable><Pressable onPress={() => setFocusRiseDestination('E2')} style={[styles.tunedAction, focusRiseDestination === 'E2' && styles.tunedActionActive]}><Text style={styles.tunedActionText}>E2 FULL</Text></Pressable></View>}
            {foregroundLandingStudy && (
              <View style={styles.focusRiseMetrics}>
                <Text style={styles.focusRiseMetricText}>Overshoot 0px</Text>
                <Text style={styles.focusRiseMetricText}>Recoil 0px</Text>
                <Text style={styles.focusRiseMetricText}>Top {variant === 'F3' ? 22 : 20}px</Text>
                <Text style={styles.focusRiseMetricText}>Surface {variant === 'F2' ? '0.994→1' : '1.000'}</Text>
                <Text style={styles.focusRiseMetricText}>Home 0.982</Text>
              </View>
            )}
            {focusStudy && (
              <View style={styles.focusRiseEasingSelector}>
                {([
                  { value: 'BOriginal', label: 'B Original' },
                  { value: 'BSoftLaunch', label: 'B Soft Launch' },
                ] as const).map(({ value, label }) => (
                  <Pressable
                    key={value}
                    onPress={() => setFocusRiseEasing(value)}
                    style={[styles.focusRiseEasingOption, focusRiseEasing === value && styles.focusRiseEasingOptionActive]}
                  >
                    <Text style={[styles.focusRiseEasingText, focusRiseEasing === value && styles.focusRiseEasingTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {variant === 'D3T' && tuningOpen && <View style={styles.tuningPanel}><ScrollView contentContainerStyle={styles.tuningContent}>{TUNING_CONTROLS.map((control) => <View key={control.key} style={styles.tuningRow}><Text style={styles.tuningLabel}>{control.label}</Text><Pressable onPress={() => adjustTuning(control.key, -control.step, control.min, control.max)} style={styles.stepper}><Text style={styles.stepperText}>−</Text></Pressable><Text style={styles.tuningValue}>{tuning[control.key].toFixed(control.digits ?? 0)}</Text><Pressable onPress={() => adjustTuning(control.key, control.step, control.min, control.max)} style={styles.stepper}><Text style={styles.stepperText}>+</Text></Pressable></View>)}</ScrollView></View>}
            <View style={styles.controls}>
              <View style={styles.speedRow}>
                {([1, 0.5, 0.25] as const).map((value) => <Pressable key={value} onPress={() => setSpeed(value)} style={[styles.speed, speed === value && styles.speedActive]}><Text style={[styles.speedText, speed === value && styles.speedTextActive]}>{value}x</Text></Pressable>)}
                {focusStudy && !opened && <Pressable onPress={playOpen} style={styles.closeMotion}><Text style={styles.closeMotionText}>Play Open</Text></Pressable>}
                {opened && <Pressable onPress={playClose} style={styles.closeMotion}><Text style={styles.closeMotionText}>{focusStudy ? 'Play Close' : 'Close'}</Text></Pressable>}
                <Pressable onPress={() => syncProgress(0)} style={styles.reset}><Text style={styles.resetText}>Reset</Text></Pressable>
              </View>
              <Text style={styles.progressLabel}>Progress {displayProgress.toFixed(2)} · {VARIANTS.find((item) => item.id === variant)?.label}</Text>
              <View style={styles.presets}>{Array.from({ length: 11 }, (_, index) => index / 10).map((value) => <Pressable key={value} onPress={() => syncProgress(value)} style={[styles.preset, Math.abs(displayProgress - value) < 0.001 && styles.presetActive]}><Text style={[styles.presetText, Math.abs(displayProgress - value) < 0.001 && styles.presetTextActive]}>{Math.round(value * 100)}%</Text></Pressable>)}</View>
              <View onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} style={styles.track} {...scrubResponder.panHandlers}><View style={[styles.trackFill, { width: `${displayProgress * 100}%` }]} /><View style={[styles.thumb, { left: `${displayProgress * 100}%` }]} /></View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, stage: { flex: 1, backgroundColor: colors.background },
  launcher: { position: 'absolute', right: 12, top: 94, zIndex: 20000, elevation: 12, minHeight: 34, minWidth: 68, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272A', borderRadius: 17, paddingHorizontal: 12, paddingVertical: 8 },
  launcherText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  header: { position: 'absolute', zIndex: 5, top: 12, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#A16F62', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#27272A', fontSize: 21, fontWeight: '800', marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  selector: { position: 'absolute', zIndex: 8, top: 76, left: 18, right: 18, minHeight: 72, padding: 4, borderRadius: 15, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.94)' },
  variant: { flexBasis: '24%', flexGrow: 1, minHeight: 31, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, variantActive: { backgroundColor: '#27272A' },
  variantLetter: { color: CORAL, fontSize: 11, fontWeight: '900' }, variantLabel: { color: '#6B6460', fontSize: 10, fontWeight: '800' }, variantTextActive: { color: '#fff' },
  tunedActions: { position: 'absolute', zIndex: 9, top: 154, right: 18, flexDirection: 'row', gap: 6 }, tunedAction: { minHeight: 30, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#27272A' }, tunedActionActive: { backgroundColor: CORAL }, tunedActionDisabled: { opacity: 0.35 }, tunedActionText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  focusRiseVariantToggle: { position: 'absolute', zIndex: 9, top: 154, right: 18, flexDirection: 'row', gap: 6 },
  focusRiseMetrics: { position: 'absolute', zIndex: 9, top: 184, left: 18, right: 18, minHeight: 30, borderRadius: 11, paddingHorizontal: 9, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(39,39,42,0.9)' },
  focusRiseMetricText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  focusRiseEasingSelector: { position: 'absolute', zIndex: 9, left: 56, right: 56, bottom: 254, minHeight: 34, padding: 3, borderRadius: 13, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', shadowColor: '#3C332F', shadowOpacity: 0.08, shadowRadius: 10 },
  focusRiseEasingOption: { flex: 1, minHeight: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  focusRiseEasingOptionActive: { backgroundColor: '#27272A' },
  focusRiseEasingText: { color: '#756C67', fontSize: 8.5, fontWeight: '800' },
  focusRiseEasingTextActive: { color: '#FFFFFF' },
  tuningPanel: { position: 'absolute', zIndex: 8, top: 190, right: 18, width: 230, bottom: 252, borderRadius: 16, padding: 10, backgroundColor: 'rgba(255,255,255,0.97)' }, tuningContent: { gap: 6, paddingBottom: 8 }, tuningRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 5 }, tuningLabel: { flex: 1, color: '#52525B', fontSize: 9.5, fontWeight: '700' }, tuningValue: { width: 42, textAlign: 'center', color: '#27272A', fontSize: 10, fontWeight: '900' }, stepper: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EDEA' }, stepperText: { color: '#6B6460', fontSize: 15, fontWeight: '900' },
  navMock: { position: 'absolute', left: 22, right: 22, bottom: 20, height: 70, borderRadius: 29, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingRight: 70 }, navPill: { width: 48, height: 8, borderRadius: 4, backgroundColor: '#E8E1DD' },
  focusRiseHome: { ...StyleSheet.absoluteFillObject, paddingTop: 174, paddingHorizontal: 22, backgroundColor: colors.background },
  focusRiseHomeEyebrow: { color: '#A16F62', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  focusRiseHomeTitle: { marginTop: 4, color: '#27272A', fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  focusRiseHero: { height: 126, marginTop: 22, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#FFFDFB', shadowColor: '#6F5E56', shadowOpacity: 0.08, shadowRadius: 14 },
  focusRiseHeroAccent: { width: 5, backgroundColor: CORAL },
  focusRiseHeroBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 18, gap: 13 },
  focusRiseLineWide: { width: '72%', height: 13, borderRadius: 7, backgroundColor: '#DCD5D1' },
  focusRiseLineShort: { width: '42%', height: 8, borderRadius: 4, backgroundColor: '#EEE8E4' },
  focusRiseCards: { flexDirection: 'row', gap: 12, marginTop: 15 },
  focusRiseCard: { flex: 1, height: 92, borderRadius: 21, backgroundColor: '#FFFDFB', borderWidth: 1, borderColor: '#F0EAE6' },
  focusRiseBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#3C332F' },
  focusRiseSurface: { position: 'absolute', zIndex: 3, left: 0, right: 0, top: 0, height: '100%', paddingTop: 188, paddingHorizontal: 24, backgroundColor: CREAM, shadowColor: '#3C332F', shadowOffset: { width: 0, height: 8 } },
  foregroundLandingSurface: { paddingTop: 226 },
  focusRiseContentHeader: { marginBottom: 30 },
  focusRiseKicker: { color: '#A16F62', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  focusRiseTitle: { marginTop: 6, color: '#27272A', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  focusRiseSubtitle: { marginTop: 8, maxWidth: 300, color: '#817873', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  focusRiseInputGroup: { marginBottom: 24 },
  focusRiseLabel: { marginBottom: 9, color: '#8B817C', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  focusRiseInput: { height: 58, borderRadius: 18, justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEE8E4' },
  focusRisePlaceholder: { color: '#AAA19C', fontSize: 14, fontWeight: '600' },
  focusRiseSupportGroup: { gap: 12 },
  focusRiseChips: { flexDirection: 'row', gap: 8 },
  focusRiseChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 14, backgroundColor: '#F3EEEB' },
  focusRiseChipText: { color: '#746A65', fontSize: 10, fontWeight: '800' },
  focusRiseCreate: { height: 50, marginTop: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: CORAL },
  focusRiseCreateText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  focusRiseFab: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: CORAL, shadowColor: CORAL, shadowOpacity: 0.28, shadowRadius: 12 },
  plus: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, fabHit: { position: 'absolute', width: 58, height: 58, borderRadius: 29 }, surfaceHit: { position: 'absolute', left: 14, right: 14, bottom: 24, borderRadius: 30 },
  controls: { position: 'absolute', zIndex: 8, left: 18, right: 18, bottom: 106, borderRadius: 18, padding: 14, backgroundColor: 'rgba(255,255,255,0.94)' }, speedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speed: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#F1EDEA' }, speedActive: { backgroundColor: CORAL }, speedText: { color: '#6B6460', fontSize: 12, fontWeight: '800' }, speedTextActive: { color: '#fff' },
  closeMotion: { minHeight: 34, justifyContent: 'center', borderRadius: 12, backgroundColor: '#27272A', paddingHorizontal: 12 }, closeMotionText: { color: '#fff', fontSize: 11, fontWeight: '800' }, reset: { marginLeft: 'auto', padding: 7 }, resetText: { color: '#8F6B61', fontSize: 12, fontWeight: '800' },
  progressLabel: { marginTop: 12, marginBottom: 8, color: '#6B6460', fontSize: 11, fontWeight: '700' }, presets: { flexDirection: 'row', gap: 3, marginBottom: 8 }, preset: { flex: 1, minHeight: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1EDEA' }, presetActive: { backgroundColor: CORAL }, presetText: { color: '#756C67', fontSize: 7.5, fontWeight: '800' }, presetTextActive: { color: '#fff' }, track: { height: 24, justifyContent: 'center', backgroundColor: '#EEE7E3', borderRadius: 12, overflow: 'visible' }, trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: CORAL }, thumb: { position: 'absolute', marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: CORAL, borderWidth: 3, borderColor: '#fff' },
});
