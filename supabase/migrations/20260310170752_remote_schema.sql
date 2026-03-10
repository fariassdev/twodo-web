


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_task_series_rpc"("p_recurrence_id" "uuid", "p_from_date" "date" DEFAULT NULL::"date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Soft delete tasks that have completions
  UPDATE tasks
  SET deleted_at = NOW()
  WHERE recurrence_id = p_recurrence_id
    AND (p_from_date IS NULL OR date >= p_from_date)
    AND EXISTS (SELECT 1 FROM task_completions WHERE task_id = tasks.id);

  -- Hard delete tasks that do not have completions
  DELETE FROM tasks
  WHERE recurrence_id = p_recurrence_id
    AND (p_from_date IS NULL OR date >= p_from_date)
    AND NOT EXISTS (SELECT 1 FROM task_completions WHERE task_id = tasks.id);
END;
$$;


ALTER FUNCTION "public"."delete_task_series_rpc"("p_recurrence_id" "uuid", "p_from_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tasks_after_rpc"("p_recurrence_id" "uuid", "p_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Soft delete tasks that have completions
  UPDATE tasks
  SET deleted_at = NOW()
  WHERE recurrence_id = p_recurrence_id
    AND date > p_date
    AND EXISTS (SELECT 1 FROM task_completions WHERE task_id = tasks.id);

  -- Hard delete tasks that do not have completions
  DELETE FROM tasks
  WHERE recurrence_id = p_recurrence_id
    AND date > p_date
    AND NOT EXISTS (SELECT 1 FROM task_completions WHERE task_id = tasks.id);
END;
$$;


ALTER FUNCTION "public"."delete_tasks_after_rpc"("p_recurrence_id" "uuid", "p_date" "date") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."kudos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_profile" "uuid" NOT NULL,
    "to_profile" "uuid" NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kudos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."love_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "from_profile" "uuid" NOT NULL,
    "to_profile" "uuid" NOT NULL,
    "task_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."love_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "bio" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "is_purchased" boolean DEFAULT false NOT NULL,
    "added_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shopping_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "completed_by" "uuid" NOT NULL,
    "points_earned" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."task_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" DEFAULT 'task'::"text" NOT NULL,
    "priority" "text" DEFAULT 'flexible'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "date" "date",
    "points" integer DEFAULT 10 NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "frequency" "text",
    "assignment_type" "text" DEFAULT 'strict_rotation'::"text" NOT NULL,
    "assigned_to" "uuid",
    "last_done_by" "uuid",
    "location" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recurrence_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "tasks_assignment_type_check" CHECK (("assignment_type" = ANY (ARRAY['strict_rotation'::"text", 'team_work'::"text", 'individual'::"text"]))),
    CONSTRAINT "tasks_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['critical'::"text", 'flexible'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'postponed'::"text"]))),
    CONSTRAINT "tasks_type_check" CHECK (("type" = ANY (ARRAY['task'::"text", 'event'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."love_notes"
    ADD CONSTRAINT "love_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_shopping_items_is_purchased" ON "public"."shopping_items" USING "btree" ("is_purchased");



CREATE INDEX "idx_task_completions_completed_at" ON "public"."task_completions" USING "btree" ("completed_at");



CREATE INDEX "idx_task_completions_completed_by" ON "public"."task_completions" USING "btree" ("completed_by");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_date" ON "public"."tasks" USING "btree" ("date");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_type" ON "public"."tasks" USING "btree" ("type");



ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_from_profile_fkey" FOREIGN KEY ("from_profile") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."kudos"
    ADD CONSTRAINT "kudos_to_profile_fkey" FOREIGN KEY ("to_profile") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."love_notes"
    ADD CONSTRAINT "love_notes_from_profile_fkey" FOREIGN KEY ("from_profile") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."love_notes"
    ADD CONSTRAINT "love_notes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."love_notes"
    ADD CONSTRAINT "love_notes_to_profile_fkey" FOREIGN KEY ("to_profile") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shopping_items"
    ADD CONSTRAINT "shopping_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_last_done_by_fkey" FOREIGN KEY ("last_done_by") REFERENCES "public"."profiles"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."delete_task_series_rpc"("p_recurrence_id" "uuid", "p_from_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_task_series_rpc"("p_recurrence_id" "uuid", "p_from_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_task_series_rpc"("p_recurrence_id" "uuid", "p_from_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tasks_after_rpc"("p_recurrence_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tasks_after_rpc"("p_recurrence_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tasks_after_rpc"("p_recurrence_id" "uuid", "p_date" "date") TO "service_role";


















GRANT ALL ON TABLE "public"."kudos" TO "anon";
GRANT ALL ON TABLE "public"."kudos" TO "authenticated";
GRANT ALL ON TABLE "public"."kudos" TO "service_role";



GRANT ALL ON TABLE "public"."love_notes" TO "anon";
GRANT ALL ON TABLE "public"."love_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."love_notes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_items" TO "anon";
GRANT ALL ON TABLE "public"."shopping_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_items" TO "service_role";



GRANT ALL ON TABLE "public"."task_completions" TO "anon";
GRANT ALL ON TABLE "public"."task_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_completions" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


