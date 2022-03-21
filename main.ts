import { serve } from "https://deno.land/std@0.130.0/http/server.ts";
import {
  APIInteraction,
  APIMessageComponentInteraction,
  APIPingInteraction,
  InteractionType,
} from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v9.ts";
import { sign_detached_verify } from "https://deno.land/x/tweetnacl_deno_fix@1.1.2/src/sign.ts";
import Buffer from "https://deno.land/std@0.76.0/node/buffer.ts";

const verify = (
  publicKey: string,
  signature: string,
  timestamp: string,
  rawBody: string,
): boolean => {
  return sign_detached_verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex"),
  );
};

const handlePing = (_body: APIPingInteraction) => {
  return new Response(JSON.stringify({ type: 1 }), { status: 200 });
};

const handleMessageComponent = async (body: APIMessageComponentInteraction) => {
  const getResponse = (content: string) =>
    new Response(
      JSON.stringify(
        {
          type: 4,
          data: { content, flags: 1 << 6 },
        },
      ),
      { status: 200, "headers": { "Content-Type": "application/json" } },
    );
  const token = Deno.env.get("DISCORD_TOKEN");
  if (token === undefined) throw new Error();
  const id = body.data.custom_id;

  if (body.guild_id === undefined || body.member === undefined) {
    return getResponse("ボタンの処理に失敗しました。");
  }
  if (!id.startsWith("role-")) return getResponse("不正なボタンが押されました。");
  const roleID = id.slice(5);

  const endpoint =
    `https://discord.com/api/v9/guilds/${body.guild_id}/members/${body.member.user.id}/roles/${roleID}`;

  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${token}`,
      },
    });
    if (res.status === 403) return getResponse("ロールを付与する権限がBotにありませんでした。");
    return getResponse("ロールの付与に成功しました。");
  } catch (e) {
    console.error(e);
    return getResponse("ロールの付与に失敗しました。");
  }
};

const handler = async (req: Request) => {
  const key = Deno.env.get("PUBLIC_KEY");
  if (key === undefined) throw new Error();

  if (!req.body) {
    const body = JSON.stringify({ message: "Body Not found" });
    return new Response(body, { status: 400 });
  }

  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  if (signature === null || timestamp === null) return new Response();
  const rawBody = await req.text();

  const ok = verify(key, signature, timestamp, rawBody);
  if (!ok) return new Response("invalid request signature", { status: 401 });

  const body: APIInteraction = JSON.parse(rawBody);
  if (body.type === InteractionType.Ping) {
    console.log("Ping");
    return await handlePing(body);
  }

  if (body.type === InteractionType.MessageComponent) {
    console.log("Component");
    return await handleMessageComponent(body);
  }

  return new Response("invalid request", { status: 401 });
};

serve(handler, { port: 8000 });
console.log("http://localhost:8000/");
