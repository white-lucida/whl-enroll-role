import { serve } from "https://deno.land/std@0.130.0/http/server.ts";
import {
  APIMessageComponentInteraction,
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

const handler = async (req: Request) => {
  const token = Deno.env.get("DISCORD_TOKEN");
  const key = Deno.env.get("PUBLIC_KEY");
  if (token === undefined) throw new Error();
  if (key === undefined) throw new Error();

  if (!req.body) {
    const body = JSON.stringify({ message: "Body Not found" });
    return new Response(body, { status: 400 });
  }

  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  if (signature === null || timestamp === null) return new Response();

  const ok = verify(key, signature, timestamp, await req.text());
  if (!ok) return new Response("invalid request signature", { status: 401 });

  const body: APIMessageComponentInteraction = await req.json();
  const id = body.data.custom_id;

  if (body.guild_id === undefined || body.member === undefined) {
    return new Response();
  }
  if (!id.startsWith("role-")) return new Response();
  const roleID = id.slice(5);

  const endpoint =
    `https://discord.com/api/v9/guilds/${body.guild_id}/members/${body.member.user.id}/roles/${roleID}`;

  await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${token}`,
    },
  });

  return new Response();
};

serve(handler, { port: 8000 });
console.log("http://localhost:8000/");
