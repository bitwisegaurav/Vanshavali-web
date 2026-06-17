import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Member } from '../types';
import { getDb } from './firebase';

export const MemberService = {
  subscribe(
    familyId: string,
    callback: (members: Member[]) => void,
    onError?: (e: Error) => void,
  ): () => void {
    const q = query(
      collection(getDb(), 'members'),
      where('familyId', '==', familyId),
    );
    return onSnapshot(
      q,
      (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
      },
      (e) => onError?.(e),
    );
  },
};
