// supabase/functions/bug-reports/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { withAuth, getUserId } from '../_shared/auth.ts';
import type { JWTPayload } from '../_shared/types.ts';

type BugReportStatus = 'pending' | 'in_progress' | 'resolved';

interface BugReportRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: BugReportStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

interface BugReportScreenshotRow {
  id: string;
  bug_report_id: string;
  storage_path: string;
  position: number;
  created_at: string;
}

const STATUS_VALUES: BugReportStatus[] = ['pending', 'in_progress', 'resolved'];
const MAX_SCREENSHOTS = 5;

const isAdmin = (payload: JWTPayload) =>
  payload.app_metadata?.role === 'admin';

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from('bug-screenshots')
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[bug-reports] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

const getRouteParts = (url: URL) => {
  const parts = url.pathname.split('/').filter(Boolean);
  const index = parts.indexOf('bug-reports');
  if (index === -1) return parts;
  return parts.slice(index + 1);
};

async function attachScreenshots(reports: BugReportRow[]) {
  if (reports.length === 0) return [];
  const reportIds = reports.map((report) => report.id);
  const { data: screenshotRows, error } = await supabaseAdmin
    .from('bug_report_screenshots')
    .select('*')
    .in('bug_report_id', reportIds)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[bug-reports] Screenshots fetch error:', error);
  }

  const signedScreenshots = await Promise.all(
    (screenshotRows ?? []).map(async (row) => ({
      ...(row as BugReportScreenshotRow),
      signedUrl: (await signedUrlForPath(row.storage_path)) ?? '',
    }))
  );

  const grouped = new Map<string, BugReportScreenshotRow[]>();
  signedScreenshots.forEach((row) => {
    const list = grouped.get(row.bug_report_id) ?? [];
    list.push(row);
    grouped.set(row.bug_report_id, list);
  });

  return reports.map((report) => ({
    ...report,
    screenshots: grouped.get(report.id) ?? [],
  }));
}

async function canAccessReport(reportId: string, userId: string, allowAdmin: boolean) {
  const { data, error } = await supabaseAdmin
    .from('bug_reports')
    .select('id, user_id')
    .eq('id', reportId)
    .single();

  if (error || !data) return false;
  return data.user_id === userId || allowAdmin;
}

serve(
  withAuth(async (req: Request, payload: JWTPayload): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const userId = getUserId(payload);
    const url = new URL(req.url);
    const method = req.method;
    const routeParts = getRouteParts(url);

    if (method === 'GET') {
      if (routeParts[0] === 'all') {
        if (!isAdmin(payload)) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseAdmin
          .from('bug_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) {
          console.error('[bug-reports] list all error:', error);
          return new Response(JSON.stringify({ error: 'Error fetching reports' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const dataWithScreens = await attachScreenshots(data as BugReportRow[]);
        return new Response(JSON.stringify({ data: dataWithScreens }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('bug_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        console.error('[bug-reports] list error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching reports' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const dataWithScreens = await attachScreenshots(data as BugReportRow[]);
      return new Response(JSON.stringify({ data: dataWithScreens }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      if (routeParts[0] === 'screenshot') {
        const reportId = url.searchParams.get('report_id');
        if (!reportId) {
          return new Response(JSON.stringify({ error: 'report_id is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const allowAdmin = isAdmin(payload);
        if (!(await canAccessReport(reportId, userId, allowAdmin))) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const contentType = req.headers.get('content-type') || '';
        if (!contentType.toLowerCase().includes('multipart/form-data')) {
          return new Response(
            JSON.stringify({
              error: 'Invalid content type. Expected multipart/form-data',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const { count } = await supabaseAdmin
          .from('bug_report_screenshots')
          .select('id', { count: 'exact', head: true })
          .eq('bug_report_id', reportId);
        const existingCount = count ?? 0;

        if (existingCount >= MAX_SCREENSHOTS) {
          return new Response(JSON.stringify({ error: 'Max screenshots reached' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const formData = await req.formData();
        const file = formData.get('screenshot');
        const positionRaw = formData.get('position');
        const parsedPosition =
          typeof positionRaw === 'string' ? Number(positionRaw) : null;
        const nextPosition =
          parsedPosition && parsedPosition > 0 ? parsedPosition : existingCount + 1;

        if (!file || !(file instanceof File)) {
          return new Response(
            JSON.stringify({
              error: 'No file provided or invalid field name (expected "screenshot")',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const fileExt = file.name.split('.').pop() || 'jpg';
        const mimeType = file.type || 'image/jpeg';
        const filePath = `${reportId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
          .from('bug-screenshots')
          .upload(filePath, fileBytes, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error('[bug-reports] Upload error:', uploadError);
          return new Response(JSON.stringify({ error: 'Error uploading file' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('bug_report_screenshots')
          .insert({
            bug_report_id: reportId,
            storage_path: filePath,
            position: nextPosition,
          })
          .select()
          .single();

        if (insertError || !inserted) {
          console.error('[bug-reports] Insert error:', insertError);
          return new Response(JSON.stringify({ error: 'Error saving screenshot' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabaseAdmin
          .from('bug_reports')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', reportId);

        const signedUrl = await signedUrlForPath(filePath);
        const responseData = {
          ...(inserted as BugReportScreenshotRow),
          signedUrl: signedUrl ?? '',
        };

        return new Response(JSON.stringify({ data: responseData }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      const description =
        typeof body?.description === 'string' ? body.description.trim() : '';

      if (!title || !description) {
        return new Response(JSON.stringify({ error: 'Title and description required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: inserted, error } = await supabaseAdmin
        .from('bug_reports')
        .insert({
          user_id: userId,
          title,
          description,
          status: 'pending',
        })
        .select()
        .single();

      if (error || !inserted) {
        console.error('[bug-reports] create error:', error);
        return new Response(JSON.stringify({ error: 'Error creating report' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: inserted }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH' && routeParts.length >= 2 && routeParts[1] === 'status') {
      if (!isAdmin(payload)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const reportId = routeParts[0];
      const body = await req.json();
      const status = body?.status as BugReportStatus | undefined;

      if (!status || !STATUS_VALUES.includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updates = {
        status,
        updated_at: new Date().toISOString(),
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        resolved_by: status === 'resolved' ? userId : null,
      };

      const { data: updated, error } = await supabaseAdmin
        .from('bug_reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();

      if (error || !updated) {
        console.error('[bug-reports] update status error:', error);
        return new Response(JSON.stringify({ error: 'Error updating status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ data: updated }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  })
);
