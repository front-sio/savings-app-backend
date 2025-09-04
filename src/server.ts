import dotenv from "dotenv";
dotenv.config();

import { server } from "./app"; // now works

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
