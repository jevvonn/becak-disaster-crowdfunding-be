import { app } from "./app";
import { config } from "./config/config";

app.listen(config.app.port, () => console.log(`App listening at ${config.app.url}`));
