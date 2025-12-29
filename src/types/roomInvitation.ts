export interface RoomInvitation {
  id: string;
  room_id: string;
  owner_id: string;
  code: string;
  expires_at?: string | null;
  created_at: string;
  used_at?: string | null;
  used_by?: string | null;
}
