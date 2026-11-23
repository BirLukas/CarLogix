import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type AccentKind = 'violet' | 'pink' | 'neutral';

interface MeshNode {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  accent: AccentKind;
  highlight?: boolean;
}

interface MeshEdge {
  from: number;
  to: number;
  accent: AccentKind;
}

/**
 * Fixed triangulated vector mesh layout (normalized coordinates).
 * Consistent across every screen so the background never shifts when switching tabs.
 */
const MESH_NODES: MeshNode[] = [
  // Top row (extends slightly past edges for full bleed)
  { x: -0.05, y: 0.02, accent: 'violet' },
  { x: 0.24, y: -0.02, accent: 'neutral' },
  { x: 0.58, y: 0.04, accent: 'pink', highlight: true },
  { x: 0.88, y: -0.01, accent: 'violet' },
  { x: 1.06, y: 0.11, accent: 'pink' },

  // Upper-mid row
  { x: 0.08, y: 0.16, accent: 'pink', highlight: true },
  { x: 0.38, y: 0.14, accent: 'violet' },
  { x: 0.74, y: 0.18, accent: 'neutral' },
  { x: 0.96, y: 0.27, accent: 'violet', highlight: true },

  // Mid row
  { x: -0.04, y: 0.34, accent: 'neutral' },
  { x: 0.22, y: 0.31, accent: 'violet' },
  { x: 0.54, y: 0.36, accent: 'neutral' },
  { x: 0.82, y: 0.42, accent: 'pink', highlight: true },
  { x: 1.05, y: 0.48, accent: 'neutral' },

  // Lower-mid row
  { x: 0.06, y: 0.54, accent: 'violet', highlight: true },
  { x: 0.34, y: 0.52, accent: 'neutral' },
  { x: 0.66, y: 0.58, accent: 'violet' },
  { x: 0.94, y: 0.65, accent: 'pink' },

  // Lower row
  { x: -0.05, y: 0.73, accent: 'pink' },
  { x: 0.2, y: 0.72, accent: 'pink', highlight: true },
  { x: 0.48, y: 0.76, accent: 'neutral' },
  { x: 0.78, y: 0.8, accent: 'violet', highlight: true },
  { x: 1.06, y: 0.84, accent: 'violet' },

  // Bottom bleed row
  { x: 0.08, y: 0.95, accent: 'violet' },
  { x: 0.38, y: 0.98, accent: 'pink' },
  { x: 0.68, y: 0.96, accent: 'neutral' },
  { x: 0.95, y: 1.02, accent: 'pink' },
];

const MESH_EDGES: MeshEdge[] = [
  // Top strip
  { from: 0, to: 1, accent: 'violet' },
  { from: 1, to: 2, accent: 'pink' },
  { from: 2, to: 3, accent: 'pink' },
  { from: 3, to: 4, accent: 'violet' },

  // Top to upper-mid
  { from: 0, to: 5, accent: 'violet' },
  { from: 1, to: 5, accent: 'pink' },
  { from: 1, to: 6, accent: 'neutral' },
  { from: 2, to: 6, accent: 'violet' },
  { from: 2, to: 7, accent: 'pink' },
  { from: 3, to: 7, accent: 'violet' },
  { from: 3, to: 8, accent: 'violet' },
  { from: 4, to: 8, accent: 'pink' },

  // Upper-mid horizontal
  { from: 5, to: 6, accent: 'pink' },
  { from: 6, to: 7, accent: 'violet' },
  { from: 7, to: 8, accent: 'neutral' },

  // Upper-mid to mid
  { from: 5, to: 9, accent: 'violet' },
  { from: 5, to: 10, accent: 'pink' },
  { from: 6, to: 10, accent: 'violet' },
  { from: 6, to: 11, accent: 'neutral' },
  { from: 7, to: 11, accent: 'neutral' },
  { from: 7, to: 12, accent: 'pink' },
  { from: 8, to: 12, accent: 'pink' },
  { from: 8, to: 13, accent: 'violet' },

  // Mid horizontal
  { from: 9, to: 10, accent: 'neutral' },
  { from: 10, to: 11, accent: 'violet' },
  { from: 11, to: 12, accent: 'pink' },
  { from: 12, to: 13, accent: 'pink' },

  // Mid to lower-mid
  { from: 9, to: 14, accent: 'violet' },
  { from: 10, to: 14, accent: 'violet' },
  { from: 10, to: 15, accent: 'neutral' },
  { from: 11, to: 15, accent: 'neutral' },
  { from: 11, to: 16, accent: 'violet' },
  { from: 12, to: 16, accent: 'pink' },
  { from: 12, to: 17, accent: 'pink' },
  { from: 13, to: 17, accent: 'violet' },

  // Lower-mid horizontal
  { from: 14, to: 15, accent: 'violet' },
  { from: 15, to: 16, accent: 'neutral' },
  { from: 16, to: 17, accent: 'pink' },

  // Lower-mid to lower
  { from: 14, to: 18, accent: 'pink' },
  { from: 14, to: 19, accent: 'pink' },
  { from: 15, to: 19, accent: 'violet' },
  { from: 15, to: 20, accent: 'neutral' },
  { from: 16, to: 20, accent: 'violet' },
  { from: 16, to: 21, accent: 'violet' },
  { from: 17, to: 21, accent: 'pink' },
  { from: 17, to: 22, accent: 'violet' },

  // Lower horizontal
  { from: 18, to: 19, accent: 'pink' },
  { from: 19, to: 20, accent: 'pink' },
  { from: 20, to: 21, accent: 'violet' },
  { from: 21, to: 22, accent: 'violet' },

  // Lower to bottom
  { from: 18, to: 23, accent: 'violet' },
  { from: 19, to: 23, accent: 'pink' },
  { from: 19, to: 24, accent: 'pink' },
  { from: 20, to: 24, accent: 'neutral' },
  { from: 20, to: 25, accent: 'violet' },
  { from: 21, to: 25, accent: 'violet' },
  { from: 21, to: 26, accent: 'pink' },
  { from: 22, to: 26, accent: 'violet' },
];

export const VectorMeshBackground: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const { isDark } = useTheme();

  const palette = useMemo(
    () =>
      isDark
        ? {
            lineViolet: 'rgba(139, 92, 246, 0.16)',
            linePink: 'rgba(255, 1, 143, 0.15)',
            lineNeutral: 'rgba(148, 163, 184, 0.09)',
            nodeViolet: 'rgba(167, 139, 250, 0.48)',
            nodePink: 'rgba(255, 1, 143, 0.55)',
            nodeNeutral: 'rgba(148, 163, 184, 0.28)',
            ringViolet: 'rgba(139, 92, 246, 0.25)',
            ringPink: 'rgba(255, 1, 143, 0.28)',
          }
        : {
            lineViolet: 'rgba(99, 102, 241, 0.12)',
            linePink: 'rgba(255, 1, 143, 0.11)',
            lineNeutral: 'rgba(100, 116, 139, 0.09)',
            nodeViolet: 'rgba(99, 102, 241, 0.34)',
            nodePink: 'rgba(255, 1, 143, 0.36)',
            nodeNeutral: 'rgba(100, 116, 139, 0.22)',
            ringViolet: 'rgba(99, 102, 241, 0.18)',
            ringPink: 'rgba(255, 1, 143, 0.2)',
          },
    [isDark]
  );

  const computed = useMemo(() => {
    const points = MESH_NODES.map((node) => ({
      ...node,
      px: node.x * width,
      py: node.y * height,
    }));

    const edges = MESH_EDGES.map((edge, idx) => {
      const a = points[edge.from];
      const b = points[edge.to];
      const dx = b.px - a.px;
      const dy = b.py - a.py;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const midX = (a.px + b.px) / 2;
      const midY = (a.py + b.py) / 2;

      return {
        key: `edge-${idx}`,
        left: midX - length / 2,
        top: midY - 0.5,
        width: length,
        angle: `${angle}rad`,
        accent: edge.accent,
      };
    });

    return { points, edges };
  }, [width, height]);

  const getLineColor = (accent: AccentKind) => {
    if (accent === 'pink') return palette.linePink;
    if (accent === 'violet') return palette.lineViolet;
    return palette.lineNeutral;
  };

  const getNodeColor = (accent: AccentKind) => {
    if (accent === 'pink') return palette.nodePink;
    if (accent === 'violet') return palette.nodeViolet;
    return palette.nodeNeutral;
  };

  return (
    <View pointerEvents="none" style={styles.container}>
      {computed.edges.map((edge) => (
        <View
          key={edge.key}
          style={[
            styles.edge,
            {
              left: edge.left,
              top: edge.top,
              width: edge.width,
              backgroundColor: getLineColor(edge.accent),
              transform: [{ rotate: edge.angle }],
            },
          ]}
        />
      ))}

      {computed.points.map((point, idx) => {
        const dotSize = point.highlight ? 5 : 3.5;
        const ringSize = 14;
        return (
          <React.Fragment key={`node-${idx}`}>
            {point.highlight && (
              <View
                style={[
                  styles.nodeRing,
                  {
                    left: point.px - ringSize / 2,
                    top: point.py - ringSize / 2,
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderColor:
                      point.accent === 'pink' ? palette.ringPink : palette.ringViolet,
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.nodeDot,
                {
                  left: point.px - dotSize / 2,
                  top: point.py - dotSize / 2,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: getNodeColor(point.accent),
                },
              ]}
            />
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    height: 1,
  },
  nodeDot: {
    position: 'absolute',
  },
  nodeRing: {
    position: 'absolute',
    borderWidth: 1,
  },
});
