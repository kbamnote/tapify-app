import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Polygon, Text as SvgText } from 'react-native-svg';

/**
 * Speedometer dial for the marketing score.
 *
 * A dial rather than a bar on purpose. A bar reads as a progress meter — "fill
 * me and you are done" — which is the wrong story for a score whose whole point
 * is that it moves in both directions. A dial reads as a measurement.
 *
 * The coloured scale is the dial's own, fixed, and does not change with the
 * score: the needle moves, the scale does not. That is what makes 41 legible
 * without reading anything — you can see it is sitting in the amber.
 */

// The four bands, in score order. These are the same thresholds MarketingScore
// uses server-side; they are duplicated here only to paint the scale, and the
// band *name* always comes from the server so the two can never disagree.
export const BANDS = [
  { from: 0,  to: 35,  color: '#ef4444', name: 'weak' },
  { from: 35, to: 60,  color: '#f59e0b', name: 'needs work' },
  { from: 60, to: 80,  color: '#14b8a6', name: 'good' },
  { from: 80, to: 100, color: '#22c55e', name: 'strong' },
];

export const bandColor = (band) =>
  (BANDS.find((b) => b.name === band) || {}).color || '#94a3b8';

// Dial geometry. 240° of sweep starting at the lower left, so 0 and 100 sit
// symmetrically either side of the bottom and 50 is straight up.
const CX = 150;
const CY = 148;
const R = 100;         // centre-line of the coloured band
const BAND_W = 18;
const START = 150;     // degrees
const SWEEP = 240;

const toAngle = (v) => START + (Math.max(0, Math.min(100, v)) / 100) * SWEEP;

const polar = (angleDeg, radius) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
};

/** Arc between two score values, along the band centre-line. */
const arc = (from, to) => {
  const a = polar(toAngle(from), R);
  const b = polar(toAngle(to), R);
  const large = ((to - from) / 100) * SWEEP > 180 ? 1 : 0;
  // sweep-flag 1: angles increase clockwise on screen because y grows downward.
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
};

export default function MarketingGauge({ score = 0, band, label = 'Marketing score' }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const needle = toAngle(value);
  const colour = bandColor(band) || '#94a3b8';

  // Ticks every 5, numbered every 10. Dense enough to read a value off the
  // needle, sparse enough not to turn into a grey smear at phone size.
  const ticks = [];
  for (let v = 0; v <= 100; v += 5) {
    const major = v % 10 === 0;
    const a = toAngle(v);
    const p1 = polar(a, 113);
    const p2 = polar(a, major ? 122 : 118);
    ticks.push(
      <Line
        key={`t${v}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={major ? '#cbd5e1' : '#64748b'}
        strokeWidth={major ? 2 : 1}
        strokeLinecap="round"
      />
    );
    if (major) {
      const lp = polar(a, 134);
      ticks.push(
        <SvgText
          key={`l${v}`}
          x={lp.x} y={lp.y} dy={4}
          fill="#94a3b8" fontSize={11} fontWeight="700" textAnchor="middle"
        >
          {String(v)}
        </SvgText>
      );
    }
  }

  // Tapered needle with a short counterweight, drawn from the value's angle
  // rather than rotated, so nothing depends on transform support.
  const tip = polar(needle, 86);
  const left = polar(needle - 90, 5.5);
  const right = polar(needle + 90, 5.5);
  const tail = polar(needle + 180, 13);
  const needlePoints =
    `${tip.x},${tip.y} ${left.x},${left.y} ${tail.x},${tail.y} ${right.x},${right.y}`;

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={190} viewBox="0 0 300 240" preserveAspectRatio="xMidYMid meet">
        {/* Unlit track behind the scale, so the dial still reads as a dial in
            the gap between the two ends. */}
        <Path d={arc(0, 100)} stroke="#1e3a3b" strokeWidth={BAND_W + 4} fill="none" strokeLinecap="round" />

        {BANDS.map((b) => (
          <Path
            key={b.name}
            d={arc(b.from, b.to)}
            stroke={b.color}
            strokeWidth={BAND_W}
            fill="none"
            strokeLinecap="butt"
          />
        ))}

        {ticks}

        <Polygon points={needlePoints} fill="#ffffff" />
        <Circle cx={CX} cy={CY} r={11} fill="#ffffff" />
        <Circle cx={CX} cy={CY} r={5} fill={colour} />

        <SvgText
          x={CX} y={206}
          fill="#ffffff" fontSize={46} fontWeight="900" textAnchor="middle"
        >
          {String(value)}
        </SvgText>
        <SvgText
          x={CX} y={226}
          fill="#94a3b8" fontSize={11} fontWeight="700" textAnchor="middle"
        >
          {label.toUpperCase()}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
