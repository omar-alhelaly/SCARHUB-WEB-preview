// send-notices: emails the reason to the person affected by a staff deletion, but only for notices staff queued with a reason and an explicit opt-in.
// The recipient comes from the notice_outbox row (read by the database from the affected account), never from this request.
// A send failure never undoes anything: it marks the row failed and writes notice_failed to the audit log.
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

const ORIGIN = "https://omar-alhelaly.github.io";
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const SITE = "https://omar-alhelaly.github.io/SCARHUB-WEB/";
const T: Record<string, { en: string; ar: string; sub: string }> = {
  account_deleted: { en: "Your SCARHUB account was deleted by the team.", ar: "حسابك على SCARHUB اتحذف من الإدارة.", sub: "SCARHUB: your account was deleted | حسابك اتحذف" },
  message_deleted: { en: "A message you posted in the SCARHUB community chat was removed by the team.", ar: "رسالة كتبتها في شات المجتمع على SCARHUB اتمسحت من الإدارة.", sub: "SCARHUB: a message was removed | رسالة اتمسحت" },
  chat_cleared: { en: "Your messages in the SCARHUB community chat were removed by the team.", ar: "رسايلك في شات المجتمع على SCARHUB اتمسحت من الإدارة.", sub: "SCARHUB: your chat messages were removed | رسايلك اتمسحت" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user: me } } = await user.auth.getUser();
  if (!me) return json({ error: "auth" }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error } = await admin.rpc("claim_notices", { p_actor: me.id });
  if (error) return json({ error: "claim" }, 500);
  const gu = Deno.env.get("GMAIL_USER"), gp = Deno.env.get("GMAIL_APP_PASSWORD");
  const tr = gu && gp ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gu, pass: gp } }) : null;
  let sent = 0, failed = 0;
  for (const n of (rows ?? []) as Array<{ id: number; kind: string; to_email: string; to_name: string | null; reason: string; by_name: string | null; by_email: string | null; by_role: string | null }>) {
    try {
      if (!tr) throw new Error("smtp not configured");
      const t = T[n.kind];
      const name = n.to_name ? esc(n.to_name) : "";
      const adm = n.by_role === "admin" && n.by_name;
      const byEn = adm ? `\nSent by admin ${n.by_name}.` : "", byAr = adm ? `\nاتبعت من الأدمن ${n.by_name}.` : "";
      const byHtmlEn = adm ? `<p style="color:#555">Sent by admin ${esc(n.by_name!)}.</p>` : "", byHtmlAr = adm ? `<p style="color:#555">اتبعت من الأدمن ${esc(n.by_name!)}.</p>` : "";
      const text = `Hi ${n.to_name ?? ""},\n\n${t.en}\nReason: ${n.reason}\n${byEn}\nIf you think this is a mistake, contact us: ${SITE}contact.html\n\n---\n\nأهلا ${n.to_name ?? ""}،\n\n${t.ar}\nالسبب: ${n.reason}\n${byAr}\nلو شايف إن ده حصل بالغلط، كلمنا من هنا: ${SITE}contact.html\n\nSCAR by Zenoth`;
      const html = `<div style="font-family:system-ui,Segoe UI,Tahoma,sans-serif;max-width:560px;line-height:1.7"><p>Hi ${name},</p><p>${t.en}</p><p><b>Reason:</b> ${esc(n.reason)}</p>${byHtmlEn}<p>If you think this is a mistake, <a href="${SITE}contact.html">contact us</a>.</p><hr><div dir="rtl"><p>أهلا ${name}،</p><p>${t.ar}</p><p><b>السبب:</b> ${esc(n.reason)}</p>${byHtmlAr}<p>لو شايف إن ده حصل بالغلط، <a href="${SITE}contact.html">كلمنا من هنا</a>.</p></div><p style="color:#777">SCAR by Zenoth</p></div>`;
      const fromName = adm ? `${String(n.by_name).replace(/["\r\n<>]/g, "")} via SCAR` : "SCAR by Zenoth";
      const okReply = adm && n.by_email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.by_email) ? n.by_email : undefined;
      await tr.sendMail({ from: `"${fromName}" <${gu}>`, replyTo: okReply, to: n.to_email, subject: t.sub, text, html });
      await admin.rpc("finish_notice", { p_id: n.id, p_ok: true, p_err: null });
      sent++;
    } catch (e) {
      await admin.rpc("finish_notice", { p_id: n.id, p_ok: false, p_err: String((e as Error)?.message ?? e).slice(0, 200) });
      failed++;
    }
  }
  return json({ ok: true, sent, failed });
});
