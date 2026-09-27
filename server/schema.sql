CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, phone text UNIQUE NOT NULL, telegram_id text UNIQUE NOT NULL,
 name text NOT NULL, role text NOT NULL CHECK(role IN ('client','worker','admin')),
 verified text NOT NULL DEFAULT 'none', banned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), consent_version text NOT NULL DEFAULT '2026-09-26'
);
CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id uuid REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS auth_challenges (id text PRIMARY KEY, phone text NOT NULL, name text NOT NULL, role text NOT NULL, browser_secret text NOT NULL, telegram_id text, code_hash text, attempts int NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL, consumed boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS listings (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id), category text NOT NULL, title text NOT NULL, description text NOT NULL, price int NOT NULL CHECK(price >= 0), city text NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY, client_id uuid REFERENCES users(id), worker_id uuid REFERENCES users(id), category text NOT NULL, title text NOT NULL, description text NOT NULL, budget int NOT NULL CHECK(budget > 0), city text NOT NULL, pickup text NOT NULL, destination text NOT NULL DEFAULT '', contents text NOT NULL DEFAULT '', recipient_phone text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'open', sender_confirmed boolean NOT NULL DEFAULT false, pickup_lat double precision, pickup_lon double precision, dest_lat double precision, dest_lon double precision, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS evidence (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id), order_id uuid REFERENCES orders(id), kind text NOT NULL, encrypted text NOT NULL, sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit (id uuid PRIMARY KEY, actor uuid REFERENCES users(id), order_id uuid REFERENCES orders(id), action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS messages (id uuid PRIMARY KEY, order_id uuid REFERENCES orders(id), user_id uuid REFERENCES users(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reviews (id uuid PRIMARY KEY, order_id uuid UNIQUE REFERENCES orders(id), author_id uuid REFERENCES users(id), worker_id uuid REFERENCES users(id), rating int NOT NULL CHECK(rating BETWEEN 1 AND 5), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS comments (id uuid PRIMARY KEY, listing_id uuid REFERENCES listings(id), user_id uuid REFERENCES users(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS disputes (id uuid PRIMARY KEY, order_id uuid REFERENCES orders(id), user_id uuid REFERENCES users(id), reason text NOT NULL, status text NOT NULL DEFAULT 'open', resolution text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS locations (order_id uuid PRIMARY KEY REFERENCES orders(id), lat double precision NOT NULL, lon double precision NOT NULL, accuracy double precision NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS orders_worker ON orders(worker_id);
CREATE INDEX IF NOT EXISTS evidence_order ON evidence(order_id);
CREATE INDEX IF NOT EXISTS messages_order ON messages(order_id);
CREATE INDEX IF NOT EXISTS audit_order ON audit(order_id);
CREATE TABLE IF NOT EXISTS notification_preferences (user_id uuid PRIMARY KEY REFERENCES users(id), enabled boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY, user_id uuid REFERENCES users(id), order_id uuid REFERENCES orders(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz, sent boolean NOT NULL DEFAULT false, attempts int NOT NULL DEFAULT 0);
