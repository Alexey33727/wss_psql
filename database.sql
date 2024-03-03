
create TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    photo TEXT,
    created_at TIMESTAMP
);
create TABLE chats (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    photo TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);
create TABLE chatmembers (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
create TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);