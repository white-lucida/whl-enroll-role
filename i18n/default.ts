import { APIInteraction } from "https://raw.githubusercontent.com/discordjs/discord-api-types/main/deno/v9.ts";
import { JA } from "./index.ts"
import { i18n } from "./i18n.ts";

const getSentences = (locale: APIInteraction["guild_locale"]): i18n => {
  switch (locale) {
    case "ja":
      return JA
    default:
      return JA
  }
}

export { getSentences }