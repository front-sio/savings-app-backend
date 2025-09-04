CREATE TABLE "pin_attempts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0,
	"last_attempt" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin" text;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "pin";