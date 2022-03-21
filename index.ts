import { serve } from "https://deno.land/std@0.130.0/http/server.ts";
import { handler } from "./main.ts";
import { getSentences } from "./i18n/default.ts";

serve((req) => handler(req, getSentences), { port: 8080 });