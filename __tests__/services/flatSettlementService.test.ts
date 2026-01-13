import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockFetchJson, mockFetchText } from './testUtils';
import { flatSettlementService } from '../../src/services/flatSettlementService';

describe('flatSettlementService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
  });

  it('returns settlement data', async () => {
    mockFetchJson({ data: { flat_id: 'f1' } });
    const result = await flatSettlementService.getSettlement('f1');
    expect(result.flat_id).toBe('f1');
  });

  it('throws on setTransferPaid error', async () => {
    mockFetchText('bad', 500);
    await expect(
      flatSettlementService.setTransferPaid({
        flat_id: 'f1',
        month: '2024-01',
        from_id: 'u1',
        to_id: 'u2',
        amount: 10,
        paid: true,
      })
    ).rejects.toThrow('bad');
  });
});
