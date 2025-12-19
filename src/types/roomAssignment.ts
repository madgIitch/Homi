import type { Profile } from './profile';
import type { Room } from './room';

export type RoomAssignmentStatus = 'offered' | 'accepted' | 'rejected';

export interface RoomAssignment {
  id: string;
  room_id: string;
  match_id?: string | null;
  assignee_id: string;
  status: RoomAssignmentStatus;
  created_at: string;
  updated_at: string;
  room?: Room;
  assignee?: Profile;
}

export interface RoomAssignmentsResponse {
  owner_id: string;
  match_assignment?: RoomAssignment | null;
  assignments: RoomAssignment[];
}
