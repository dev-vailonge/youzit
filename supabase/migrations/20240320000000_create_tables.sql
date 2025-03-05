-- Create feature flags table
CREATE TABLE public.feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create waiting list table
CREATE TABLE public.waiting_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert initial feature flags
INSERT INTO public.feature_flags (name, enabled, description)
VALUES 
    ('waiting_list', true, 'Controls the display of waiting list signup form on homepage');

-- Create a trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS (Row Level Security)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Create policies for feature flags
CREATE POLICY "Allow public read access to feature flags"
    ON public.feature_flags
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow admin to modify feature flags"
    ON public.feature_flags
    FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for waiting list
CREATE POLICY "Allow anyone to insert into waiting list"
    ON public.waiting_list
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Allow admin to read waiting list"
    ON public.waiting_list
    FOR SELECT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin'); 