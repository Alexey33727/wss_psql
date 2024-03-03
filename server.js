const WebSocket = require('socket.io');
const db = require('./db');
const jwt = require('jsonwebtoken');
const express = require('express')
const http = require('http')
const cors = require('cors');

const app = express()
app.use(cors({ origin: "*" }))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
const server = http.createServer(app)

const wss = new WebSocket.Server(server, {
    maxHttpBufferSize: 20000000 * 1024, // 20000MB
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const secretKey = "your-secret-key"


wss.on('connection', function connection(ws) {

    function generateAccessToken(user) {
        return jwt.sign({ username: user }, secretKey, { expiresIn: '1h' });
    }

    function authenticateToken(token) {
        try {
            jwt.verify(token, secretKey);
            return true;
        } catch (err) {
            return false;
        }
    }



    //! Функция для поиска пользователя по email
    function findUserByEmail(email, callback) {
        db.query('SELECT * FROM users WHERE email = $1', [email], (err, res) => {
            if (err) {
                console.error(err);
                callback(null);
            } else {
                callback(res.rows[0]);
            }
        });
    }


    //! Функция для создания переписки
    function createChat(name, createdBy, users, photo) {
        db.query(
            'INSERT INTO chats (name, created_by, photo) VALUES ($1, $2, $3) RETURNING *',
            [name, createdBy, photo],
            (err, res) => {
                if (err) {
                    console.error(err.message);
                    ws.emit("message", JSON.stringify({ success: false, error: err.message }));
                    return;
                }

                const chatId = res.rows[0].id;

                // Вставка данных в таблицу "chatmembers"
                const stmt = db.query(
                    'INSERT INTO chatmembers (chat_id, user_id) VALUES ($1, $2)',
                    (userId) => [chatId, userId]
                );

                users.forEach((userId) => {
                    stmt.query({ text: 'INSERT INTO chatmembers (chat_id, user_id) VALUES ($1, $2)', values: [chatId, userId] });
                });

                stmt.on('end', () => {
                    ws.emit("message", JSON.stringify({ type: "createChat", success: true }));
                });
            }
        );
    }


    //! Функция для отправки сообщений
    function sendMessage(chatId, userId, text, mediaUrl, callback) {
        db.query(
            'INSERT INTO messages (chat_id, user_id, text, media_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [chatId, userId, text, mediaUrl],
            (err, res) => {
                if (err) {
                    console.error(err.message);
                    callback(false);
                } else {
                    callback(true);
                }
            }
        );
    }




    //! Функция для регистрации
    function register(username, password, email, callback) {
        db.query(
            'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id',
            [username, password, email],
            (err, res) => {
                if (err) {
                    console.error(err.message);
                    callback(false);
                } else {
                    const accessToken = generateAccessToken(username);
                    callback(true, accessToken);
                }
            }
        );
    }




    //! Функция для логина
    function login(email, password, callback) {
        db.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password],
            (err, res) => {
                if (err) {
                    console.error(err.name);
                    callback(null);
                } else {
                    if (res.rows.length) {
                        const accessToken = generateAccessToken(res.rows[0].username);
                        callback(res.rows[0], accessToken);
                    } else {
                        console.error("err");
                        callback(null);
                    }
                }
            }
        );
    }


    //! Функция для смены фото в таблице users
    function changePhoto(userId, photo, callback) {
        db.query(
            'UPDATE users SET photo = $1 WHERE id = $2 RETURNING *',
            [photo, userId],
            (err, res) => {
                if (err) {
                    console.error(err);
                    callback(false);
                } else {
                    callback(true);
                }
            }
        );
    }



    //! Функция для получения списка чатов определенного пользователя
    function getChatsByUser(userId, csl, callback) {
        db.query(
            'SELECT c.id, c.name, c.created_at, c.photo FROM chats c INNER JOIN chatmembers cm ON c.id = cm.chat_id WHERE cm.user_id = $1',
            [userId],
            (err, res) => {
                if (err) {
                    console.error(err);
                    callback([], csl);
                } else {
                    callback(res.rows, csl);
                }
            }
        );
    }



    //! Функция для получения списка сообщений из определенного чата
    function getMessagesByChat(chatId, msl, callback) {
        db.query(
            'SELECT m.id, m.text, m.media_url, m.created_at, u.username, u.email, m.user_id FROM messages m INNER JOIN users u ON m.user_id = u.id WHERE m.chat_id = $1',
            [chatId],
            (err, res) => {
                if (err) {
                    console.error(err);
                    callback([], msl);
                } else {
                    callback(res.rows, msl);
                }
            }
        );
    }



    //! Функция для проверки на регистрацию
    function checkRegistration(email, callback) {
        db.query('SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)', [email], (err, res) => {
            if (err) {
                console.error(err);
                callback(false);
            } else {
                callback(res.rows[0].exists);
            }
        });
    }


    ws.on('message', function incoming(data) {
        const request = JSON.parse(data);
        console.log(request);

        switch (request.type) {
            case 'findUserByEmail':
                authenticateToken(request.acsess)
                    ? findUserByEmail(request.email, function (user) {
                        const response = {
                            type: 'user',
                            user: user
                        };
                        ws.emit("message", JSON.stringify(response));
                    })
                    : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'createChat':
                authenticateToken(request.acsess)
                    ? createChat(request.name, request.createdBy, request.users, request.photo)
                    : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'sendMessage':
                authenticateToken(request.acsess)
                    ? sendMessage(request.chatId, request.userId, request.text, request.mediaUrl, function (success) {
                        const response = {
                            type: 'success',
                            success: success
                        };
                        ws.emit("message", JSON.stringify(response));
                        // updMessagesByChat(request.chatId)
                    }) : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'register':
                register(request.username, request.password, request.email, function (success, acsess) {
                    if (success) {
                        const response = {
                            type: 'success',
                            success: success,
                            acsessToken: acsess,
                        };
                        ws.emit("message", JSON.stringify(response));
                    } else {
                        const response = {
                            type: 'error',
                            message: 'Registration failed'
                        };
                        ws.emit("message", JSON.stringify(response));
                    }
                });
                break;
            case 'login':
                login(request.email, request.password, function (user, acsess) {
                    if (user) {
                        const response = {
                            type: 'user',
                            user: user,
                            acsessToken: acsess,
                        };
                        ws.emit("message", JSON.stringify(response));
                    } else {
                        const response = {
                            type: 'error',
                            message: 'Incorrect email or password'
                        };
                        ws.emit("message", JSON.stringify(response));
                    }
                });
                break;
            case 'changePhoto':
                authenticateToken(request.acsess)
                    ? changePhoto(request.userId, request.photo, function (success) {
                        const response = {
                            type: 'success',
                            success: success
                        };
                        ws.emit("message", JSON.stringify(response));
                    })
                    : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'getChatsByUser':
                let csl = { a: undefined }
                authenticateToken(request.acsess)
                    ? setInterval(() => {
                        getChatsByUser(request.userId, csl, function (chats, csl) {
                            if (chats.length !== csl.a) {
                                csl.a = chats.length
                                const response = {
                                    type: 'chats',
                                    chats: chats
                                };
                                ws.emit("message", JSON.stringify(response));
                            }
                        });
                    }, 1000)
                    : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'getMessagesByChat':
                let msl = { a: undefined }
                authenticateToken(request.acsess)
                    ? setInterval(() => {
                        getMessagesByChat(request.chatId, msl, function (messages, msl) {
                            if (messages.length !== msl.a) {
                                msl.a = messages.length
                                const response = {
                                    type: 'messages',
                                    messages: messages
                                };
                                ws.emit("message", JSON.stringify(response));
                            }
                        });
                    }, 1000)
                    : ws.emit("message", JSON.stringify({
                        type: 'error',
                        message: "Wrong token or you don't have token "
                    }))
                break;
            case 'checkRegistration':
                checkRegistration(request.email, function (isRegistered) {
                    const response = {
                        type: 'isRegistered',
                        isRegistered: isRegistered
                    };
                    ws.emit("message", JSON.stringify(response));
                });
                break;
            default:
                break;
        }
    });
});


server.listen(5000, () => {
    console.log("server started on 5000 port");
})
