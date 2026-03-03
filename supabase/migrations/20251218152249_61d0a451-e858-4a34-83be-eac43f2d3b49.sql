
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'attendant', 'kitchen');

-- Create enum for order types
CREATE TYPE public.order_type AS ENUM ('counter', 'table', 'delivery');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('open', 'preparing', 'ready', 'completed', 'cancelled');

-- Create enum for table status
CREATE TYPE public.table_status AS ENUM ('free', 'occupied');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('cash', 'pix', 'credit_card', 'debit_card');

-- Restaurants table (multi-tenant)
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, restaurant_id, role)
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_combo BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Restaurant tables
CREATE TABLE public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    number INTEGER NOT NULL,
    status table_status DEFAULT 'free' NOT NULL,
    capacity INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (restaurant_id, number)
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    order_number SERIAL,
    order_type order_type NOT NULL,
    status order_status DEFAULT 'open' NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Order items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method payment_method NOT NULL,
    received_amount DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- RLS Policies for restaurants
CREATE POLICY "Users can view their own restaurant" ON public.restaurants
    FOR SELECT USING (id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can update their restaurant" ON public.restaurants
    FOR UPDATE USING (id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert restaurant on signup" ON public.restaurants
    FOR INSERT WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their restaurant" ON public.profiles
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their restaurant" ON public.user_roles
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own role on signup" ON public.user_roles
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their restaurant" ON public.categories
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can manage categories" ON public.categories
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Users can view products in their restaurant" ON public.products
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for restaurant_tables
CREATE POLICY "Users can view tables in their restaurant" ON public.restaurant_tables
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update table status" ON public.restaurant_tables
    FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can manage tables" ON public.restaurant_tables
    FOR ALL USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view orders in their restaurant" ON public.orders
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update orders" ON public.orders
    FOR UPDATE USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can delete orders" ON public.orders
    FOR DELETE USING (restaurant_id = public.get_user_restaurant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- RLS Policies for order_items
CREATE POLICY "Users can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.restaurant_id = public.get_user_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "Users can manage order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.restaurant_id = public.get_user_restaurant_id(auth.uid())
        )
    );

-- RLS Policies for payments
CREATE POLICY "Users can view payments in their restaurant" ON public.payments
    FOR SELECT USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create payments" ON public.payments
    FOR INSERT WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update order total
CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.orders
    SET subtotal = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    total = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM public.order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ) - COALESCE(orders.discount, 0)
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_order_total_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.update_order_total();
