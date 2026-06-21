import { Heart, Maximize2, Users, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLORS, getMemberColor } from '../constants/colors';
import { timestampToDisplayDate } from '../utils/date';
import type { Member } from '../types';

interface TreeMember {
  id: string;
  name: string;
  relation: string;
  birth: string;
  alive: boolean;
  gender: 'M' | 'F' | 'Other';
  color: string;
  x: number;
  y: number;
  spouseId?: string;
  photoUrl?: string;
}

const DEMO_TREE: TreeMember[] = [
  { id: 'g1m', name: 'Bhikhu Mishra', relation: 'Great-grandfather', birth: '1892', alive: false, gender: 'M', color: '#6366F1', x: 300, y: 20 },
  { id: 'g1f', name: 'Rukmini Mishra', relation: 'Great-grandmother', birth: '1898', alive: false, gender: 'F', color: '#8B5CF6', x: 440, y: 20, spouseId: 'g1m' },
  { id: 'g2m', name: 'Ramesh Mishra', relation: 'Grandfather', birth: '1920', alive: false, gender: 'M', color: '#6366F1', x: 220, y: 160 },
  { id: 'g2f', name: 'Savitri Mishra', relation: 'Grandmother', birth: '1925', alive: false, gender: 'F', color: '#8B5CF6', x: 360, y: 160, spouseId: 'g2m' },
  { id: 'g3m', name: 'Ravi Mishra', relation: 'Father', birth: '1955', alive: true, gender: 'M', color: '#4F46E5', x: 120, y: 300 },
  { id: 'g3f', name: 'Sunita Mishra', relation: 'Mother', birth: '1958', alive: true, gender: 'F', color: '#7C3AED', x: 260, y: 300, spouseId: 'g3m' },
  { id: 'g3u', name: 'Suresh Mishra', relation: 'Uncle', birth: '1960', alive: true, gender: 'M', color: '#4F46E5', x: 400, y: 300 },
  { id: 'g4s1', name: 'Amit Mishra', relation: 'You', birth: '1982', alive: true, gender: 'M', color: '#4F46E5', x: 60, y: 440 },
  { id: 'g4s1w', name: 'Meera Mishra', relation: 'Spouse', birth: '1985', alive: true, gender: 'F', color: '#7C3AED', x: 200, y: 440, spouseId: 'g4s1' },
  { id: 'g4s2', name: 'Neha Mishra', relation: 'Sister', birth: '1985', alive: true, gender: 'F', color: '#8B5CF6', x: 340, y: 440 },
  { id: 'g5c1', name: 'Arjun Mishra', relation: 'Son', birth: '2018', alive: true, gender: 'M', color: '#06B6D4', x: 60, y: 580 },
  { id: 'g5c2', name: 'Priya Mishra', relation: 'Daughter', birth: '2020', alive: true, gender: 'F', color: '#EC4899', x: 200, y: 580 },
];

const DEMO_CONNECTIONS: [string, string][] = [
  ['g1m', 'g2m'], ['g2m', 'g3m'], ['g2m', 'g3u'],
  ['g3m', 'g4s1'], ['g3m', 'g4s2'], ['g4s1', 'g5c1'], ['g4s1', 'g5c2'],
];
const DEMO_SPOUSE_CONNECTIONS: [string, string][] = [
  ['g1m', 'g1f'], ['g2m', 'g2f'], ['g3m', 'g3f'], ['g4s1', 'g4s1w'],
];

const NODE_W = 130;
const NODE_H = 150;
const NODE_GAP = 20;
const TREE_GAP = 300;

function buildLayout(members: Member[]) {
  if (members.length === 0) return { positions: new Map<string, { x: number; y: number }>(), canvasWidth: 700, canvasHeight: 750 };

  const allIds = new Set(members.map(m => m.id));
  const byId = new Map(members.map(m => [m.id, m]));

  // ── Step 1: Canonicalize spouse pairs ────────────────────────────────────
  // First reference wins — prevents one person appearing in two couples.
  const spousePairs = new Map<string, string>(); // id ↔ spouseId (bidirectional)
  for (const m of members) {
    if (m.spouseId && allIds.has(m.spouseId) && !spousePairs.has(m.id) && !spousePairs.has(m.spouseId)) {
      spousePairs.set(m.id, m.spouseId);
      spousePairs.set(m.spouseId, m.id);
    }
  }

  // cuKey: sorted pair key for couples, solo id for singles
  const cuKeyOf = (id: string): string => {
    const sp = spousePairs.get(id);
    return sp ? [id, sp].sort().join('|') : id;
  };

  // ── Step 2: Build couple-unit map ─────────────────────────────────────────
  // Couple units (CU) are first-class layout nodes.
  // Spouses are merged into one unit — eliminates the spouse-leveling loop entirely.
  interface CU { primary: string; spouse?: string; children: string[] }
  const cus = new Map<string, CU>();       // cuKey → CU
  const memberCU = new Map<string, string>(); // memberId → cuKey

  for (const m of members) {
    const key = cuKeyOf(m.id);
    if (!cus.has(key)) {
      const sp = spousePairs.get(m.id);
      if (sp) {
        const [p, s] = [m.id, sp].sort();
        cus.set(key, { primary: p, spouse: s, children: [] });
      } else {
        cus.set(key, { primary: m.id, children: [] });
      }
    }
    memberCU.set(m.id, key);
  }

  // ── Step 3: Assign children to parent CUs, sorted by DOB ─────────────────
  // Children with no birth timestamp go to the end.
  const cuParent = new Map<string, string>(); // childCUKey → parentCUKey

  for (const m of members) {
    const childKey = memberCU.get(m.id)!;
    if (cuParent.has(childKey)) continue; // couple unit already placed under a parent

    const parentId = (m.fatherId && allIds.has(m.fatherId)) ? m.fatherId
      : (m.motherId && allIds.has(m.motherId)) ? m.motherId
      : null;
    if (!parentId) continue;

    const parentKey = memberCU.get(parentId)!;
    if (parentKey === childKey) continue; // self-reference guard

    cuParent.set(childKey, parentKey);
    const parentCU = cus.get(parentKey)!;
    if (!parentCU.children.includes(childKey)) parentCU.children.push(childKey);
  }

  // Sort each CU's children by the primary member's birth timestamp (oldest first).
  // Members with no birth go to Infinity → end of the list.
  const cuDob = (key: string): number => {
    const cu = cus.get(key)!;
    return byId.get(cu.primary)?.birth ?? byId.get(cu.spouse ?? '')?.birth ?? Infinity;
  };
  for (const cu of cus.values()) {
    cu.children.sort((a, b) => cuDob(a) - cuDob(b));
  }

  // ── Step 4: BFS generation assignment (top-down from roots) ──────────────
  // BFS naturally keeps siblings on the same row — bottom-up would not.
  const gen = new Map<string, number>();
  const roots = [...cus.keys()].filter(k => !cuParent.has(k));

  const bfsQ: { key: string; g: number }[] = roots.map(r => ({ key: r, g: 0 }));
  while (bfsQ.length) {
    const { key, g } = bfsQ.shift()!;
    if (gen.has(key)) continue;
    gen.set(key, g);
    for (const child of cus.get(key)!.children) {
      if (!gen.has(child)) bfsQ.push({ key: child, g: g + 1 });
    }
  }
  // Fallback for any CUs not reached (data cycles with no root)
  for (const key of cus.keys()) if (!gen.has(key)) gen.set(key, 0);

  // Safety pass: enforce child strictly below parent.
  // No spouse constraint here — CU merging already handles that.
  // Bounded to cus.size iterations; clean data needs 0 iterations.
  let changed = true, safetyIter = 0;
  while (changed && safetyIter++ < cus.size) {
    changed = false;
    for (const [key, cu] of cus) {
      const pg = gen.get(key)!;
      for (const child of cu.children) {
        if ((gen.get(child) ?? 0) <= pg) { gen.set(child, pg + 1); changed = true; }
      }
    }
  }

  // ── Step 5: Find connected components ────────────────────────────────────
  const compSeen = new Set<string>();
  const components: string[][] = [];
  for (const key of cus.keys()) {
    if (compSeen.has(key)) continue;
    const comp: string[] = [];
    const bfs = [key];
    while (bfs.length) {
      const cur = bfs.shift()!;
      if (compSeen.has(cur)) continue;
      compSeen.add(cur); comp.push(cur);
      const p = cuParent.get(cur); if (p) bfs.push(p);
      for (const c of cus.get(cur)!.children) bfs.push(c);
    }
    components.push(comp);
  }

  // ── Step 6: Layout each component ────────────────────────────────────────
  const positions = new Map<string, { x: number; y: number }>();
  let offsetX = 0;

  for (const comp of components) {
    const compSet = new Set(comp);
    const compRoots = comp.filter(k => !cuParent.has(k) || !compSet.has(cuParent.get(k)!));
    const minGen = Math.min(...comp.map(k => gen.get(k)!));

    // Bottom-up: subtree width = max(own slot, sum of children widths + gaps)
    const sw = new Map<string, number>();
    const subtreeW = (key: string): number => {
      if (sw.has(key)) return sw.get(key)!;
      const cu = cus.get(key)!;
      const ownW = NODE_W * (cu.spouse ? 2 : 1);
      const childW = cu.children.length
        ? cu.children.reduce((s, c) => s + subtreeW(c), 0) + NODE_GAP * (cu.children.length - 1)
        : 0;
      const w = childW ? Math.max(ownW, childW) : ownW;
      sw.set(key, w); return w;
    };
    for (const key of comp) subtreeW(key);

    // Top-down: place each CU centered in its slot, children spread below
    const placed = new Set<string>(); // cycle guard
    const place = (key: string, left: number) => {
      if (placed.has(key)) return;
      placed.add(key);
      const cu = cus.get(key)!;
      const w = subtreeW(key);
      const cx = offsetX + left + w / 2;
      const y = (gen.get(key)! - minGen) * NODE_H + 20;

      if (cu.spouse) {
        positions.set(cu.primary, { x: cx - NODE_W / 2 - 48, y });
        positions.set(cu.spouse,  { x: cx + NODE_W / 2 - 48, y });
      } else {
        positions.set(cu.primary, { x: cx - 48, y });
      }

      if (!cu.children.length) return;
      const totalCW = cu.children.reduce((s, c) => s + subtreeW(c), 0) + NODE_GAP * (cu.children.length - 1);
      let childLeft = left + (w - totalCW) / 2;
      for (const child of cu.children) {
        place(child, childLeft);
        childLeft += subtreeW(child) + NODE_GAP;
      }
    };

    const compW = compRoots.reduce((s, r) => s + subtreeW(r), 0) + NODE_GAP * Math.max(0, compRoots.length - 1);
    let rootLeft = 0;
    for (const r of compRoots) { place(r, rootLeft); rootLeft += subtreeW(r) + NODE_GAP; }
    offsetX += compW + TREE_GAP;
  }

  let maxX = 0, maxY = 0;
  for (const p of positions.values()) {
    maxX = Math.max(maxX, p.x + NODE_W);
    maxY = Math.max(maxY, p.y + NODE_H);
  }
  return { positions, canvasWidth: Math.max(700, maxX + 40), canvasHeight: Math.max(750, maxY + 100) };
}

interface Props {
  isDark: boolean;
  members: Member[];
  familyName: string;
  onViewProfile: (id: string) => void;
  highlightMemberId?: string;
}

export function FamilyTree({ isDark, members, familyName, onViewProfile, highlightMemberId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 60, scale: 0.8 });
  const [selected, setSelected] = useState<TreeMember | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);
  const lastPinchDistRef = useRef<number | null>(null);

  const { positions, canvasWidth, canvasHeight } = useMemo(
    () => members.length > 0 ? buildLayout(members) : { positions: new Map(), canvasWidth: 700, canvasHeight: 750 },
    [members],
  );

  const treeNodes: TreeMember[] = useMemo(
    () => members.length > 0
      ? members.map((m) => {
          const p = positions.get(m.id) ?? { x: 0, y: 0 };
          return {
            id: m.id,
            name: m.name,
            relation: m.relation,
            birth: m.birth ? timestampToDisplayDate(m.birth) : '?',
            alive: m.alive,
            gender: m.gender,
            color: getMemberColor(m.id),
            x: p.x,
            y: p.y,
            spouseId: m.spouseId,
            photoUrl: m.photoUrl,
          };
        })
      : DEMO_TREE,
    [members, positions],
  );

  const { parentChildConns, spouseConns } = useMemo(() => {
    if (members.length === 0) return { parentChildConns: DEMO_CONNECTIONS, spouseConns: DEMO_SPOUSE_CONNECTIONS };
    const allIds = new Set(members.map((m) => m.id));
    const pc: [string, string][] = [];
    for (const m of members) {
      if (m.fatherId && allIds.has(m.fatherId)) pc.push([m.fatherId, m.id]);
      if (m.motherId && allIds.has(m.motherId)) pc.push([m.motherId, m.id]);
    }
    const sp: [string, string][] = [];
    const seen = new Set<string>();
    for (const m of members) {
      if (m.spouseId && allIds.has(m.spouseId)) {
        const key = [m.id, m.spouseId].sort().join('-');
        if (!seen.has(key)) { seen.add(key); sp.push([m.id, m.spouseId]); }
      }
    }

    return { parentChildConns: pc, spouseConns: sp };
  }, [members]);

  const getMember = useCallback((id: string) => treeNodes.find((m) => m.id === id), [treeNodes]);

  // Center canvas on load / when members change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const W = container.clientWidth;
    setPos({ x: (W - 0.8 * canvasWidth) / 2, y: 60, scale: 0.8 });
  }, [canvasWidth, members.length]);

  // Highlight member navigated from profile
  useEffect(() => {
    if (!highlightMemberId || treeNodes === DEMO_TREE) return;
    const node = treeNodes.find((n) => n.id === highlightMemberId);
    if (!node || !containerRef.current) return;
    setSelected(node);
    const container = containerRef.current;
    const s = 0.9;
    const cx = container.clientWidth / 2 - (node.x + 48) * s;
    const cy = container.clientHeight / 2 - (node.y + 44) * s;
    setPos({ x: cx, y: cy, scale: s });
  }, [highlightMemberId]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    didDragRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) didDragRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    setPos((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDraggingRef.current = false; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      didDragRef.current = false;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      lastPinchDistRef.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      didDragRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    lastPinchDistRef.current = null;
  }, []);

  // Non-passive touchmove so preventDefault() stops the browser from scrolling the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) didDragRef.current = true;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setPos((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
      } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const factor = dist / lastPinchDistRef.current;
        const rect = el.getBoundingClientRect();
        const mx = (t0.clientX + t1.clientX) / 2 - rect.left;
        const my = (t0.clientY + t1.clientY) / 2 - rect.top;
        setPos((p) => {
          const ns = Math.max(0.2, Math.min(3, p.scale * factor));
          const ratio = ns / p.scale;
          return { x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio, scale: ns };
        });
        lastPinchDistRef.current = dist;
      }
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setPos((p) => {
        const ns = Math.max(0.2, Math.min(3, p.scale * factor));
        const ratio = ns / p.scale;
        return { x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio, scale: ns };
      });
    };

    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);


  const handleNodeClick = useCallback((e: React.MouseEvent, node: TreeMember) => {
    e.stopPropagation();
    if (didDragRef.current) return;
    setSelected((s) => (s?.id === node.id ? null : node));
  }, []);

  const zoomIn = useCallback(() => { setPos((p) => ({ ...p, scale: Math.min(p.scale + 0.2, 3) })); }, []);
  const zoomOut = useCallback(() => { setPos((p) => ({ ...p, scale: Math.max(p.scale - 0.2, 0.2) })); }, []);
  const reset = useCallback(() => {
    const W = containerRef.current?.clientWidth ?? 800;
    setPos({ x: (W - 0.8 * canvasWidth) / 2, y: 60, scale: 0.8 });
  }, [canvasWidth]);

  const theme = isDark ? COLORS.dark : COLORS.light;
  const cardBg = theme.card;
  const borderColor = theme.border;
  const textColor = theme.text;
  const mutedColor = theme.textMuted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: theme.background, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 20px 12px' }}>
        <div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 2 }}>Family Tree</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{familyName}</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, borderRadius: 20,
          padding: '4px 12px', border: `1px solid ${theme.border}`, background: theme.card,
        }}>
          <Users size={14} color={theme.textMuted} />
          <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{treeNodes.length}</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (!didDragRef.current) setSelected(null); }}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}
      >
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pos.x}px,${pos.y}px) scale(${pos.scale})`, transformOrigin: '0 0' }}
        >
          <defs>
            {treeNodes.map((m) => (
              <linearGradient key={`grad-${m.id}`} id={`grad-${m.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={m.color} stopOpacity="1" />
                <stop offset="1" stopColor={m.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
            {treeNodes.filter((m) => m.photoUrl && !failedImages.has(m.id)).map((m) => (
              <clipPath key={`clip-${m.id}`} id={`clip-${m.id}`}>
                <circle cx={m.x + 48} cy={m.y + 30} r={18} />
              </clipPath>
            ))}
          </defs>

          {/* Parent-child connections */}
          {parentChildConns.map(([from, to]) => {
            const f = getMember(from);
            const t = getMember(to);
            if (!f || !t) return null;
            const fx = f.x + 48, fy = f.y + 88;
            const tx = t.x + 48, ty = t.y;
            const my = (fy + ty) / 2;
            return (
              <path
                key={`${from}-${to}`}
                d={`M ${fx} ${fy} C ${fx} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                stroke={borderColor} strokeWidth="1.5" fill="none"
                strokeDasharray="4,3" opacity="0.7"
              />
            );
          })}

          {/* Spouse connections */}
          {spouseConns.map(([a, b]) => {
            const ma = getMember(a);
            const mb = getMember(b);
            if (!ma || !mb) return null;
            const left = ma.x <= mb.x ? ma : mb;
            const right = ma.x <= mb.x ? mb : ma;
            return (
              <line
                key={`sp-${a}-${b}`}
                x1={left.x + 96} y1={left.y + 44}
                x2={right.x} y2={right.y + 44}
                stroke="#EC4899" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8"
              />
            );
          })}

          {/* Member nodes */}
          {treeNodes.map((m) => {
            const isSel = selected?.id === m.id;
            return (
              <g key={m.id} onClick={(e) => handleNodeClick(e, m)} style={{ cursor: 'pointer' }}>
                {isSel && (
                  <circle cx={m.x + 48} cy={m.y + 44} r={54}
                    fill="none" stroke={m.color} strokeWidth="2" opacity="0.4" />
                )}
                <rect x={m.x} y={m.y} width={96} height={88} rx={18}
                  fill={cardBg}
                  stroke={isSel ? m.color : borderColor}
                  strokeWidth={isSel ? 2 : 1}
                />
                <circle cx={m.x + 48} cy={m.y + 30} r={22} fill={m.color} opacity="0.15" />

                {m.photoUrl && !failedImages.has(m.id) ? (
                  <image
                    href={m.photoUrl}
                    x={m.x + 30} y={m.y + 12}
                    width={36} height={36}
                    clipPath={`url(#clip-${m.id})`}
                    preserveAspectRatio="xMidYMid slice"
                    onError={() => setFailedImages((prev) => new Set(prev).add(m.id))}
                  />
                ) : (
                  <>
                    <circle cx={m.x + 48} cy={m.y + 30} r={18} fill={`url(#grad-${m.id})`} />
                    <text x={m.x + 48} y={m.y + 36} textAnchor="middle"
                      fill="#FFFFFF" fontSize="13" fontWeight="700">
                      {m.name.charAt(0)}
                    </text>
                  </>
                )}

                {/* Alive indicator dot */}
                <circle cx={m.x + 66} cy={m.y + 14} r={5}
                  fill={m.alive ? '#10B981' : '#6B7280'}
                  stroke={cardBg} strokeWidth={2}
                />

                <text x={m.x + 48} y={m.y + 62} textAnchor="middle" fill={textColor} fontSize="8.5" fontWeight="600">
                  {m.name.split(' ')[0]}
                </text>
                <text x={m.x + 48} y={m.y + 73} textAnchor="middle" fill={mutedColor} fontSize="7.5">
                  {m.relation}
                </text>
                <text x={m.x + 48} y={m.y + 83} textAnchor="middle" fill={mutedColor} fontSize="7">
                  {m.birth}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Zoom controls */}
        <div style={{ position: 'absolute', right: 16, top: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20 }}>
          <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}><ZoomIn size={15} color={theme.text} /></button>
          <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}><ZoomOut size={15} color={theme.text} /></button>
          <button onClick={(e) => { e.stopPropagation(); reset(); }} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}><Maximize2 size={15} color={theme.text} /></button>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', left: 16, bottom: 16,
          display: 'flex', gap: 8, transition: 'bottom 0.3s ease',
        }}>
          {[
            { color: COLORS.alive, label: 'Alive' },
            { color: COLORS.deceased, label: 'Deceased' },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              borderRadius: 20, padding: '5px 12px',
              border: `1px solid ${theme.border}`, background: theme.card,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: item.color }} />
              <span style={{ fontSize: 11, color: theme.textMuted }}>{item.label}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            borderRadius: 20, padding: '5px 12px',
            border: `1px solid ${theme.border}`, background: theme.card,
          }}>
            <Heart size={10} color="#EC4899" fill="#EC4899" />
            <span style={{ fontSize: 11, color: theme.textMuted }}>Married</span>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: isMobile ? 80 : 16,
          animation: 'slideUp 0.25s ease',
          zIndex: 30,
          display: 'flex',
          justifyContent: 'center',
          maxWidth: 600,
          margin: '0 auto',
        }}>

        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 24, padding: 16,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
          maxWidth: 450,
          width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            {selected.photoUrl && !failedImages.has(selected.id) ? (
              <img src={selected.photoUrl} alt={selected.name}
                style={{ width: 56, height: 56, borderRadius: 18, objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: selected.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#FFF' }}>{selected.name.charAt(0)}</span>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: theme.text }}>{selected.name}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{selected.relation}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{
                  borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 500, color: '#FFF',
                  background: selected.alive ? '#10B981' : '#6B7280',
                }}>
                  {selected.alive ? 'Alive' : 'Deceased'}
                </span>
                <span style={{ fontSize: 12, color: theme.textMuted }}>Born {selected.birth}</span>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                width: 30, height: 30, borderRadius: 15, border: 'none',
                background: isDark ? '#2A2D35' : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
              <X size={14} color={theme.textMuted} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => { onViewProfile(selected.id); setSelected(null); }}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 16, border: 'none',
                background: COLORS.primary, color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
              View Profile
            </button>
          </div>
        </div>
        </div>

      )}
    </div>
  );
}
