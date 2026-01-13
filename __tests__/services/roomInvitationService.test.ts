import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse, mockFetchText } from './testUtils';
import { roomInvitationService } from '../../src/services/roomInvitationService';

describe('roomInvitationService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('creates invitation and returns data', async () => {
    mockFetchJson({ data: { id: 'inv1', code: 'ABC' } });
    const data = await roomInvitationService.createInvitation('room1');
    expect(data.id).toBe('inv1');
  });

  it('throws on invalid payload', async () => {
    mockFetchJson({ data: null });
    await expect(
      roomInvitationService.createInvitation('room1')
    ).rejects.toThrow('Respuesta invalida al crear invitacion');
  });

  it('throws on api error', async () => {
    mockFetchText('bad', 500);
    await expect(
      roomInvitationService.createInvitation('room1')
    ).rejects.toThrow('bad');
  });
});
