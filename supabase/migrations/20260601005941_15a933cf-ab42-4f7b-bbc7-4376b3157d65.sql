
-- 1. Activity / notifications table
CREATE TABLE public.mentor_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('comment','task','resource','milestone')),
  entity_id uuid,
  action text NOT NULL,
  title text NOT NULL,
  detail text,
  mentor_read_at timestamptz,
  mentee_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mae_mentor ON public.mentor_activity_events (mentor_id, created_at DESC);
CREATE INDEX idx_mae_mentee ON public.mentor_activity_events (mentee_id, created_at DESC);

GRANT SELECT, UPDATE ON public.mentor_activity_events TO authenticated;
GRANT ALL ON public.mentor_activity_events TO service_role;

ALTER TABLE public.mentor_activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Linked parties view events"
ON public.mentor_activity_events FOR SELECT TO authenticated
USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "Linked parties update read state"
ON public.mentor_activity_events FOR UPDATE TO authenticated
USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
WITH CHECK (auth.uid() = mentor_id OR auth.uid() = mentee_id);

ALTER TABLE public.mentor_activity_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_activity_events;

-- 2. Mark-all-read RPC
CREATE OR REPLACE FUNCTION public.mark_mentor_activity_read()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer := 0; m integer := 0;
BEGIN
  UPDATE public.mentor_activity_events
    SET mentor_read_at = now()
    WHERE mentor_id = auth.uid() AND actor_id <> auth.uid() AND mentor_read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.mentor_activity_events
    SET mentee_read_at = now()
    WHERE mentee_id = auth.uid() AND actor_id <> auth.uid() AND mentee_read_at IS NULL;
  GET DIAGNOSTICS m = ROW_COUNT;
  RETURN n + m;
END;$$;

GRANT EXECUTE ON FUNCTION public.mark_mentor_activity_read() TO authenticated;

-- 3. Triggers
CREATE OR REPLACE FUNCTION public.log_mentor_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid;
BEGIN
  actor := COALESCE(auth.uid(), CASE WHEN TG_OP='DELETE' THEN OLD.mentor_id ELSE NEW.mentor_id END);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(NEW.mentor_id, NEW.mentee_id, actor, 'comment', NEW.id, 'created', 'New comment', LEFT(NEW.content, 160));
  ELSIF TG_OP='DELETE' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title)
    VALUES(OLD.mentor_id, OLD.mentee_id, actor, 'comment', OLD.id, 'deleted', 'Comment removed');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

CREATE TRIGGER trg_log_mentor_comment
AFTER INSERT OR DELETE ON public.mentor_comments
FOR EACH ROW EXECUTE FUNCTION public.log_mentor_comment();

CREATE OR REPLACE FUNCTION public.log_mentor_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid;
BEGIN
  actor := COALESCE(auth.uid(), CASE WHEN TG_OP='DELETE' THEN OLD.mentor_id ELSE NEW.mentor_id END);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(NEW.mentor_id, NEW.mentee_id, actor, 'task', NEW.id, 'created', 'Task assigned', NEW.title);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
      VALUES(NEW.mentor_id, NEW.mentee_id, actor, 'task', NEW.id,
        CASE WHEN NEW.status='done' THEN 'completed' ELSE 'updated' END,
        CASE WHEN NEW.status='done' THEN 'Task completed' ELSE 'Task status changed' END,
        NEW.title || ' → ' || NEW.status);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(OLD.mentor_id, OLD.mentee_id, actor, 'task', OLD.id, 'deleted', 'Task removed', OLD.title);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

CREATE TRIGGER trg_log_mentor_task
AFTER INSERT OR UPDATE OR DELETE ON public.mentor_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_mentor_task();

CREATE OR REPLACE FUNCTION public.log_mentor_resource()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid;
BEGIN
  actor := COALESCE(auth.uid(), CASE WHEN TG_OP='DELETE' THEN OLD.mentor_id ELSE NEW.mentor_id END);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(NEW.mentor_id, NEW.mentee_id, actor, 'resource', NEW.id, 'created', 'Resource recommended', NEW.title);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(OLD.mentor_id, OLD.mentee_id, actor, 'resource', OLD.id, 'deleted', 'Resource removed', OLD.title);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

CREATE TRIGGER trg_log_mentor_resource
AFTER INSERT OR DELETE ON public.mentor_resources
FOR EACH ROW EXECUTE FUNCTION public.log_mentor_resource();

CREATE OR REPLACE FUNCTION public.log_milestone_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid;
BEGIN
  actor := COALESCE(auth.uid(), CASE WHEN TG_OP='DELETE' THEN OLD.mentor_id ELSE NEW.mentor_id END);
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(NEW.mentor_id, NEW.mentee_id, actor, 'milestone', NEW.id, 'approved', 'Milestone approved', NEW.concept_name);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO mentor_activity_events(mentor_id,mentee_id,actor_id,entity_type,entity_id,action,title,detail)
    VALUES(OLD.mentor_id, OLD.mentee_id, actor, 'milestone', OLD.id, 'revoked', 'Milestone approval revoked', OLD.concept_name);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;

CREATE TRIGGER trg_log_milestone_approval
AFTER INSERT OR DELETE ON public.milestone_approvals
FOR EACH ROW EXECUTE FUNCTION public.log_milestone_approval();
