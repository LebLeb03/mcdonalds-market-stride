
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('crew','manager','general_manager','market_admin');
CREATE TYPE public.approval_status AS ENUM ('approved','pending','rejected');
CREATE TYPE public.entry_method AS ENUM ('manual','apple_health','google_health_connect','fitbit');
CREATE TYPE public.challenge_level AS ENUM ('store','market');
CREATE TYPE public.scoring_method AS ENUM ('total_steps','avg_per_active_participant','participation_rate','goal_completion_rate','avg_daily_steps','most_improved');

-- TABLES
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_name text NOT NULL,
  market_code text NOT NULL UNIQUE,
  region text,
  logo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  store_number text NOT NULL,
  city text,
  province text,
  store_image_url text,
  invitation_code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  market_id uuid REFERENCES public.markets(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT 'New Member',
  avatar_url text,
  role public.app_role NOT NULL DEFAULT 'crew',
  job_title text,
  account_status text NOT NULL DEFAULT 'active',
  participates_in_challenges boolean NOT NULL DEFAULT true,
  daily_goal integer NOT NULL DEFAULT 10000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.manager_store_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  created_by uuid,
  title text NOT NULL,
  description text,
  image_url text,
  challenge_level public.challenge_level NOT NULL DEFAULT 'market',
  challenge_type text NOT NULL DEFAULT 'weekly_step_challenge',
  scoring_method public.scoring_method NOT NULL DEFAULT 'avg_per_active_participant',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  personal_step_goal integer NOT NULL DEFAULT 70000,
  store_step_goal integer NOT NULL DEFAULT 1000000,
  maximum_daily_steps integer NOT NULL DEFAULT 60000,
  manual_entries_require_approval boolean NOT NULL DEFAULT true,
  allow_late_joining boolean NOT NULL DEFAULT true,
  reward_title text,
  reward_description text,
  winner_announcement_date date,
  rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  UNIQUE (challenge_id, store_id)
);

CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  participation_status text NOT NULL DEFAULT 'active',
  UNIQUE (challenge_id, user_id)
);

CREATE TABLE public.step_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  step_count integer NOT NULL CHECK (step_count >= 0 AND step_count <= 300000),
  entry_method public.entry_method NOT NULL DEFAULT 'manual',
  proof_url text,
  approval_status public.approval_status NOT NULL DEFAULT 'approved',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date, challenge_id)
);

CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  badge_icon text NOT NULL DEFAULT 'award',
  achievement_level text NOT NULL DEFAULT 'individual',
  achievement_type text,
  requirement_value integer
);

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.store_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid REFERENCES public.markets(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  created_by uuid,
  audience_type text NOT NULL DEFAULT 'store',
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  related_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid,
  store_id uuid,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_market_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT market_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('manager','general_manager','market_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'market_admin')
    OR EXISTS (SELECT 1 FROM public.manager_store_assignments m WHERE m.user_id = auth.uid() AND m.store_id = _store_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.store_id = _store_id
        AND p.role IN ('manager','general_manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER challenges_updated BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER step_entries_updated BEFORE UPDATE ON public.step_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Flag high entries + block future dates
CREATE OR REPLACE FUNCTION public.validate_step_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE threshold integer := 60000;
BEGIN
  IF NEW.entry_date > (now() AT TIME ZONE 'utc')::date THEN
    RAISE EXCEPTION 'Step entries cannot be future-dated';
  END IF;
  IF NEW.challenge_id IS NOT NULL THEN
    SELECT COALESCE(maximum_daily_steps, 60000) INTO threshold FROM public.challenges WHERE id = NEW.challenge_id;
  END IF;
  IF NEW.step_count > threshold THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER step_entries_validate BEFORE INSERT ON public.step_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_step_entry();

-- No self-approval + audit trail on approvals
CREATE OR REPLACE FUNCTION public.audit_step_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NEW.approval_status IN ('approved','rejected') THEN
      IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
        RAISE EXCEPTION 'You cannot approve or reject your own step entry';
      END IF;
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    END IF;
    INSERT INTO public.audit_logs (store_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.store_id, auth.uid(), 'step_entry_' || NEW.approval_status::text, 'step_entry', NEW.id,
            jsonb_build_object('owner', NEW.user_id, 'steps', NEW.step_count));
  ELSIF NEW.step_count IS DISTINCT FROM OLD.step_count AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.audit_logs (store_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.store_id, auth.uid(), 'step_entry_edited_by_manager', 'step_entry', NEW.id,
            jsonb_build_object('from', OLD.step_count, 'to', NEW.step_count));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER step_entries_audit BEFORE UPDATE ON public.step_entries
FOR EACH ROW EXECUTE FUNCTION public.audit_step_approval();

-- new signup -> profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'crew') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- GRANTS
GRANT SELECT ON public.markets, public.stores, public.achievements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.markets, public.stores, public.profiles, public.user_roles,
  public.manager_store_assignments, public.challenges, public.challenge_stores,
  public.challenge_participants, public.step_entries, public.achievements,
  public.user_achievements, public.store_achievements, public.announcements,
  public.reactions, public.notifications, public.audit_logs TO authenticated;
GRANT ALL ON
  public.markets, public.stores, public.profiles, public.user_roles,
  public.manager_store_assignments, public.challenges, public.challenge_stores,
  public.challenge_participants, public.step_entries, public.achievements,
  public.user_achievements, public.store_achievements, public.announcements,
  public.reactions, public.notifications, public.audit_logs TO service_role;

-- RLS
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_store_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- markets / stores: readable so people can find their store code
CREATE POLICY markets_read ON public.markets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY markets_admin_write ON public.markets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'market_admin')) WITH CHECK (public.has_role(auth.uid(),'market_admin'));

CREATE POLICY stores_read ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY stores_admin_write ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'market_admin')) WITH CHECK (public.has_role(auth.uid(),'market_admin'));

CREATE POLICY achievements_read ON public.achievements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY achievements_admin_write ON public.achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'market_admin')) WITH CHECK (public.has_role(auth.uid(),'market_admin'));

-- profiles: own + same market (no emails stored here)
CREATE POLICY profiles_self ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY profiles_market_read ON public.profiles FOR SELECT TO authenticated
  USING (market_id IS NOT NULL AND market_id = public.current_market_id());
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY profiles_manager_update ON public.profiles FOR UPDATE TO authenticated
  USING (store_id IS NOT NULL AND public.can_manage_store(store_id));

CREATE POLICY user_roles_self ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_roles_admin ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'market_admin')) WITH CHECK (public.has_role(auth.uid(),'market_admin'));

CREATE POLICY msa_read ON public.manager_store_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY msa_admin ON public.manager_store_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'market_admin')) WITH CHECK (public.has_role(auth.uid(),'market_admin'));

CREATE POLICY challenges_read ON public.challenges FOR SELECT TO authenticated
  USING (market_id = public.current_market_id());
CREATE POLICY challenges_manager_write ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (public.is_manager() AND market_id = public.current_market_id());
CREATE POLICY challenges_manager_update ON public.challenges FOR UPDATE TO authenticated
  USING (public.is_manager() AND market_id = public.current_market_id());

CREATE POLICY challenge_stores_read ON public.challenge_stores FOR SELECT TO authenticated USING (true);
CREATE POLICY challenge_stores_write ON public.challenge_stores FOR ALL TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE POLICY cp_read ON public.challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY cp_self ON public.challenge_participants FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY steps_market_read ON public.step_entries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = step_entries.user_id AND p.market_id = public.current_market_id())
  );
CREATE POLICY steps_self_insert ON public.step_entries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY steps_self_update ON public.step_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND approval_status <> 'approved') WITH CHECK (user_id = auth.uid());
CREATE POLICY steps_self_delete ON public.step_entries FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY steps_manager_review ON public.step_entries FOR UPDATE TO authenticated
  USING (user_id <> auth.uid() AND store_id IS NOT NULL AND public.can_manage_store(store_id));

CREATE POLICY ua_read ON public.user_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY ua_self ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY sa_read ON public.store_achievements FOR SELECT TO authenticated USING (true);

CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated
  USING (market_id IS NULL OR market_id = public.current_market_id());
CREATE POLICY ann_manager_write ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.is_manager() AND created_by = auth.uid());
CREATE POLICY ann_manager_delete ON public.announcements FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(),'market_admin'));

CREATE POLICY reactions_read ON public.reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY reactions_self ON public.reactions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY notif_self ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_manager_read ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_manager());

CREATE INDEX idx_step_entries_user ON public.step_entries(user_id);
CREATE INDEX idx_step_entries_store_date ON public.step_entries(store_id, entry_date);
CREATE INDEX idx_profiles_store ON public.profiles(store_id);
