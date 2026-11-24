import { app } from "./app";
import { config } from "./config/config";
import { getRedis } from "./config/redis";

getRedis();

app.listen(config.app.port, () => console.log(`App listening at ${config.app.url}`));
