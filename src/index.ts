import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
import authRoutes from "./routes/auth";
app.use("/auth", authRoutes);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("join", ({ userId }) => {
    socket.join(userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
