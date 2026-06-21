import { useEffect, useState } from 'react';
import { MemberService } from '../services/firestore';
import type { Member } from '../types';

export function useFamily(familyId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  // Track which familyId we've successfully received data for.
  // loading is derived: true whenever we have a familyId but haven't loaded it yet.
  const [loadedForId, setLoadedForId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loading = Boolean(familyId) && loadedForId !== familyId;

  useEffect(() => {
    if (!familyId) return;

    const unsubscribe = MemberService.subscribe(
      familyId,
      (m) => {
        setMembers(m);
        setLoadedForId(familyId);
        setError(null);
      },
      (e) => {
        setError(e.message ?? 'Failed to load family data.');
        setLoadedForId(familyId);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [familyId]);

  return { members, loading, error };
}
