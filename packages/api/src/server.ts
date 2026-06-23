import "dotenv/config";
import { createNestApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

const app = await createNestApp();

app.listen(port, () => {
  console.log(`VPS manager API listening on port ${port}`);
});
