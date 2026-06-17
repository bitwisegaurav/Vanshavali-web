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

function buildLayout(members: Member[]) {
  const allIds = new Set(members.map((m) => m.id));
  const parentToChildren = new Map<string, string[]>();
  const hasKnownParent = new Set<string>();

  for (const m of members) {
    for (const pid of [m.fatherId, m.motherId]) {
      if (pid && allIds.has(pid)) {
        if (!parentToChildren.has(pid)) parentToChildren.set(pid, []);
        parentToChildren.get(pid)!.push(m.id);
        hasKnownParent.add(m.id);
      }
    }
  }

  const gen = new Map<string, number>();
  const queue: Array<{ id: string; g: number }> = [];
  for (const m of members) {
    if (!hasKnownParent.has(m.id)) queue.push({ id: m.id, g: 0 });
  }
  while (queue.length > 0) {
    const { id, g } = queue.shift()!;
    if (gen.has(id)) continue;
    gen.set(id, g);
    for (const cid of parentToChildren.get(id) ?? []) {
      if (!gen.has(cid)) queue.push({ id: cid, g: g + 1 });
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of members) {
      if (m.spouseId && allIds.has(m.spouseId)) {
        const ga = gen.get(m.id) ?? 0;
        const gb = gen.get(m.spouseId) ?? 0;
        if (ga !== gb) {
          const maxG = Math.max(ga, gb);
          gen.set(m.id, maxG);
          gen.set(m.spouseId, maxG);
          changed = true;
        }
      }
    }
    for (const [parentId, childIds] of parentToChildren.entries()) {
      const parentGen = gen.get(parentId) ?? 0;
      for (const childId of childIds) {
        if ((gen.get(childId) ?? 0) <= parentGen) {
          gen.set(childId, parentGen + 1);
          changed = true;
        }
      }
    }
  }

  const byGen = new Map<number, string[]>();
  for (const [id, g] of gen.entries()) {
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(id);
  }

  const spouseOf = new Map<string, string>();
  for (const m of members) {
    if (m.spouseId && allIds.has(m.spouseId)) spouseOf.set(m.id, m.spouseId);
  }
  for (const [g, ids] of byGen.entries()) {
    const ordered: string[] = [];
    const placed = new Set<string>();
    for (const id of ids) {
      if (placed.has(id)) continue;
      ordered.push(id);
      placed.add(id);
      const sp = spouseOf.get(id);
      if (sp && ids.includes(sp) && !placed.has(sp)) {
        ordered.push(sp);
        placed.add(sp);
      }
    }
    byGen.set(g, ordered);
  }

  let maxRowCount = 0;
  for (const ids of byGen.values()) maxRowCount = Math.max(maxRowCount, ids.length);
  const canvasWidth = Math.max(700, maxRowCount * NODE_W + 40);

  const positions = new Map<string, { x: number; y: number }>();
  for (const [g, ids] of byGen.entries()) {
    const startX = (canvasWidth - ids.length * NODE_W) / 2;
    ids.forEach((id, i) => {
      positions.set(id, { x: startX + i * NODE_W, y: g * NODE_H + 20 });
    });
  }

  const maxGen = byGen.size > 0 ? Math.max(...byGen.keys()) : 0;
  return { positions, canvasWidth, canvasHeight: (maxGen + 1) * NODE_H + 100 };
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

  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

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

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setPos((p) => {
      const ns = Math.max(0.2, Math.min(3, p.scale * factor));
      const ratio = ns / p.scale;
      return { x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio, scale: ns };
    });
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent, node: TreeMember) => {
    e.stopPropagation();
    if (didDragRef.current) return;
    setSelected((s) => (s?.id === node.id ? null : node));
  }, []);

  function zoomIn() { setPos((p) => ({ ...p, scale: Math.min(p.scale + 0.2, 3) })); }
  function zoomOut() { setPos((p) => ({ ...p, scale: Math.max(p.scale - 0.2, 0.2) })); }
  function reset() {
    const W = containerRef.current?.clientWidth ?? 800;
    setPos({ x: (W - 0.8 * canvasWidth) / 2, y: 60, scale: 0.8 });
  }

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
        onWheel={onWheel}
        onClick={() => { if (!didDragRef.current) setSelected(null); }}
        style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: isDraggingRef.current ? 'grabbing' : 'grab', userSelect: 'none' }}
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
          {[
            { icon: ZoomIn, action: zoomIn },
            { icon: ZoomOut, action: zoomOut },
            { icon: Maximize2, action: reset },
          ].map(({ icon: Icon, action }, i) => (
            <button key={i} onClick={(e) => { e.stopPropagation(); action(); }}
              style={{
                width: 36, height: 36, borderRadius: 12, border: `1px solid ${theme.border}`,
                background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}>
              <Icon size={15} color={theme.text} />
            </button>
          ))}
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
          position: 'absolute', left: 16, right: 16, bottom: 16,
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
