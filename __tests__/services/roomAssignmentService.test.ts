import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchText } from './testUtils';
import { roomAssignmentService } from '../../src/services/roomAssignmentService';

describe('roomAssignmentService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns data on getAssignments', async () => {
    mockFetchJson({ data: { assignments: [] } });
    const result = await roomAssignmentService.getAssignments('match1');
    expect(result).toEqual({ assignments: [] });
  });

  it('throws on createAssignment error', async () => {
    mockFetchText('bad', 500);
    await expect(
      roomAssignmentService.createAssignment({
        room_id: 'r1',
        assignee_id: 'u1',
      })
    ).rejects.toThrow('bad');
  });
});
