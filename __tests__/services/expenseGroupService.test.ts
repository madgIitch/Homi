import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { expenseGroupService } from '../../src/services/expenseGroupService';

describe('expenseGroupService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns groups', async () => {
    mockFetchJson({ data: [{ id: 'g1', name: 'Grupo' }] });
    const result = await expenseGroupService.getUserGroups();
    expect(result.length).toBe(1);
  });

  it('throws on createGroup error', async () => {
    mockFetchResponse({ ok: false, status: 500, text: 'fail' });
    await expect(
      expenseGroupService.createGroup({ name: 'Test' })
    ).rejects.toThrow('fail');
  });

  it('throws on inviteMembers error', async () => {
    mockFetchResponse({ ok: false, status: 400, text: 'invite-error' });
    await expect(
      expenseGroupService.inviteMembers('g1', ['a@b.com'])
    ).rejects.toThrow('invite-error');
  });

  it('throws on createInviteLink error', async () => {
    mockFetchResponse({ ok: false, status: 400, text: 'link-error' });
    await expect(
      expenseGroupService.createInviteLink('g1')
    ).rejects.toThrow('link-error');
  });

  it('throws on joinByCode error', async () => {
    mockFetchResponse({ ok: false, status: 400, text: 'join-error' });
    await expect(
      expenseGroupService.joinByCode('CODE123')
    ).rejects.toThrow('join-error');
  });

  it('throws on removeMember error', async () => {
    mockFetchResponse({ ok: false, status: 400, text: 'remove-error' });
    await expect(
      expenseGroupService.removeMember('g1', 'u1')
    ).rejects.toThrow('remove-error');
  });

  it('throws on leaveGroup error', async () => {
    mockFetchResponse({ ok: false, status: 400, text: 'leave-error' });
    await expect(expenseGroupService.leaveGroup('g1')).rejects.toThrow('leave-error');
  });
});
