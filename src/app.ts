import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

// Routes
import authRoutes from "./routes/auth";
import accountsRoutes from "./routes/accounts";
import transactionsRoutes from "./routes/transactions";
import withdrawalRequestsRoutes from "./routes/withdrawalRequests";

dotenv.config();

const app = express();
app.use(express.json());

// --------------------
// Routes
// --------------------
app.use("/auth", authRoutes);
app.use("/accounts", accountsRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/withdrawal-requests", withdrawalRequestsRoutes);
app.get("/health", (req, res) => res.send("OK"));


// --------------------
// HTTP & Socket.IO Server
// --------------------
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*", // allow all origins, adjust in production
    methods: ["GET", "POST"],
  },
});

// --------------------
// Socket.IO Logic
// --------------------
io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  // Listen for user joining their room for targeted updates
  socket.on("join_user_room", (userId: string) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log(`⚡ Client disconnected: ${socket.id}`);
  });
});

// --------------------
// Real-Time Emit Functions
// --------------------

// Emit accounts update to a specific user
export const emitAccountsUpdate = (userId: string, accountsData: any[]) => {
  io.to(`user_${userId}`).emit("accounts_update", accountsData);
};

// Emit transactions update for a specific user/account
export const emitTransactionUpdate = (userId: string, accountId: string, transaction: any) => {
  io.to(`user_${userId}`).emit("transactions_update", { accountId, transaction });
};

// Emit withdrawal requests update for a specific user
export const emitWithdrawalRequest = (userId: string, request: any) => {
  io.to(`user_${userId}`).emit("withdrawal_requests_update", request);
};

// --------------------
// Export
// --------------------
export { app, server };
