import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchResponse } from './testUtils';
import { flatExpenseService } from '../../src/services/flatExpenseService';

describe('flatExpenseService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns expenses and members', async () => {
    mockFetchJson({ data: [{ id: 'e1' }], members: [{ id: 'm1' }] });
    const result = await flatExpenseService.getExpenses('f1');
    expect(result.expenses.length).toBe(1);
    expect(result.members.length).toBe(1);
  });

  it('throws on createExpense error', async () => {
    mockFetchResponse({ ok: false, status: 500, json: {} });
    await expect(
      flatExpenseService.createExpense({
        flat_id: 'f1',
        concept: 'Rent',
        amount: 10,
      })
    ).rejects.toThrow('Error al guardar gasto');
  });
});
