import { useEffect, useState } from 'react';
import { MemberService } from '../services/firestore';
import type { Member } from '../types';

export function useFamily(familyId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = MemberService.subscribe(
      familyId,
      (m) => {
        setMembers(m);
        setLoading(false);
      },
      (e) => {
        setError(e.message ?? 'Failed to load family data.');
        setLoading(false);
      },
    );

    return unsub;
  }, [familyId]);

  return { members, loading, error };
}
