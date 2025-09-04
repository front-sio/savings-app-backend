ALTER TABLE "accounts" ADD COLUMN "target_amount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "plan_type" varchar(50);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "plan_note" text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "target_amount";