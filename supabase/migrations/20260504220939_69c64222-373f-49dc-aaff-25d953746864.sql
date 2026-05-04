
-- Enums
CREATE TYPE check_status AS ENUM ('pending','cleared','voided');
CREATE TYPE txn_type AS ENUM ('income','expense');
CREATE TYPE project_status AS ENUM ('active','on_hold','completed','archived');

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  budget NUMERIC(14,2) NOT NULL DEFAULT 0,
  status project_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checks
CREATE TABLE public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_number TEXT NOT NULL,
  payee_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  payee_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status check_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions (income + non-check expenses)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type txn_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  source_name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies (per-table own rows)
CREATE POLICY "own_select_vendors" ON public.vendors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_vendors" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_vendors" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_vendors" ON public.vendors FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select_projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select_checks" ON public.checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_checks" ON public.checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_checks" ON public.checks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_checks" ON public.checks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select_transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert_transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update_transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete_transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_checks_updated BEFORE UPDATE ON public.checks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_checks_user ON public.checks(user_id);
CREATE INDEX idx_txn_user ON public.transactions(user_id);
CREATE INDEX idx_vendors_user ON public.vendors(user_id);
CREATE INDEX idx_projects_user ON public.projects(user_id);
