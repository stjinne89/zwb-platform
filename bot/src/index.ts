// ZWB TTT-bot: roept in een Discord-spraakkanaal de kopbeurten van een
// Gopherplan om en stuurt bij met live data uit Sauce. Zie README.md.

import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection,
} from "@discordjs/voice";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type Interaction,
  type Message,
} from "discord.js";
import { clockPhrases, coachPhrases } from "./phrases.ts";
import { createRotation } from "./rotation.ts";
import { fetchPlan, parsePlan, type Plan } from "./plan.ts";
import { SauceClient } from "./sauce.ts";
import { Session } from "./session.ts";
import { SpeechQueue } from "./speech.ts";
import { execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join } from "node:path";
import { CACHE_DIR, piperEngine, Tts, windowsEngine } from "./tts.ts";

const DEFAULT_DELAY_S = 10;
const PLUS_BUTTON_S = 10;
/** Een rij telt vijf knoppen: +10 s, Volgende, Klim, Stop en één ander deel. */
const MAX_PARTS = 2;
/** Het statusbericht wordt hooguit zo vaak bijgewerkt, en minstens elke REFRESH_MS. */
const RENDER_MS = 2_000;
const REFRESH_MS = 6_000;

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN ontbreekt. Zie bot/README.md.");
  process.exit(1);
}
const origins = (process.env.PLAN_ORIGINS ?? "https://zwb-platform.netlify.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const tts =
  process.env.PIPER_PATH && process.env.PIPER_MODEL
    ? new Tts(piperEngine(process.env.PIPER_PATH, process.env.PIPER_MODEL))
    : process.platform === "win32"
      ? new Tts(windowsEngine(process.env.VOICE_LANGUAGE ?? "nl-NL"))
      : null;
if (!tts) console.warn("Geen stem ingesteld: de bot spreekt niet, alleen het statusbericht werkt.");
const coachMode = process.env.COACH === "log" ? "log" : "speak";

/** Logboek per dag in .cache/, om na een race na te lezen wat er gebeurde. */
function log(line: string) {
  const now = new Date();
  const entry = `${now.toISOString()} ${line}`;
  console.log(entry);
  const file = join(CACHE_DIR, `ttt-${now.toISOString().slice(0, 10)}.log`);
  void appendFile(file, `${entry}\n`).catch(() => undefined);
}

type GuildState = {
  session: Session | null;
  speech: SpeechQueue;
  player: AudioPlayer;
  connection: VoiceConnection | null;
  message: Message | null;
  /** Het plan dat door de laatste `/ttt plan` is vervangen, voor "Dit is deel 2". */
  replaced: Plan | null;
  dirty: boolean;
  renderedAt: number;
};

/** De tekst op het klembord van de pc waar de bot draait (Windows). */
async function clipboard() {
  if (process.platform !== "win32") throw new Error("Geef een link of een bestand mee.");
  const { stdout } = await promisify(execFile)("powershell", ["-NoProfile", "-Command", "Get-Clipboard -Raw"], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

const guilds = new Map<string, GuildState>();

function stateOf(guildId: string): GuildState {
  let state = guilds.get(guildId);
  if (!state) {
    const player = createAudioPlayer();
    const created: GuildState = {
      session: null,
      player,
      speech: new SpeechQueue(async (text) => {
        if (!tts || !created.connection) return;
        const file = await tts.file(text).catch((error) => {
          log(`stem mislukte: ${error instanceof Error ? error.message : error}`);
          throw error;
        });
        player.play(createAudioResource(file));
        await entersState(player, AudioPlayerStatus.Playing, 5_000);
        await entersState(player, AudioPlayerStatus.Idle, 30_000);
      }),
      connection: null,
      message: null,
      replaced: null,
      dirty: false,
      renderedAt: 0,
    };
    state = created;
    guilds.set(guildId, state);
  }
  return state;
}

function planLines(plan: Plan) {
  return plan.riders
    .map((r) => `${r.order}. ${r.name} · ${r.pullWatts ?? "-"} W · ${r.pullSeconds} s`)
    .join("\n");
}

/** Nieuwe sessie voor dit plan; wat liep, stopt. */
function load(state: GuildState, plan: Plan) {
  stop(state);
  state.message = null;
  const session = new Session(
    plan,
    {
      say: (text, priority) => state.speech.say(text, priority),
      changed: () => {
        state.dirty = true;
      },
      finished: () => stop(state),
      log,
    },
    Date.now,
    coachMode,
  );
  state.session = session;
  // De klok eerst: die is als eerste nodig.
  void tts?.prepare(["Deel 1.", ...clockPhrases(session.rotation), ...coachPhrases(session.rotation)]);
  return session;
}

function addPart(session: Session, part: number, plan: Plan) {
  session.addPart(part, plan);
  const rotation = createRotation(plan.riders, 0);
  void tts?.prepare([`Deel ${part}.`, ...clockPhrases(rotation), ...coachPhrases(rotation)]);
}

function controls(session: Session) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("ttt:plus").setLabel(`+${PLUS_BUTTON_S} s`).setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("ttt:skip").setLabel("Volgende").setStyle(ButtonStyle.Primary),
      session.free
        ? new ButtonBuilder().setCustomId("ttt:free").setLabel("Hervat rotatie").setStyle(ButtonStyle.Success)
        : new ButtonBuilder().setCustomId("ttt:free").setLabel("Klim").setStyle(ButtonStyle.Secondary),
      ...session.partNumbers
        .filter((number) => number !== session.partNumber)
        .map((number) =>
          new ButtonBuilder()
            .setCustomId(`ttt:part:${number}`)
            .setLabel(`Deel ${number}`)
            .setStyle(ButtonStyle.Success),
        ),
      new ButtonBuilder().setCustomId("ttt:stop").setLabel("Stop").setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ttt:out")
        .setPlaceholder("Gelost of terug")
        .addOptions(
          session.rotation.riders.map((rider, index) => ({
            label: rider.out ? `${rider.name} is terug` : `${rider.name} lost`,
            value: String(index),
          })),
        ),
    ),
  ];
}

async function render(state: GuildState) {
  const { session, message } = state;
  if (!session || !message) return;
  state.dirty = false;
  state.renderedAt = Date.now();
  await message
    .edit({ content: session.status(), components: session.running ? controls(session) : [] })
    .catch((error) => console.warn("Statusbericht bijwerken mislukte:", error));
}

function stop(state: GuildState) {
  state.session?.stop();
  state.speech.clear();
  state.player.stop();
  state.connection?.destroy();
  state.connection = null;
  void render(state);
}

const command = new SlashCommandBuilder()
  .setName("ttt")
  .setDescription("Ploegentijdrit: kopbeurten omroepen")
  .addSubcommand((sub) =>
    sub
      .setName("plan")
      .setDescription("Laad een plan. Zonder opties: de link op het klembord van de bot-pc")
      .addStringOption((option) =>
        option.setName("link").setDescription("De botlink uit de TTT Planner"),
      )
      .addAttachmentOption((option) =>
        option.setName("bestand").setDescription("Het JSON-bestand uit ZwiftGopher"),
      )
      .addIntegerOption((option) =>
        option
          .setName("deel")
          .setDescription("Voor welk deel van de race; leeg = deel 1")
          .setMinValue(1)
          .setMaxValue(MAX_PARTS),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("deel")
      .setDescription("Ga over op het plan van een ander deel")
      .addIntegerOption((option) =>
        option.setName("nummer").setDescription("Deel").setRequired(true).setMinValue(1).setMaxValue(MAX_PARTS),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("start")
      .setDescription("Start in het spraakkanaal waar je nu zit")
      .addIntegerOption((option) =>
        option.setName("vertraging").setDescription("Seconden tot de start").setMinValue(0).setMaxValue(3600),
      ),
  )
  .addSubcommand((sub) => sub.setName("stop").setDescription("Stop en verlaat het spraakkanaal"))
  .addSubcommand((sub) => sub.setName("skip").setDescription("Meteen naar de volgende renner"))
  .addSubcommand((sub) => sub.setName("klim").setDescription("Vrij rijden: klok en coach zwijgen"))
  .addSubcommand((sub) => sub.setName("hervat").setDescription("Na de klim: de rotatie weer oppakken"))
  .addSubcommand((sub) =>
    sub
      .setName("plus")
      .setDescription("Verleng de huidige kopbeurt")
      .addIntegerOption((option) =>
        option.setName("seconden").setDescription("Aantal seconden").setRequired(true).setMinValue(1).setMaxValue(600),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("gelost")
      .setDescription("Renner doet geen kopbeurten meer")
      .addStringOption((option) =>
        option.setName("renner").setDescription("Naam").setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("terug")
      .setDescription("Renner draait weer mee")
      .addStringOption((option) =>
        option.setName("renner").setDescription("Naam").setRequired(true).setAutocomplete(true),
      ),
  );

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, async (ready) => {
  for (const guild of ready.guilds.cache.values()) {
    await guild.commands.set([command.toJSON()]).catch((error) => console.warn(guild.name, error));
  }
  console.log(`Ingelogd als ${ready.user.tag} in ${ready.guilds.cache.size} server(s).`);
});
client.on(Events.GuildCreate, (guild) => {
  void guild.commands.set([command.toJSON()]).catch((error) => console.warn(guild.name, error));
});

async function handle(interaction: Interaction) {
  if (!interaction.inCachedGuild()) return;
  const state = stateOf(interaction.guildId);
  const { session } = state;

  if (interaction.isAutocomplete()) {
    const typed = interaction.options.getFocused().toLowerCase();
    const names = (session?.rotation.riders ?? [])
      .map((rider) => rider.name)
      .filter((name) => name.toLowerCase().includes(typed));
    await interaction.respond(names.slice(0, 25).map((name) => ({ name, value: name })));
    return;
  }

  if (interaction.isButton() && interaction.customId === "ttt:aspart2") {
    // Het zojuist geladen plan was voor deel 2: het vorige plan komt terug als deel 1.
    if (!session || !state.replaced || session.running) {
      await interaction.update({ content: "Dat kan niet meer. Laad de plannen opnieuw.", components: [] });
      return;
    }
    const second = session.plan;
    const first = state.replaced;
    state.replaced = null;
    addPart(load(state, first), 2, second);
    log(`plan: het laatste plan is deel 2 geworden, deel 1 is weer ${first.name}`);
    await interaction.update({
      content: `**Deel 1** · ${first.name}\n${planLines(first)}\n\n**Deel 2** · ${second.name}\n${planLines(second)}`,
      components: [],
    });
    return;
  }

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    if (!session?.running) {
      await interaction.deferUpdate();
      return;
    }
    if (interaction.customId === "ttt:plus") session.plus(PLUS_BUTTON_S);
    if (interaction.customId === "ttt:skip") session.skip();
    if (interaction.customId === "ttt:stop") stop(state);
    if (interaction.customId === "ttt:free") session.setFree(!session.free);
    if (interaction.customId.startsWith("ttt:part:")) session.usePart(Number(interaction.customId.slice(9)));
    if (interaction.isStringSelectMenu() && interaction.customId === "ttt:out") {
      const index = Number(interaction.values[0]);
      session.setOut(index, !session.rotation.riders[index]?.out);
    }
    await interaction.update({
      content: session.status(),
      components: session.running ? controls(session) : [],
    });
    return;
  }

  if (!interaction.isChatInputCommand() || interaction.commandName !== "ttt") return;
  const reply = (content: string) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();

  if (sub === "plan") {
    // Alleen voor wie het commando gaf: de link is de sleutel tot het plan.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const link = interaction.options.getString("link");
      const file = interaction.options.getAttachment("bestand");
      // Zonder link of bestand: wat er op het klembord van deze pc staat. Een
      // link van ZwiftGopher is te lang om in Discord te plakken.
      const plan = file
        ? parsePlan(await fetch(file.url, { signal: AbortSignal.timeout(10_000) }).then((r) => r.json()))
        : await fetchPlan(link ?? (await clipboard()), origins);
      const riders = planLines(plan);
      const part = interaction.options.getInteger("deel") ?? 1;
      log(`plan deel ${part} ${plan.name}: ${plan.riders.map((r) => `${r.name} ${r.pullWatts ?? "-"}W ${r.pullSeconds}s`).join(", ")}`);
      if (part > 1) {
        // Een later deel komt erbij; wat loopt, loopt door.
        if (!session) throw new Error("Laad eerst het plan voor deel 1.");
        addPart(session, part, plan);
        await interaction.editReply(`**Deel ${part}** klaargezet · ${plan.name}\n${riders}`);
        return;
      }
      // Stond er al een plan klaar, dan is dit vaak het plan voor deel 2 waarbij
      // `deel` vergeten is. Eén knop zet dat recht.
      state.replaced = session && !session.running ? session.plan : null;
      load(state, plan);
      await interaction.editReply({
        content: state.replaced
          ? `**Deel 1** geladen · ${plan.name}\n${riders}\n\nDit vervangt het plan dat er stond (${state.replaced.name}).`
          : `**Deel 1** geladen · ${plan.name}\n${riders}`,
        components: state.replaced
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("ttt:aspart2").setLabel("Dit is deel 2").setStyle(ButtonStyle.Primary),
              ),
            ]
          : [],
      });
    } catch (error) {
      await interaction.editReply(error instanceof Error ? error.message : "Plan laden mislukte.");
    }
    return;
  }

  if (!session) {
    await reply("Laad eerst een plan met /ttt plan.");
    return;
  }

  if (sub === "start") {
    const voice = interaction.member.voice.channel;
    const channel = interaction.channel;
    if (!voice) {
      await reply("Ga eerst in een spraakkanaal zitten.");
      return;
    }
    if (!channel?.isSendable()) {
      await reply("In dit kanaal kan ik geen bericht plaatsen.");
      return;
    }
    state.connection?.destroy();
    state.connection = joinVoiceChannel({
      channelId: voice.id,
      guildId: voice.guild.id,
      adapterCreator: voice.guild.voiceAdapterCreator,
    });
    state.connection.subscribe(state.player);
    session.start(interaction.options.getInteger("vertraging") ?? DEFAULT_DELAY_S);
    // Een eigen bericht, geen antwoord: een antwoord is na een kwartier niet meer te wijzigen.
    state.message = await channel.send({ content: session.status(), components: controls(session) });
    await reply("Gestart.");
    return;
  }

  if (sub === "deel") {
    const number = interaction.options.getInteger("nummer", true);
    await reply(
      session.usePart(number)
        ? `Deel ${number}: ${session.plan.name}.`
        : `Voor deel ${number} staat geen ander plan klaar. Laad het met /ttt plan deel:${number}.`,
    );
    return;
  }

  if (sub === "stop") {
    stop(state);
    await reply("Gestopt.");
    return;
  }
  if (!session.running) {
    await reply("De timer loopt niet. Start met /ttt start.");
    return;
  }
  if (sub === "klim" || sub === "hervat") {
    const done = session.setFree(sub === "klim");
    await reply(
      !done ? "Dat staat al zo." : sub === "klim" ? "Vrij rijden. De klok staat stil." : "De rotatie loopt weer.",
    );
    return;
  }
  if (sub === "skip") {
    session.skip();
    await reply("Volgende renner.");
    return;
  }
  if (sub === "plus") {
    const seconds = interaction.options.getInteger("seconden", true);
    session.plus(seconds);
    await reply(`${seconds} seconden erbij.`);
    return;
  }
  if (sub === "gelost" || sub === "terug") {
    const name = interaction.options.getString("renner", true);
    const index = session.riderIndex(name);
    if (index === -1) {
      await reply(`Geen renner "${name}" in het plan.`);
      return;
    }
    session.setOut(index, sub === "gelost");
    await reply(sub === "gelost" ? `${name} doet geen kopbeurten meer.` : `${name} draait weer mee.`);
  }
}

client.on(Events.InteractionCreate, (interaction) => {
  handle(interaction).catch((error) => console.error("Interactie mislukte:", error));
});

// Het statusbericht loopt mee met de klok, zonder Discord te overspoelen.
setInterval(() => {
  const now = Date.now();
  for (const state of guilds.values()) {
    if (!state.session?.running) continue;
    const age = now - state.renderedAt;
    if ((state.dirty && age >= RENDER_MS) || age >= REFRESH_MS) void render(state);
  }
}, 1_000);

if (process.env.SAUCE_URL) {
  new SauceClient(process.env.SAUCE_URL, (sample) => {
    for (const state of guilds.values()) state.session?.onSample(sample);
  }).start();
} else {
  console.warn("Geen SAUCE_URL: de bot loopt alleen op de klok.");
}

try {
  await client.login(token);
} catch (error) {
  const invalid = error instanceof Error && "code" in error && error.code === "TokenInvalid";
  console.error(
    invalid
      ? "Discord weigert het token. Gebruik het token van de pagina Bot (Reset Token), niet de Application ID of Public Key."
      : error,
  );
  process.exit(1);
}
