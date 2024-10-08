import { postKey, type Task, taskKey } from "./db.ts";
import { bot, channelId, groupId, kv } from "./mod.ts";
import { genPostText } from "./utils.ts";

export const setPost = async (id: number) => {
  await kv.set(postKey(), id);
};
export const getPost = async () => {
  return (await kv.get<number>(postKey())).value;
};
export const updatePost = async () => {
  const postId = await getPost();
  if (!postId) return;
  if (!channelId) return;
  if (!groupId) return;

  await bot.api.editMessageText(channelId, postId, await genPostText(), {
    parse_mode: "HTML",
  });
};

export const setWork = async (id: number, text: string, date: Date) => {
  await kv.set(taskKey(id), { status: "work", text, date });
};
export const setOut = async (id: number, text: string) => {
  const entry = await kv.get<Task>(taskKey(id))
  await kv.set(taskKey(id), { status: "out", text, date: entry.value?.date });
};
export const deleteTask = async (id: number) => {
  await kv.delete(taskKey(id));
};
export const listTasks = async () => {
  return await Array.fromAsync(kv.list<Task>({ prefix: ["task"] }));
};
