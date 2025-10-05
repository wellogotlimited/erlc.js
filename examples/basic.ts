import { PRC } from "../src/index.js";

async function main() {
  const api = new PRC({ serverKey: process.env.PRC_SERVER_KEY!, rpm: 60 });

  const status = await api.server.status();
  console.log("Server:", status);

  const players = await api.players.list();
  console.log(`Players online: ${players.length}`);

  await api.server.command(":message Hello world!");

  const joins = await api.logs.joins();
  console.log(`Recent joins: ${joins.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
