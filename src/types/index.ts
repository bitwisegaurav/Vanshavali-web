export interface Member {
  id: string;
  familyId: string;
  name: string;
  nickname?: string;
  relation: string;
  birth?: number;
  death?: number;
  alive: boolean;
  gender: 'M' | 'F' | 'Other';
  color?: string;
  occupation?: string;
  education?: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  gotra?: string;
  nativePlace?: string;
  surname?: string;
  village?: string;
  fatherId?: string;
  motherId?: string;
  spouseId?: string;
  childrenIds?: string[];
  photoUrl?: string;
  generation?: number;
  memoriesCount?: number;
  documentsCount?: number;
  timeline?: Array<{ year: string; event: string }>;
  createdAt: number;
  updatedAt: number;
}

export interface FamilyData {
  id: string;
  name: string;
  ownerDeviceId: string;
  memberCount?: number;
  generations?: number;
  createdAt: number;
}

export type View = 'tree' | 'profile';
