// Cria (ou atualiza) o acesso do dono de uma loja ao painel.
// Só administradores da plataforma podem chamar.
//
// Corpo: { loja_id: string, email: string, senha: string }
// - Se o e-mail ainda não tem conta, cria a conta já confirmada com essa senha.
// - Se já tem, troca a senha (útil para "esqueci a senha").
// - Em ambos os casos, liga a conta à loja.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return resposta(405, { erro: "Método não permitido." });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const chaveServico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const servico = createClient(url, chaveServico, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // quem está chamando?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: chamador, error: erroChamador } = await servico.auth.getUser(token);

  if (erroChamador || !chamador?.user) {
    return resposta(401, { erro: "Faça login novamente." });
  }

  const { data: admin } = await servico
    .from("admins")
    .select("user_id")
    .eq("user_id", chamador.user.id)
    .maybeSingle();

  if (!admin) {
    return resposta(403, { erro: "Só administradores podem criar acessos." });
  }

  let corpo: { loja_id?: string; email?: string; senha?: string };
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: "Dados inválidos." });
  }

  const lojaId = String(corpo.loja_id ?? "");
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const senha = String(corpo.senha ?? "");

  if (!/^[0-9a-f-]{36}$/.test(lojaId)) {
    return resposta(400, { erro: "Loja inválida." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return resposta(400, { erro: "E-mail inválido." });
  }
  if (senha.length < 8) {
    return resposta(400, { erro: "A senha precisa ter pelo menos 8 caracteres." });
  }

  const { data: loja } = await servico.from("lojas").select("id, nome").eq("id", lojaId).maybeSingle();
  if (!loja) {
    return resposta(404, { erro: "Loja não encontrada." });
  }

  // conta já existe?
  const { data: existente, error: erroBusca } = await servico.rpc("usuario_por_email", { p_email: email });
  if (erroBusca) {
    return resposta(500, { erro: "Não foi possível verificar o e-mail." });
  }

  let userId = existente as string | null;
  let criada = false;

  if (userId) {
    const { error } = await servico.auth.admin.updateUserById(userId, { password: senha });
    if (error) return resposta(400, { erro: "Não foi possível trocar a senha: " + error.message });
  } else {
    const { data, error } = await servico.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      return resposta(400, { erro: "Não foi possível criar a conta: " + (error?.message ?? "") });
    }
    userId = data.user.id;
    criada = true;
  }

  const { error: erroVinculo } = await servico
    .from("loja_usuarios")
    .upsert({ loja_id: lojaId, user_id: userId, email }, { onConflict: "loja_id,user_id" });

  if (erroVinculo) {
    return resposta(500, { erro: "A conta foi criada, mas não foi ligada à loja." });
  }

  return resposta(200, {
    ok: true,
    criada,
    mensagem: criada
      ? `Acesso criado para ${email} na loja ${loja.nome}.`
      : `Senha de ${email} atualizada e acesso liberado na loja ${loja.nome}.`,
  });
});
