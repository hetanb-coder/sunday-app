import {
  Canvas,
  ImageShader,
  Vertices,
  vec,
} from '@shopify/react-native-skia';
import type {
  SkImage,
  SkPoint,
} from '@shopify/react-native-skia';
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
} from 'react-native';

type HandoffRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  scrollDeltaY?: number;
};

type GoalHandoffCanvasProps = {
  image: SkImage;
  sourceRect: HandoffRect;
  landingRect: HandoffRect;
  handoffProgress: Animated.Value;
  crossfadeStart: number;
};

const MESH_COLUMNS = 9;
const MESH_ROWS = 7;
const LEADING_ADVANCE_PX = 26;
const TRAILING_LAG_PX = 5;
const TRAILING_TAPER = 0.001;
const LEADING_TAPER = 0.075;
const NECK_STRENGTH = 0.12;
const NECK_CENTER = 0.85;
const NECK_WIDTH = 0.13;
const TRAILING_RESISTANCE = 2.6;
const LEADING_REGION_START = 0.2;
const CENTERLINE_LEAD_BIAS = 0.22;
const MAX_MINOR_AXIS_INFLUENCE = 0.28;
const DISTANCE_STRENGTH_MIN = 0.94;
const DISTANCE_STRENGTH_MAX = 1.08;
const WARP_START = 0.12;
const WARP_PEAK_START = 0.3;
const WARP_PEAK_END = 0.72;
const FAR_WARP_PEAK_END = 0.69;
const WARP_RELEASE = 0.98;
const FAR_RELEASE_DISTANCE_START = 220;
const FAR_RELEASE_DISTANCE_END = 520;
const TRAJECTORY_ARC = 4;

const clamp01 = (value: number) =>
  Math.max(0, Math.min(1, value));

const smoothstep = (value: number) => {
  const clamped = clamp01(value);
  return (
    clamped *
    clamped *
    (3 - 2 * clamped)
  );
};

const smootherstep = (value: number) => {
  const clamped = clamp01(value);
  return (
    clamped *
    clamped *
    clamped *
    (clamped *
      (clamped * 6 - 15) +
      10)
  );
};

const envelopeAt = (
  progress: number,
  handoffDistance: number
) => {
  const distanceMix = smootherstep(
    (handoffDistance -
      FAR_RELEASE_DISTANCE_START) /
      (FAR_RELEASE_DISTANCE_END -
        FAR_RELEASE_DISTANCE_START)
  );
  const peakEnd =
    WARP_PEAK_END +
    (FAR_WARP_PEAK_END - WARP_PEAK_END) *
      distanceMix;

  return (
    progress <= WARP_START
      ? 0
      : progress < WARP_PEAK_START
        ? smoothstep(
            (progress - WARP_START) /
              (WARP_PEAK_START - WARP_START)
          )
        : progress <= peakEnd
          ? 1
          : 1 -
            smootherstep(
              (progress - peakEnd) /
                (WARP_RELEASE - peakEnd)
            )
  );
};

const buildIndices = () => {
  const indices: number[] = [];

  for (let row = 0; row < MESH_ROWS - 1; row += 1) {
    for (
      let column = 0;
      column < MESH_COLUMNS - 1;
      column += 1
    ) {
      const topLeft =
        row * MESH_COLUMNS + column;
      const topRight = topLeft + 1;
      const bottomLeft =
        topLeft + MESH_COLUMNS;
      const bottomRight = bottomLeft + 1;

      indices.push(
        topLeft,
        topRight,
        bottomRight,
        topLeft,
        bottomRight,
        bottomLeft
      );
    }
  }

  return indices;
};

const MESH_INDICES = buildIndices();

export function GoalHandoffCanvas({
  image,
  sourceRect,
  landingRect,
  handoffProgress,
  crossfadeStart,
}: GoalHandoffCanvasProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);

    const listenerId = handoffProgress.addListener(
      ({ value }) => {
        setProgress(clamp01(value));
      }
    );

    return () => {
      handoffProgress.removeListener(listenerId);
    };
  }, [handoffProgress]);

  const { vertices, textures } = useMemo(() => {
    const nextVertices: SkPoint[] = [];
    const nextTextures: SkPoint[] = [];
    const scrollDeltaY =
      landingRect.scrollDeltaY ?? 0;
    const destinationY =
      landingRect.y +
      scrollDeltaY * (1 - progress);
    const sourceCenterX =
      sourceRect.x + sourceRect.width / 2;
    const sourceCenterY =
      sourceRect.y + sourceRect.height / 2;
    const destinationCenterX =
      landingRect.x + landingRect.width / 2;
    const destinationCenterY =
      destinationY + landingRect.height / 2;
    const initialDestinationCenterY =
      landingRect.y +
      scrollDeltaY +
      landingRect.height / 2;
    const handoffDistance = Math.max(
      1,
      Math.hypot(
        destinationCenterX - sourceCenterX,
        initialDestinationCenterY - sourceCenterY
      )
    );
    const forceTravelX =
      destinationCenterX - sourceCenterX;
    const forceTravelY =
      initialDestinationCenterY - sourceCenterY;
    const forceTravelDistance = Math.max(
      1,
      Math.hypot(forceTravelX, forceTravelY)
    );
    const directionX =
      forceTravelX / forceTravelDistance;
    const directionY =
      forceTravelY / forceTravelDistance;
    const perpendicularX = -directionY;
    const perpendicularY = directionX;
    const lateralExtent = Math.max(
      1,
      0.5 *
        (Math.abs(perpendicularX) *
          sourceRect.width +
          Math.abs(perpendicularY) *
            sourceRect.height)
    );
    const distanceMix = smootherstep(
      (handoffDistance - 180) / 420
    );
    const distanceStrength =
      DISTANCE_STRENGTH_MAX +
      (DISTANCE_STRENGTH_MIN -
        DISTANCE_STRENGTH_MAX) *
        distanceMix;
    const envelope = envelopeAt(
      progress,
      handoffDistance
    );
    const arc =
      TRAJECTORY_ARC *
      Math.pow(Math.sin(Math.PI * progress), 2);

    for (let row = 0; row < MESH_ROWS; row += 1) {
      const v = row / (MESH_ROWS - 1);

      for (
        let column = 0;
        column < MESH_COLUMNS;
        column += 1
      ) {
        const u = column / (MESH_COLUMNS - 1);
        const sourceX =
          sourceRect.x + u * sourceRect.width;
        const sourceY =
          sourceRect.y + v * sourceRect.height;
        const destinationX =
          landingRect.x +
          u * landingRect.width;
        const destinationVertexY =
          destinationY +
          v * landingRect.height;
        const sourceOffsetX =
          sourceX - sourceCenterX;
        const sourceOffsetY =
          sourceY - sourceCenterY;
        const forwardX =
          directionX >= 0 ? u : 1 - u;
        const forwardY =
          directionY >= 0 ? v : 1 - v;
        const horizontalIsDominant =
          Math.abs(directionX) >=
          Math.abs(directionY);
        const dominantPosition =
          horizontalIsDominant
            ? forwardX
            : forwardY;
        const minorPosition =
          horizontalIsDominant
            ? forwardY
            : forwardX;
        const dominantDirection = Math.max(
          Math.abs(directionX),
          Math.abs(directionY),
          0.0001
        );
        const minorDirection = Math.min(
          Math.abs(directionX),
          Math.abs(directionY)
        );
        const minorAxisInfluence =
          MAX_MINOR_AXIS_INFLUENCE *
          smootherstep(
            minorDirection / dominantDirection
          );
        const longitudinalPosition = clamp01(
          dominantPosition *
            (1 - minorAxisInfluence) +
            minorPosition * minorAxisInfluence
        );
        const lateralPosition =
          sourceOffsetX * perpendicularX +
          sourceOffsetY * perpendicularY;
        const normalizedLateral = clamp01(
          Math.abs(lateralPosition) /
            lateralExtent
        );
        const curvedLateralPosition =
          Math.sign(lateralPosition) *
          lateralExtent *
          smootherstep(normalizedLateral);
        const edgePosition = smootherstep(
          longitudinalPosition
        );
        const leadingPosition = clamp01(
          (edgePosition -
            LEADING_REGION_START) /
            (1 - LEADING_REGION_START)
        );
        const leadingProfile = Math.pow(
          smootherstep(leadingPosition),
          TRAILING_RESISTANCE
        );
        const bodyPosition = clamp01(
          (longitudinalPosition - 0.12) / 0.88
        );
        const bodyProfile = Math.pow(
          smootherstep(bodyPosition),
          1.75
        );
        const neckDistance =
          (edgePosition - NECK_CENTER) /
          NECK_WIDTH;
        const neckProfile =
          Math.exp(
            -0.5 *
              neckDistance *
              neckDistance
          ) * leadingProfile;
        const centerlineLead =
          1 -
          CENTERLINE_LEAD_BIAS *
            smootherstep(normalizedLateral);
        const directionalPull =
          envelope * distanceStrength *
          (bodyProfile *
            LEADING_ADVANCE_PX *
            (0.38 +
              0.62 * leadingProfile) *
            centerlineLead -
            (1 - bodyProfile) *
              TRAILING_LAG_PX *
              (0.75 +
                0.25 * normalizedLateral));
        const funnelOffset =
          -curvedLateralPosition *
          envelope * distanceStrength *
          (TRAILING_TAPER +
            bodyProfile *
              (LEADING_TAPER -
                TRAILING_TAPER) +
            neckProfile *
              NECK_STRENGTH);

        nextVertices.push(
          vec(
            sourceX +
              (destinationX - sourceX) *
                progress +
              directionX * directionalPull +
              perpendicularX *
                (arc + funnelOffset),
            sourceY +
              (destinationVertexY - sourceY) *
                progress +
              directionY * directionalPull +
              perpendicularY *
                (arc + funnelOffset)
          )
        );

        nextTextures.push(
          vec(
            u * image.width(),
            v * image.height()
          )
        );
      }
    }

    return {
      vertices: nextVertices,
      textures: nextTextures,
    };
  }, [image, landingRect, progress, sourceRect]);

  const ownershipProgress = smootherstep(
    (progress - crossfadeStart) /
      (1 - crossfadeStart)
  );
  const opacity = 1 - ownershipProgress;

  return (
    <Canvas
      opaque={false}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <Vertices
        mode="triangles"
        vertices={vertices}
        textures={textures}
        indices={MESH_INDICES}
      >
        <ImageShader
          image={image}
          tx="decal"
          ty="decal"
        />
      </Vertices>
    </Canvas>
  );
}
