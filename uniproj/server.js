const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        content_type TEXT NOT NULL,
        content_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        lesson_id TEXT NOT NULL,
        tx_signature TEXT UNIQUE,
        amount REAL NOT NULL,
        from_address TEXT,
        status TEXT DEFAULT 'pending',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lesson_id) REFERENCES lessons (id)
    )`);

    const testLessons = [
        [uuidv4(), 'Introduction to Blockchain', 'Fundamentals of blockchain technology', 0.02, 'text', '# Introduction to Blockchain\n\nBlockchain is a distributed ledger technology that allows data to be stored globally on thousands of servers.\n\n## Key Concepts:\n- Decentralization\n- Immutability\n- Transparency\n- Security\n\n## Real-world Applications:\n- Cryptocurrencies\n- Supply Chain Tracking\n- Smart Contracts\n- Digital Identity'],
        [uuidv4(), 'Solana Basics', 'Learn about Solana network architecture', 0.03, 'text', '# Solana Basics\n\nSolana is a high-performance blockchain supporting smart contracts and decentralized applications.\n\n## Features:\n- High throughput (65,000 TPS)\n- Low transaction fees\n- Proof of History consensus\n- Rust programming language\n\n## Getting Started:\n1. Install Phantom Wallet\n2. Get SOL from an exchange\n3. Connect to Solana dApps'],
        [uuidv4(), 'Smart Contracts with Rust', 'Creating smart contracts on Solana', 0.05, 'text', '# Smart Contracts with Rust\n\nLearn how to write secure smart contracts using Rust programming language.\n\n## Topics:\n- Rust basics for blockchain\n- Solana Program Library (SPL)\n- Testing smart contracts\n- Security best practices\n\n## Code Example:\n```rust\npub fn process_instruction(\n    program_id: &Pubkey,\n    accounts: &[AccountInfo],\n    instruction_data: &[u8]\n) -> ProgramResult {\n    // Your contract logic here\n    Ok(())\n}```'],
        [uuidv4(), 'x402 Protocol', 'Micro-payment protocol for content access', 0.01, 'text', '# x402 Protocol\n\nThe x402 protocol enables instant micro-payments without registration or login.\n\n## How it works:\n1. Client requests content\n2. Server responds with 402 Payment Required\n3. User pays via Phantom wallet\n4. Content is unlocked instantly\n\n## Benefits:\n- No user accounts needed\n- Instant access\n- Low fees (micro-payments)\n- Works on any website']
    ];

    const stmt = db.prepare(`INSERT INTO lessons (id, title, description, price, content_type, content_data) 
                             VALUES (?, ?, ?, ?, ?, ?)`);

    testLessons.forEach(lesson => {
        stmt.run(...lesson);
    });
    stmt.finalize();

    console.log('? Test lessons added to database');
});

const CREATOR_WALLET = 'Hx402UniPayCreatorAddress123456789';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/api/lessons', (req, res) => {
    db.all('SELECT id, title, description, price, content_type, created_at FROM lessons ORDER BY created_at DESC',
        (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ error: 'Failed to fetch lessons' });
                return;
            }
            res.json(rows.map(lesson => ({
                ...lesson,
                price: parseFloat(lesson.price),
                unlocked: false
            })));
        });
});

app.get('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;

    db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to fetch lesson' });
            return;
        }

        if (!lesson) {
            res.status(404).json({ error: 'Lesson not found' });
            return;
        }

        res.json({
            ...lesson,
            price: parseFloat(lesson.price)
        });
    });
});

app.post('/api/lessons', (req, res) => {
    const { title, description, price, content_type, content_data } = req.body;

    if (!title || !content_data) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0.01 || priceNum > 0.05) {
        return res.status(400).json({ error: 'Price must be between 0.01 and 0.05 USDC' });
    }

    const lessonId = uuidv4();

    db.run(`INSERT INTO lessons (id, title, description, price, content_type, content_data) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [lessonId, title, description || '', priceNum, content_type || 'text', content_data],
        function (err) {
            if (err) {
                console.error('Failed to create lesson:', err);
                res.status(500).json({ error: 'Failed to create lesson' });
                return;
            }

            res.status(201).json({
                success: true,
                lesson_id: lessonId,
                lesson_url: `/lesson.html?id=${lessonId}`
            });
        }
    );
});

app.get('/api/lesson/:id/check-access', (req, res) => {
    const lessonId = req.params.id;
    const walletAddress = req.query.wallet;

    if (!walletAddress) {
        return res.json({ has_access: false });
    }

    db.get(`SELECT COUNT(*) as count FROM payments 
            WHERE lesson_id = ? 
            AND from_address = ? 
            AND status = 'confirmed'`,
        [lessonId, walletAddress], (err, row) => {
            if (err) {
                console.error('Access check error:', err);
                return res.json({ has_access: false });
            }

            res.json({ has_access: row.count > 0 });
        });
});

app.post('/api/payments/verify', (req, res) => {
    const { lessonId, txSignature, amount, fromAddress } = req.body;

    if (!lessonId || !txSignature || !amount || !fromAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (err) {
            console.error('Lesson fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        const paymentAmount = parseFloat(amount);
        const lessonPrice = parseFloat(lesson.price);

        if (Math.abs(paymentAmount - lessonPrice) > 0.001) {
            return res.status(400).json({ error: 'Payment amount mismatch' });
        }

        if (!txSignature.match(/^[A-Za-z0-9]{87,88}$/)) {
            return res.status(400).json({ error: 'Invalid transaction signature' });
        }

        const paymentId = uuidv4();
        db.run(`INSERT INTO payments (id, lesson_id, tx_signature, amount, from_address, status) 
                VALUES (?, ?, ?, ?, ?, ?)`,
            [paymentId, lessonId, txSignature, paymentAmount, fromAddress, 'confirmed'],
            function (err) {
                if (err) {
                    console.error('Payment save error:', err);
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.json({
                            success: true,
                            message: 'Payment already processed'
                        });
                    }
                    return res.status(500).json({ error: 'Failed to save payment' });
                }

                res.json({
                    success: true,
                    message: 'Payment verified and recorded',
                    access_granted: true
                });
            }
        );
    });
});

app.get('/api/lesson/:id/access', (req, res) => {
    const lessonId = req.params.id;
    const txSignature = req.query.tx;
    const walletAddress = req.query.wallet;

    if (txSignature && walletAddress) {
        db.get(`SELECT * FROM payments 
                WHERE tx_signature = ? 
                AND lesson_id = ? 
                AND from_address = ?
                AND status = 'confirmed'`,
            [txSignature, lessonId, walletAddress], (err, payment) => {
                if (err) {
                    console.error('Payment check error:', err);
                    return show402PaymentRequired(res, lessonId);
                }

                if (!payment) {
                    return show402PaymentRequired(res, lessonId);
                }

                sendLessonContent(res, lessonId);
            });
    } else {
        show402PaymentRequired(res, lessonId);
    }
});

function show402PaymentRequired(res, lessonId) {
    db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (err) {
            console.error('Lesson fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        res.status(402).json({
            price: parseFloat(lesson.price),
            token: "USDC",
            address: CREATOR_WALLET,
            message: "x402 payment required for lesson access",
            lesson_id: lessonId,
            usdc_mint: USDC_MINT,
            network: "solana",
            required_amount: lesson.price
        });
    });
}

function sendLessonContent(res, lessonId) {
    db.get('SELECT * FROM lessons WHERE id = ?', [lessonId], (err, lesson) => {
        if (err) {
            console.error('Lesson fetch error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }

        res.json({
            title: lesson.title,
            description: lesson.description,
            price: parseFloat(lesson.price),
            content_type: lesson.content_type,
            content_data: lesson.content_data,
            unlocked: true
        });
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lesson.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'lesson.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Uni402 Platform',
        version: '1.0.0'
    });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`?? Uni402 Platform running on http://localhost:${PORT}`);
    console.log(`?? x402 Paywall ready for micro-payments`);
    console.log(`?? Database initialized with test lessons`);
    console.log(`========================================`);
});