-- schema.sql
-- Complete Supabase PostgreSQL schema for Creative Industries automobile parts B2B portal.
-- Paste and execute this script in your Supabase SQL Editor.

-- ============================================================================
-- 0. CLEANUP (Drop tables, triggers, and functions if they already exist)
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.log_order_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_role() CASCADE;

DROP TABLE IF EXISTS public.order_history CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.wishlist_items CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;


-- ============================================================================
-- 1. TABLES SETUP
-- ============================================================================

-- A. USERS Table (Links to Supabase auth.users for identity)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NULL, -- Optional, since Supabase Auth handles credentials
    role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'employee')),
    company_name TEXT,
    gst_number VARCHAR(15),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B. PRODUCTS Table
CREATE TABLE public.products (
    id TEXT PRIMARY KEY, -- String identifier matching client application expectations (e.g. 'door-outer-panel')
    name TEXT NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
    material TEXT,
    thickness TEXT,
    compatibility JSONB DEFAULT '[]'::jsonb, -- Model-compatibility array: e.g. ["Maruti Swift", "Hyundai i20"]
    image_url TEXT,
    specs JSONB DEFAULT '{}'::jsonb, -- Specifications key-value pairs: e.g. {"grade": "CR4 Steel", "weight": "4.2 kg"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- C. CART ITEMS Table
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- D. WISHLIST ITEMS Table
CREATE TABLE public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- E. ORDERS Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'ORD-928374'
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'dispatched', 'delivered')),
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot of ordered items: [{"product_id", "name", "quantity", "price"}]
    vehicle_number VARCHAR(50), -- Transport vehicle number for dispatched status
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- F. ORDER HISTORY Table (Status log / Audits)
CREATE TABLE public.order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_cart_items_user ON public.cart_items(user_id);
CREATE INDEX idx_wishlist_items_user ON public.wishlist_items(user_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_history_order ON public.order_history(order_id);


-- ============================================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================================

-- A. Auto-update "updated_at" on orders modification
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- B. Automatically audit/log order status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.order_history (order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_history (order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- C. Helper function: Get current user role safely from JWT metadata (fast) or users table (fallback)
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS VARCHAR AS $$
DECLARE
  jwt_role VARCHAR;
BEGIN
  -- Get role from JWT metadata
  jwt_role := auth.jwt() -> 'user_metadata' ->> 'role';
  IF jwt_role IS NOT NULL THEN
    RETURN jwt_role;
  END IF;

  -- Database lookup fallback
  RETURN COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Trigger: Sync user profile automatically from auth.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, company_name, gst_number, phone, address)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'gst_number',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- A. USERS policies
CREATE POLICY "Users can view their own profile details"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins/Employees can view all profiles"
  ON public.users FOR SELECT
  USING (public.get_current_role() IN ('admin', 'employee'));

CREATE POLICY "Users can update their own details"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles"
  ON public.users FOR ALL
  USING (public.get_current_role() = 'admin');

-- B. PRODUCTS policies
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins/Employees can modify products"
  ON public.products FOR ALL
  USING (public.get_current_role() IN ('admin', 'employee'));

-- C. CART ITEMS policies
CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all cart items"
  ON public.cart_items FOR SELECT
  USING (public.get_current_role() = 'admin');

-- D. WISHLIST ITEMS policies
CREATE POLICY "Users can manage their own wishlist items"
  ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wishlist items"
  ON public.wishlist_items FOR SELECT
  USING (public.get_current_role() = 'admin');

-- E. ORDERS policies
CREATE POLICY "Clients can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins/Employees can view all orders"
  ON public.orders FOR SELECT
  USING (public.get_current_role() IN ('admin', 'employee'));

CREATE POLICY "Clients can place orders for themselves"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can update pending orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins/Employees can update any order"
  ON public.orders FOR UPDATE
  USING (public.get_current_role() IN ('admin', 'employee'));

-- F. ORDER HISTORY policies
CREATE POLICY "Clients can view history of their own orders"
  ON public.order_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_history.order_id AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins/Employees can view all order history logs"
  ON public.order_history FOR SELECT
  USING (public.get_current_role() IN ('admin', 'employee'));
