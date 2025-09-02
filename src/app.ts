import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import accountsRoutes from "./routes/accounts";
import transactionsRoutes from "./routes/transactions";
import withdrawalRequestsRoutes from "./routes/withdrawalRequests";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/accounts", accountsRoutes);
app.use("/transactions", transactionsRoutes);
app.use("/withdrawal-requests", withdrawalRequestsRoutes);

export default app;
