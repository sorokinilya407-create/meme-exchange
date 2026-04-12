-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 1000.00,
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    clan_id INT NULL,
    clan_role VARCHAR(20) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    referrer_id INT REFERENCES users(id) ON DELETE SET NULL
);

-- Memes table
CREATE TABLE IF NOT EXISTS memes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    price DECIMAL(15,4) NOT NULL,
    change_24h DECIMAL(10,2) DEFAULT 0,
    creator_id INT REFERENCES users(id) ON DELETE SET NULL,
    volume_24h DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Portfolio
CREATE TABLE IF NOT EXISTS portfolio (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    meme_id INT REFERENCES memes(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) NOT NULL CHECK (quantity >= 0),
    avg_price DECIMAL(15,4) NOT NULL,
    UNIQUE(user_id, meme_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    meme_id INT REFERENCES memes(id),
    type VARCHAR(10) CHECK (type IN ('buy', 'sell')),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    total DECIMAL(15,4) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clans
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    avatar VARCHAR(10),
    members_count INT DEFAULT 1,
    capital DECIMAL(15,2) DEFAULT 0,
    wins INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Clan wars
CREATE TABLE IF NOT EXISTS clan_wars (
    id SERIAL PRIMARY KEY,
    clan1_id INT REFERENCES clans(id),
    clan2_id INT REFERENCES clans(id),
    clan1_score INT DEFAULT 0,
    clan2_score INT DEFAULT 0,
    prize_pool DECIMAL(15,2),
    ends_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Quests
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    description TEXT,
    reward_mc INT,
    action_type VARCHAR(50),
    target_value INT
);

-- User quests progress
CREATE TABLE IF NOT EXISTS user_quests (
    user_id INT REFERENCES users(id),
    quest_id INT REFERENCES quests(id),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    PRIMARY KEY (user_id, quest_id)
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount_rub INT NOT NULL,
    mc_received INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default memes
INSERT INTO memes (name, icon, price, change_24h, creator_id) VALUES
('PEPE', '🐸', 124.50, 5.2, NULL),
('GRB', '🍄', 89.30, -2.1, NULL),
('FROG', '🐸', 210.75, 12.0, NULL),
('ХОМЯК', '🐹', 47.20, 1.4, NULL),
('HARRY', '⚡', 330.00, -0.8, NULL)
ON CONFLICT DO NOTHING;

-- Insert default quests
INSERT INTO quests (name, description, reward_mc, action_type) VALUES
('Подписка на Telegram', 'Подпишитесь на наш канал', 500, 'telegram'),
('Первая покупка', 'Совершите первую сделку', 200, 'first_buy'),
('Пригласи друга', 'Приведите друга по реферальной ссылке', 1000, 'referral')
ON CONFLICT DO NOTHING;