CREATE TABLE "specs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"intent" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"acceptance_criteria" jsonb DEFAULT '[]'::jsonb,
	"suggested_tests" jsonb DEFAULT '[]'::jsonb,
	"user_id" text,
	"created_at" timestamp DEFAULT now()
);
