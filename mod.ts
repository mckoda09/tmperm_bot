import { Bot } from "grammy";
import { addTask, kv, listTasks, removeTask } from "./kv.ts";

export const bot = new Bot(Deno.env.get("BOT_TOKEN") || "");
const channelId = Number(Deno.env.get("CHANNEL_ID") || "");
const groupId = Number(Deno.env.get("GROUP_ID") || "");

// PINNED POST

bot.chatType("channel").command("post", async (ctx) => {
  if (ctx.chat.id != channelId) return;
  await ctx.deleteMessage();

  const newMessage = await ctx.reply(await generateTasksListText(), {
    parse_mode: "HTML",
  });
  await kv.set(["message"], newMessage.message_id);

  console.log("POST - MADE");
});

// NEW POST

bot.chatType("channel").on("msg:text", async (ctx) => {
  if (ctx.chat.id != channelId) return;

  await addTask(ctx.channelPost.message_id, ctx.channelPost.text);
  await updateTasksList();

  console.log("CHANNEL POST - ADDED");
});

bot.chatType("supergroup").hears(["готов", "Готов"], async (ctx) => {
  if (ctx.chat.id != groupId) return;
  if (!ctx.message.reply_to_message) return;
  if (!ctx.message.reply_to_message.forward_origin) return;
  if (!ctx.message.reply_to_message.is_automatic_forward) return;
  if (ctx.message.reply_to_message.forward_origin.type != "channel") return;

  await removeTask(ctx.message.reply_to_message.forward_origin.message_id);
  await updateTasksList();

  console.log("TASK - REMOVED");
});

bot.chatType("supergroup").hears(["вернуть", "Вернуть"], async (ctx) => {
  if (ctx.chat.id != groupId) return;
  if (!ctx.message.reply_to_message) return;
  if (!ctx.message.reply_to_message.forward_origin) return;
  if (!ctx.message.reply_to_message.is_automatic_forward) return;
  if (ctx.message.reply_to_message.forward_origin.type != "channel") return;
  if (!ctx.message.reply_to_message.text) return;

  const forwardOrigin = ctx.message.reply_to_message.forward_origin;
  await addTask(forwardOrigin.message_id, ctx.message.reply_to_message.text);
  await updateTasksList();

  console.log("TASKS - RENEWED");
});

const updateTasksList = async () => {
  const messageId = await kv.get<number>(["message"]);
  if (!messageId.versionstamp) return;

  await bot.api.editMessageText(
    channelId,
    messageId.value,
    await generateTasksListText(),
    { parse_mode: "HTML" },
  );
};

const generateTasksListText = async () => {
  const tasks = await listTasks();
  if (!tasks.length) return "В работе нет заказ-нарядов.";
  return tasks
    .map(
      (task, index) =>
        `${index + 1}. <a href='https://t.me/c/${channelId.toString().substring(4)}/${task.key[1].toString()}'>${task.value}</a>`,
    )
    .join("\n");
};

bot.catch((error) => console.log(error.message));
