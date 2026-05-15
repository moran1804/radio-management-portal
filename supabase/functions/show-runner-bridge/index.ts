// Show Runner Bridge
// Lets an external show runner read shows/credentials and write job events + recordings
// using a single shared API key (X-API-Key header). No service_role key leaves the server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("SHOW_RUNNER_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceKey) {
    return json({ error: "Server not configured" }, 500);
  }

  const provided = req.headers.get("x-api-key") ?? req.headers.get("X-API-Key");
  if (!provided || provided !== apiKey) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  // Path after the function name, e.g. /show-runner-bridge/shows -> "shows"
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("show-runner-bridge");
  const action = idx >= 0 ? parts.slice(idx + 1).join("/") : parts.join("/");

  try {
    // GET /shows?from=ISO&to=ISO&limit=50
    if (req.method === "GET" && action === "shows") {
      const from = url.searchParams.get("from") ?? new Date().toISOString();
      const to = url.searchParams.get("to");
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

      let q = supabase
        .from("shows")
        .select(
          "id,title,description,status,show_type,start_time,end_time,duration_seconds,file_path,storage_path,dj_id,recurring_slot_id"
        )
        .neq("status", "cancelled")
        .gte("end_time", from)
        .order("start_time", { ascending: true })
        .limit(limit);
      if (to) q = q.lte("start_time", to);

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ shows: data });
    }

    // GET /streaming-credentials
    if (req.method === "GET" && action === "streaming-credentials") {
      const { data, error } = await supabase
        .from("streaming_credentials")
        .select("id,type,address,port,mountpoint,username,password,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ credentials: data });
    }

    // POST /jobs/status  { job_id, status, pid? }
    if (req.method === "POST" && action === "jobs/status") {
      const body = await req.json().catch(() => null) as
        | { job_id?: string; status?: string; pid?: number }
        | null;
      if (!body?.job_id || !body?.status) {
        return json({ error: "job_id and status required" }, 400);
      }
      const patch: Record<string, unknown> = {
        status: body.status,
        updated_at: new Date().toISOString(),
      };
      if (typeof body.pid === "number") patch.pid = body.pid;

      const { data, error } = await supabase
        .from("jobs")
        .update(patch)
        .eq("id", body.job_id)
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ job: data });
    }

    // POST /jobs/event  { job_id, message, level? }
    if (req.method === "POST" && action === "jobs/event") {
      const body = await req.json().catch(() => null) as
        | { job_id?: string; message?: string; level?: string }
        | null;
      if (!body?.job_id || !body?.message) {
        return json({ error: "job_id and message required" }, 400);
      }
      const { data, error } = await supabase
        .from("job_events")
        .insert({
          job_id: body.job_id,
          message: body.message,
          level: body.level ?? "info",
        })
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ event: data });
    }

    // POST /recordings  { show_id, title, file_path?, storage_path?, duration?, status? }
    if (req.method === "POST" && action === "recordings") {
      const body = await req.json().catch(() => null) as
        | {
            show_id?: string;
            title?: string;
            file_path?: string;
            storage_path?: string;
            duration?: number;
            status?: string;
          }
        | null;
      if (!body?.title) return json({ error: "title required" }, 400);

      const { data, error } = await supabase
        .from("show_recordings")
        .insert({
          show_id: body.show_id ?? null,
          title: body.title,
          file_path: body.file_path ?? null,
          storage_path: body.storage_path ?? null,
          duration: body.duration ?? null,
          status: body.status ?? "active",
        })
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ recording: data });
    }

    // GET /health
    if (req.method === "GET" && (action === "health" || action === "")) {
      return json({ ok: true });
    }

    return json({ error: "Not found", action, method: req.method }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});