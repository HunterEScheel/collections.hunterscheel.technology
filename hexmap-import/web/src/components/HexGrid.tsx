import { useState, useCallback, useRef, useEffect } from "react";
import { HexTile } from "./HexTile";
import { TerrainPatterns } from "./TerrainPatterns";
import { LandmarkIcon } from "./LandmarkIcon";
import { useGridSize } from "../hooks/useGridSize";
import { hexToPixel, hexPointsString, HEX_SIZE } from "../utils/hexMath";
import { QUEST_LEVEL_COLORS } from "../utils/colors";
import type { HexData, Quest } from "../types";

interface HexGridProps {
  hexes: Map<string, HexData>;
  quests: Quest[];
  selectedHex: { col: number; row: number } | null;
  onHexSelect: (col: number, row: number) => void;
  isErasing?: boolean;
}

function computeContentBox(grid: { minCol: number; maxCol: number; minRow: number; maxRow: number }) {
  const topLeft = hexToPixel(grid.minCol, grid.minRow);
  const bottomRight = hexToPixel(grid.maxCol, grid.maxRow);
  const padding = HEX_SIZE * 2;
  return {
    x: topLeft.x - padding,
    y: topLeft.y - padding,
    w: bottomRight.x - topLeft.x + padding * 2,
    h: bottomRight.y - topLeft.y + padding * 2,
  };
}

export function HexGrid({
  hexes,
  quests,
  selectedHex,
  onHexSelect,
  isErasing = false,
}: HexGridProps) {
  const grid = useGridSize(hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Pointer-driven pan/pinch state. Refs (not state) because high-frequency
  // pointermove events shouldn't trigger React re-renders.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);
  const suppressNextClick = useRef(false);
  const lastPinchDist = useRef<number | null>(null);
  const DRAG_THRESHOLD = 6;

  // Fit content to viewport, preserving aspect ratio
  useEffect(() => {
    const content = computeContentBox(grid);
    const container = containerRef.current;
    if (!container) {
      setViewBox(content);
      return;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW === 0 || containerH === 0) {
      setViewBox(content);
      return;
    }

    const contentAspect = content.w / content.h;
    const containerAspect = containerW / containerH;

    let finalW: number;
    let finalH: number;

    if (contentAspect > containerAspect) {
      finalW = content.w;
      finalH = content.w / containerAspect;
    } else {
      finalH = content.h;
      finalW = content.h * containerAspect;
    }

    setViewBox({
      x: content.x - (finalW - content.w) / 2,
      y: content.y - (finalH - content.h) / 2,
      w: finalW,
      h: finalH,
    });
  }, [grid]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      setViewBox((prev) => {
        const newW = prev.w * zoomFactor;
        const newH = prev.h * zoomFactor;
        return {
          x: prev.x - (newW - prev.w) * mouseX,
          y: prev.y - (newH - prev.h) * mouseY,
          w: newW,
          h: newH,
        };
      });
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Only primary mouse button, middle button, or touch/pen — ignore right-click.
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size === 1) {
        dragStart.current = { x: e.clientX, y: e.clientY };
        dragMoved.current = false;
        // Mouse middle-button or shift-click: pan immediately, no threshold.
        // Take pointer capture only in this case (otherwise click would
        // re-target to the SVG and the hex polygon's onClick wouldn't fire).
        if (e.pointerType === "mouse" && (e.button === 1 || e.shiftKey)) {
          try {
            svgRef.current?.setPointerCapture(e.pointerId);
          } catch {
            // ignore — capture isn't critical
          }
          dragMoved.current = true;
          setIsPanning(true);
          e.preventDefault();
        }
      } else if (pointers.current.size === 2) {
        const ps = Array.from(pointers.current.values());
        lastPinchDist.current = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
        // Two-finger gesture cancels any in-progress single-pointer drag.
        dragStart.current = null;
        // Take capture for both pointers so the gesture sticks.
        for (const pid of pointers.current.keys()) {
          try {
            svgRef.current?.setPointerCapture(pid);
          } catch {
            // ignore
          }
        }
      }
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      if (pointers.current.size === 1 && dragStart.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        if (!dragMoved.current) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          // Crossed threshold — now we know it's a drag. Take capture so the
          // following pointer events stick even if the cursor exits the SVG,
          // and so the synthetic click after pointerup can be suppressed.
          try {
            svg.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          dragMoved.current = true;
          setIsPanning(true);
        }
        const vbDx = (dx / rect.width) * viewBox.w;
        const vbDy = (dy / rect.height) * viewBox.h;
        setViewBox((prev) => ({ ...prev, x: prev.x - vbDx, y: prev.y - vbDy }));
        dragStart.current = { x: e.clientX, y: e.clientY };
      } else if (pointers.current.size === 2 && lastPinchDist.current != null) {
        const ps = Array.from(pointers.current.values());
        const dist = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
        if (dist <= 0) return;
        const zoomFactor = lastPinchDist.current / dist;
        lastPinchDist.current = dist;
        const midX = ((ps[0].x + ps[1].x) / 2 - rect.left) / rect.width;
        const midY = ((ps[0].y + ps[1].y) / 2 - rect.top) / rect.height;
        setViewBox((prev) => {
          const newW = prev.w * zoomFactor;
          const newH = prev.h * zoomFactor;
          return {
            x: prev.x - (newW - prev.w) * midX,
            y: prev.y - (newH - prev.h) * midY,
            w: newW,
            h: newH,
          };
        });
      }
    },
    [viewBox.w, viewBox.h]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.delete(e.pointerId);
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // releasePointerCapture throws if capture was already released; ignore.
      }
      if (pointers.current.size < 2) lastPinchDist.current = null;
      if (pointers.current.size === 0) {
        if (dragMoved.current) {
          // Swallow the synthetic click that would follow a drag-ending pointerup.
          suppressNextClick.current = true;
        }
        dragStart.current = null;
        dragMoved.current = false;
        setIsPanning(false);
      }
    },
    []
  );

  // If a drag just ended, suppress the click on the underlying hex polygon.
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      e.stopPropagation();
    }
  }, []);

  // Perimeter of filled (non-unknown) hexes — these are the hexes that, if
  // erased, could let the grid shrink. Quests are intentionally excluded;
  // they also constrain bounds, but erasing can't remove them.
  let fMinCol = Infinity;
  let fMaxCol = -Infinity;
  let fMinRow = Infinity;
  let fMaxRow = -Infinity;
  let hasFilled = false;
  for (const hex of hexes.values()) {
    if (hex.terrain === "unknown") continue;
    if (hex.col < fMinCol) fMinCol = hex.col;
    if (hex.col > fMaxCol) fMaxCol = hex.col;
    if (hex.row < fMinRow) fMinRow = hex.row;
    if (hex.row > fMaxRow) fMaxRow = hex.row;
    hasFilled = true;
  }

  const fills: React.ReactNode[] = [];
  const landmarks: React.ReactNode[] = [];
  const landmarkNames: React.ReactNode[] = [];
  const selectionOverlays: React.ReactNode[] = [];
  const eraseHighlights: React.ReactNode[] = [];

  for (const { col, row } of grid.cells) {
    const key = `${col}_${row}`;
    const hexData = hexes.get(key);
    const terrain = hexData?.terrain ?? "unknown";
    const isSelected = selectedHex?.col === col && selectedHex?.row === row;

    fills.push(
      <HexTile
        key={key}
        col={col}
        row={row}
        terrain={terrain}
        onClick={onHexSelect}
      />
    );

    if (hexData?.landmark) {
      landmarks.push(
        <LandmarkIcon
          key={`lm-${key}`}
          col={col}
          row={row}
          landmark={hexData.landmark}
        />
      );

      if (hexData.landmarkName) {
        const center = hexToPixel(col, row);
        // Label sits just below the landmark icon.
        const labelY = center.y + HEX_SIZE * 0.78;
        const fontSize = HEX_SIZE * 0.32;
        landmarkNames.push(
          <g
            key={`lname-${key}`}
            pointerEvents="none"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {/* Dark stroke outline for legibility on any terrain */}
            <text
              x={center.x}
              y={labelY}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={600}
              fill="#0a0a0a"
              stroke="#0a0a0a"
              strokeWidth={3}
              paintOrder="stroke"
              strokeLinejoin="round"
            >
              {hexData.landmarkName}
            </text>
            {/* Foreground text */}
            <text
              x={center.x}
              y={labelY}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={600}
              fill="#fde68a"
            >
              {hexData.landmarkName}
            </text>
          </g>
        );
      }
    }

    if (isSelected) {
      selectionOverlays.push(
        <polygon
          key={`sel-${key}`}
          points={hexPointsString(col, row)}
          fill="none"
          stroke="#ffffff"
          strokeWidth={3}
          pointerEvents="none"
        />
      );
    }

    if (
      isErasing &&
      hasFilled &&
      hexData &&
      hexData.terrain !== "unknown" &&
      (col === fMinCol ||
        col === fMaxCol ||
        row === fMinRow ||
        row === fMaxRow)
    ) {
      eraseHighlights.push(
        <polygon
          key={`erase-${key}`}
          className="erase-highlight"
          points={hexPointsString(col, row)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={3}
          pointerEvents="none"
        />
      );
    }
  }

  const pinSize = HEX_SIZE * 0.35;

  // Group quests by start hex so multiple quests sharing a starting hex
  // fan out into visible side-by-side pins instead of stacking invisibly.
  const activeQuests = quests.filter(
    (q) => q.status !== "completed" && q.status !== "paid_out"
  );
  const questsByStart = new Map<string, Quest[]>();
  for (const q of activeQuests) {
    const k = `${q.hexCol}_${q.hexRow}`;
    const arr = questsByStart.get(k);
    if (arr) arr.push(q);
    else questsByStart.set(k, [q]);
  }
  const pinSpacing = HEX_SIZE * 0.45;
  const questPositions = new Map<string, { x: number; y: number }>();
  for (const group of questsByStart.values()) {
    const center = hexToPixel(group[0].hexCol, group[0].hexRow);
    const totalWidth = (group.length - 1) * pinSpacing;
    group.forEach((quest, i) => {
      questPositions.set(quest.id, {
        x: center.x + (-totalWidth / 2 + i * pinSpacing),
        y: center.y,
      });
    });
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          cursor: isPanning ? "grabbing" : "default",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <TerrainPatterns />
        <g>{fills}</g>
        <g>{landmarks}</g>
        <g>{landmarkNames}</g>
        <g>{eraseHighlights}</g>
        <g>{selectionOverlays}</g>
        <g>
          {activeQuests.map((quest) => {
            const start = questPositions.get(quest.id);
            if (!start) return null;
            const color = QUEST_LEVEL_COLORS[quest.level];
            const hasEnd =
              quest.endHexCol != null && quest.endHexRow != null;
            const end = hasEnd
              ? hexToPixel(quest.endHexCol!, quest.endHexRow!)
              : null;

            return (
              <g key={`route-${quest.id}`} pointerEvents="none">
                {/* Dotted line between start pin and end hex */}
                {end && (
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.7}
                  />
                )}
                {/* Start pin */}
                <QuestPin x={start.x} y={start.y} color={color} size={pinSize} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function QuestPin({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}) {
  // Pin shape: teardrop pointing down, centered on hex
  const pinHeight = size * 2.5;
  const pinTop = y - pinHeight;
  const r = size;

  return (
    <g>
      {/* Pin shadow */}
      <ellipse
        cx={x}
        cy={y + 2}
        rx={r * 0.5}
        ry={r * 0.2}
        fill="rgba(0,0,0,0.3)"
      />
      {/* Pin body: path from circle top down to point */}
      <path
        d={`M ${x} ${y}
            Q ${x - r * 1.2} ${pinTop + r * 0.8} ${x} ${pinTop}
            Q ${x + r * 1.2} ${pinTop + r * 0.8} ${x} ${y} Z`}
        fill={color}
        stroke="#000"
        strokeWidth={0.5}
      />
      {/* Inner dot */}
      <circle
        cx={x}
        cy={pinTop + r * 0.55}
        r={r * 0.35}
        fill="#000"
        opacity={0.3}
      />
    </g>
  );
}
