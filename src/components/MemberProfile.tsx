import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronRight,
  Droplet,
  GitBranch,
  GraduationCap,
  Heart,
  Home,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import { COLORS, getMemberColor } from '../constants/colors';
import { timestampToDisplayDate } from '../utils/date';
import type { Member } from '../types';

const DEMO_MEMBER: Member = {
  id: 'g3m',
  familyId: '',
  name: 'Ravi Mishra',
  relation: 'Father',
  birth: new Date('1955-03-12').getTime(),
  alive: true,
  gender: 'M',
  occupation: 'Retired Teacher',
  education: 'M.A. Hindi Literature',
  phone: '+91 98765 43210',
  email: 'ravi.mishra@email.com',
  address: '12 Shiv Nagar, Varanasi, UP 221001',
  bloodGroup: 'B+',
  maritalStatus: 'Married',
  gotra: 'Kashyap',
  nativePlace: 'Varanasi, UP',
  memoriesCount: 34,
  documentsCount: 7,
  timeline: [
    { year: '1955', event: 'Born in Varanasi' },
    { year: '1978', event: 'Completed M.A. from BHU' },
    { year: '1980', event: 'Married Sunita Devi' },
    { year: '1982', event: 'Son Amit born' },
    { year: '1985', event: 'Daughter Neha born' },
    { year: '2015', event: 'Retired from teaching' },
  ],
  createdAt: 0,
  updatedAt: 0,
};

interface Props {
  isDark: boolean;
  member?: Member | null;
  members?: Member[];
  onBack: () => void;
  onViewInTree: (id: string) => void;
  onNavigateToMember: (id: string) => void;
}

export function MemberProfile({ isDark, member, members = [], onBack, onViewInTree, onNavigateToMember }: Props) {
  const m = member ?? DEMO_MEMBER;
  const color = m.color ?? getMemberColor(m.id);
  const theme = isDark ? COLORS.dark : COLORS.light;

  const detailRows = [
    { icon: Briefcase, label: 'Occupation', value: m.occupation },
    { icon: GraduationCap, label: 'Education', value: m.education },
    { icon: Calendar, label: 'Date of Birth', value: m.birth ? timestampToDisplayDate(m.birth) : undefined },
    { icon: Calendar, label: 'Date of Death', value: m.death ? timestampToDisplayDate(m.death) : undefined },
    { icon: Droplet, label: 'Blood Group', value: m.bloodGroup },
    { icon: Heart, label: 'Marital Status', value: m.maritalStatus },
    { icon: Home, label: 'Native Place', value: m.nativePlace },
    { icon: MapPin, label: 'Address', value: m.address },
    { icon: Phone, label: 'Phone', value: m.phone },
    { icon: Mail, label: 'Email', value: m.email },
  ].filter((r) => r.value);

  const connections = [
    { label: 'Father', id: m.fatherId ?? null, color: COLORS.indigo },
    { label: 'Mother', id: m.motherId ?? null, color: COLORS.violet },
    { label: 'Spouse', id: m.spouseId ?? null, color: COLORS.pink },
    ...(m.childrenIds ?? []).map((cid, i) => ({ label: `Child ${i + 1}`, id: cid, color: COLORS.cyan })),
  ];

  const connectionsCount = [m.fatherId, m.motherId, m.spouseId, ...(m.childrenIds ?? [])].filter(Boolean).length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: theme.background }}>
      {/* Hero */}
      <div style={{ position: 'relative' }}>
        <div style={{
          height: 176,
          background: 'linear-gradient(135deg, #6D28D9 0%, #4F46E5 50%, #3B82F6 100%)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* glow */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: 80,
            background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '52px 16px 0' }}>
            <button onClick={onBack} style={heroBtn}>
              <ArrowLeft size={16} color="#FFF" />
            </button>
            <button onClick={() => onViewInTree(m.id)} style={heroBtn}>
              <GitBranch size={14} color="#FFF" />
            </button>
          </div>
        </div>

        {/* Avatar overlapping hero */}
        <div style={{ position: 'absolute', bottom: -40, left: 0, right: 0 }}>
        <div style={{ maxWidth: 650, margin: '0 auto', paddingLeft: 20 }}>
        <div style={{
          borderRadius: 28, padding: 4, background: theme.background, display: 'inline-block',
        }}>
          {m.photoUrl ? (
            <img src={m.photoUrl} alt={m.name}
              style={{ width: 80, height: 80, borderRadius: 24, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: 24, background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: '#FFF' }}>{m.name.charAt(0)}</span>
            </div>
          )}
        </div>
        </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 60, maxWidth: 650, margin: '0 auto' }}>
        {/* Name & status */}
        <div style={{ padding: '56px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{m.name}</div>
              <div style={{ fontSize: 14, color: theme.textMuted, marginTop: 4 }}>
                {m.relation}{m.birth ? ` · Born ${timestampToDisplayDate(m.birth)}` : ''}
              </div>
            </div>
            <span style={{
              borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500, color: '#FFF',
              background: m.alive ? COLORS.alive : COLORS.deceased, marginTop: 4,
            }}>
              {m.alive ? 'Alive' : 'Deceased'}
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Memories', value: m.memoriesCount ?? 0, color: COLORS.pink },
              { label: 'Documents', value: m.documentsCount ?? 0, color: COLORS.blue },
              { label: 'Connections', value: connectionsCount, color: COLORS.violet },
            ].map((stat) => (
              <div key={stat.label} style={{
                flex: 1, borderRadius: 18, border: `1px solid ${theme.border}`,
                background: theme.card, display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '12px 0',
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                <span style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* View in Tree */}
          <button
            onClick={() => onViewInTree(m.id)}
            style={{
              marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '11px 0', borderRadius: 16,
              border: `1px solid ${theme.border}`, background: 'transparent',
              color: theme.text, fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
            <GitBranch size={14} color={theme.text} />
            View in Tree
          </button>
        </div>

        {/* Personal Details */}
        {detailRows.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 12 }}>
              Personal Details
            </div>
            <div style={{ borderRadius: 20, border: `1px solid ${theme.border}`, background: theme.card, overflow: 'hidden' }}>
              {detailRows.map((row, i) => (
                <div key={row.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < detailRows.length - 1 ? `1px solid ${theme.border}` : 'none',
                }}>
                  <row.icon size={15} color={theme.textMuted} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{row.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, marginTop: 1 }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family Connections */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 12 }}>
            Family Connections
          </div>
          <div style={{ borderRadius: 20, border: `1px solid ${theme.border}`, background: theme.card, overflow: 'hidden' }}>
            {connections.map((conn, i) => {
              const linkedName = conn.id ? (members.find((x) => x.id === conn.id)?.name ?? conn.id) : null;
              return (
                <div
                  key={`${conn.label}-${i}`}
                  onClick={() => conn.id && onNavigateToMember(conn.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: conn.id ? 'pointer' : 'default',
                    borderBottom: i < connections.length - 1 ? `1px solid ${theme.border}` : 'none',
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: conn.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Users size={13} color="#FFF" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{conn.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: linkedName ? theme.text : theme.textMuted, marginTop: 1 }}>
                      {linkedName ?? 'Not linked'}
                    </div>
                  </div>
                  {conn.id && <ChevronRight size={14} color={theme.textMuted} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Life Timeline */}
        {m.timeline && m.timeline.length > 0 && (
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 12 }}>
              Life Timeline
            </div>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              <div style={{
                position: 'absolute', left: 6, top: 8, bottom: 8, width: 1,
                background: theme.border,
              }} />
              {m.timeline.map((event, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{
                    position: 'absolute', left: -22, top: 12,
                    width: 10, height: 10, borderRadius: 5,
                    border: `2px solid ${COLORS.primary}`,
                    background: theme.background,
                  }} />
                  <div style={{
                    borderRadius: 18, border: `1px solid ${theme.border}`,
                    background: theme.card, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{event.year}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, marginTop: 2 }}>{event.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const heroBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 18,
  background: 'rgba(255,255,255,0.2)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};
