import dotenv from "dotenv";
dotenv.config();

import { server } from "./app";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
