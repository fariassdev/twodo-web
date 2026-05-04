import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:3000";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { invite_code, email, sender_name } = await req.json();

    if (!invite_code || !email || !sender_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invite_code, email, sender_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Resend API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const joinUrl = `${APP_URL}/join?code=${encodeURIComponent(invite_code)}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#11211c;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#11211c;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#1a2f28;border-radius:16px;padding:40px 32px;" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="width:64px;height:64px;background:#17cf91;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:32px;">💚</span>
          </div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h1 style="margin:0;color:#f1f5f9;font-size:24px;font-weight:700;">You're invited!</h1>
        </td></tr>
        <tr><td align="center" style="padding-bottom:32px;">
          <p style="margin:0;color:#94a3b8;font-size:16px;line-height:1.5;">
            <strong style="color:#17cf91;">${sender_name}</strong> wants to organize life together with you. Join their household to start planning, sharing tasks, and staying in sync.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${joinUrl}" style="display:inline-block;background:#17cf91;color:#11211c;font-weight:700;font-size:16px;padding:14px 40px;border-radius:12px;text-decoration:none;">
            Join Household →
          </a>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <p style="margin:0;color:#64748b;font-size:13px;">Or enter this code manually:</p>
          <p style="margin:8px 0 0;color:#17cf91;font-size:20px;font-weight:700;letter-spacing:2px;">${invite_code}</p>
        </td></tr>
        <tr><td align="center">
          <p style="margin:0;color:#475569;font-size:12px;">This invite expires in 3 days.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Twodo <onboarding@resend.dev>",
        to: [email],
        subject: `${sender_name} te invita a organizar juntos`,
        html: htmlBody,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
