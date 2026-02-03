import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import type { BugReport, BugReportScreenshot, BugReportStatus } from '../types/bugReport';

interface BugReportResponse {
  data: BugReport;
}

interface BugReportListResponse {
  data: BugReport[];
}

interface BugReportScreenshotResponse {
  data: BugReportScreenshot;
}

interface UpdateStatusResponse {
  data: BugReport;
}

export interface BugReportCreateRequest {
  title: string;
  description: string;
}

class BugReportService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async createReport(data: BugReportCreateRequest): Promise<BugReport> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/bug-reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al crear el reporte');
    }

    const result: BugReportResponse = await response.json();
    return result.data;
  }

  async uploadScreenshot(
    reportId: string,
    uri: string,
    fileName?: string,
    mimeType?: string,
    position?: number
  ): Promise<BugReportScreenshot> {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No auth token found');
    }

    const name = fileName || `bug-${Date.now()}.jpg`;
    const type = mimeType || 'image/jpeg';

    const formData = new FormData();
    formData.append('screenshot', {
      uri,
      name,
      type,
    } as any);
    if (position !== undefined) {
      formData.append('position', String(position));
    }

    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/bug-reports/screenshot?report_id=${reportId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al subir la captura');
    }

    const result: BugReportScreenshotResponse = await response.json();
    return result.data;
  }

  async getMyReports(): Promise<BugReport[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_CONFIG.FUNCTIONS_URL}/bug-reports`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al cargar reportes');
    }

    const result: BugReportListResponse = await response.json();
    return result.data ?? [];
  }

  async updateStatus(reportId: string, status: BugReportStatus): Promise<BugReport> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${API_CONFIG.FUNCTIONS_URL}/bug-reports/${reportId}/status`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Error al actualizar estado');
    }

    const result: UpdateStatusResponse = await response.json();
    return result.data;
  }
}

export const bugReportService = new BugReportService();
