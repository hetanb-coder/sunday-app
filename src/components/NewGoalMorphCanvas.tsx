import { Canvas, Circle, Group, Line, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  buildAnchoredUnfurlPath,
  D3_PRODUCTION_OPENING_PACING,
  D3_PRODUCTION_PACING,
  getAnchoredUnfurlNodes,
} from '../motion/d3AnchoredUnfurl';
import {
  buildD4AnchoredUnfurlPath,
  getD4AnchoredUnfurlNodes,
} from '../motion/d4AnchoredUnfurl';

type MorphFrame = { x: number; y: number; width: number; height: number };
type Props = {
  openingProgress: SharedValue<number>;
  closingProgress: SharedValue<number>;
  closing: SharedValue<number>;
  width: number;
  height: number;
  fabFrame: MorphFrame;
  sheetFrame: MorphFrame;
  coral: string;
  cream: string;
  fabBorderColor: string;
  readyCycle: number;
  onReady: (cycle: number) => void;
  debugProgress?: number;
  showDebugPath?: boolean;
  debugGeometry?: 'D3' | 'D4';
};

const clamp01 = (value: number) => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

export function NewGoalMorphCanvas({
  openingProgress, closingProgress, closing, width, height, fabFrame, sheetFrame, coral, cream,
  fabBorderColor, readyCycle, onReady, debugProgress = 0, showDebugPath = false,
  debugGeometry = 'D4',
}: Props) {
  const canvasSize = useSharedValue({ width: 0, height: 0 });
  const lastReportedReadyCycle = useSharedValue(-1);

  useAnimatedReaction(
    () => canvasSize.value.width > 0 && canvasSize.value.height > 0 ? readyCycle : -1,
    (renderedCycle) => {
      if (renderedCycle < 0 || lastReportedReadyCycle.value === renderedCycle) return;
      lastReportedReadyCycle.value = renderedCycle;
      runOnJS(onReady)(renderedCycle);
    },
    [onReady, readyCycle],
  );

  const visualProgress = useDerivedValue(
    () => closing.value ? 1 - closingProgress.value : openingProgress.value,
  );
  const path = useDerivedValue(() => {
    if (__DEV__ && debugGeometry === 'D3') {
      return buildAnchoredUnfurlPath(
        visualProgress.value,
        fabFrame,
        sheetFrame,
        closing.value ? D3_PRODUCTION_PACING : D3_PRODUCTION_OPENING_PACING,
        0,
      );
    }
    return buildD4AnchoredUnfurlPath(
      visualProgress.value,
      fabFrame,
      sheetFrame,
      closing.value ? 'closing' : 'opening',
    );
  }, [debugGeometry, fabFrame, sheetFrame]);
  const spatialFillColors = useDerivedValue(() => {
    const progress = visualProgress.value;
    if (progress < 0.2) return [coral, coral, coral, coral];
    if (progress >= 0.85) return [cream, cream, cream, cream];
    return [cream, cream, coral, coral];
  });
  const spatialFillPositions = useDerivedValue(() => {
    const progress = visualProgress.value;
    if (progress < 0.2) return [0, 0.33, 0.66, 1];
    if (progress >= 0.85) return [0, 0.33, 0.66, 1];
    const takeover = clamp01((progress - 0.2) / 0.65);
    const boundary = takeover * takeover * (3 - 2 * takeover);
    const blendHalfWidth = 0.16;
    return [
      0,
      Math.max(0, boundary - blendHalfWidth),
      Math.min(1, boundary + blendHalfWidth),
      1,
    ];
  });
  const fabDecorationOpacity = useDerivedValue(() => {
    const anticipation = D3_PRODUCTION_PACING.anticipationDuration / D3_PRODUCTION_PACING.openingDuration;
    return 1 - clamp01(visualProgress.value / anticipation);
  });
  const borderColor = useDerivedValue(() => interpolateColor(
    fabDecorationOpacity.value,
    [0, 1],
    ['rgba(255,252,248,0)', fabBorderColor],
  ));
  const debugNodes = useMemo(() => debugGeometry === 'D3'
    ? getAnchoredUnfurlNodes(
      debugProgress,
      fabFrame,
      sheetFrame,
      D3_PRODUCTION_OPENING_PACING,
      0,
    )
    : getD4AnchoredUnfurlNodes(debugProgress, fabFrame, sheetFrame, 'opening'),
  [debugGeometry, debugProgress, fabFrame, sheetFrame]);

  return (
    <>
      <Canvas
        onSize={canvasSize}
        pointerEvents="none"
        style={[styles.canvas, { width, height }]}
      >
        <Path path={path}>
          <LinearGradient
            start={vec(sheetFrame.x, sheetFrame.y)}
            end={vec(fabFrame.x + fabFrame.width / 2, fabFrame.y + fabFrame.height / 2)}
            colors={spatialFillColors}
            positions={spatialFillPositions}
          />
        </Path>
        <Group clip={path}>
          <Path path={path} color={borderColor} style="stroke" strokeWidth={6} />
        </Group>
        {__DEV__ && showDebugPath && (
          <Group>
            <Rect x={fabFrame.x} y={fabFrame.y} width={fabFrame.width} height={fabFrame.height} color="#38BDF8" style="stroke" strokeWidth={1.5} />
            <Rect x={sheetFrame.x} y={sheetFrame.y} width={sheetFrame.width} height={sheetFrame.height} color="#A78BFA" style="stroke" strokeWidth={1.5} />
            <Circle cx={fabFrame.x + fabFrame.width / 2} cy={fabFrame.y + fabFrame.height / 2} r={fabFrame.width * 0.7} color="rgba(251,191,36,0.18)" />
            {debugNodes.map((node, index) => (
              <Group key={`d3-node-${index}`}>
                <Line p1={vec(node.x, node.y)} p2={vec(node.x + node.inX, node.y + node.inY)} color="#22C55E" strokeWidth={1} />
                <Line p1={vec(node.x, node.y)} p2={vec(node.x + node.outX, node.y + node.outY)} color="#F97316" strokeWidth={1} />
                <Circle cx={node.x + node.inX} cy={node.y + node.inY} r={2.5} color="#22C55E" />
                <Circle cx={node.x + node.outX} cy={node.y + node.outY} r={2.5} color="#F97316" />
                <Circle cx={node.x} cy={node.y} r={4} color="#111827" />
              </Group>
            ))}
          </Group>
        )}
      </Canvas>
      {__DEV__ && showDebugPath && debugNodes.map((node, index) => (
        <Text
          key={`d3-label-${index}`}
          pointerEvents="none"
          style={[styles.debugLabel, { left: node.x + 5, top: node.y - 10 }]}
        >
          {index}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { position: 'absolute', left: 0, top: 0, backgroundColor: 'transparent' },
  debugLabel: {
    position: 'absolute', color: '#111827', backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 4, paddingHorizontal: 3, fontSize: 9, fontWeight: '800', zIndex: 20,
  },
});
