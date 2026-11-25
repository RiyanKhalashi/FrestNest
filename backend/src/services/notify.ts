import { prisma } from "../lib/db.js";
import { pingUser } from "../lib/realtime.js";

/** In-app notification (bell). Also pushes a live update to the user's open tabs. */
export async function notify(userId: string, title: string, body: string, link?: string) {
  const n = await prisma.notification.create({ data: { userId, title, body, link } });
  pingUser(userId, "notification", { id: n.id, title, body, link });
  return n;
}

export async function notifyMany(userIds: Iterable<string>, title: string, body: string, link?: string) {
  for (const id of new Set(userIds)) await notify(id, title, body, link);
}
