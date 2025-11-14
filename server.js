import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

// ✅ CORS - allow requests from local dev and production frontend
app.use(cors({
    origin: [
        "https://thunderous-stroopwafel-61253e.netlify.app/" // <-- new frontend
    ],
    methods: ["GET", "POST"]
}));

app.use(express.json());

// 🔹 Connect to Aiven MySQL (Option 1: ignore self-signed SSL)
let db;
try {
    db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: {
            rejectUnauthorized: false, // <-- ignore self-signed certificate
            ca: process.env.DB_CA
        }
    });
    console.log("✅ MySQL Connected Successfully");
} catch (err) {
    console.error("❌ Failed to connect to MySQL:", err);
    process.exit(1);
}

// 🟢 Create a new note
app.post("/create", async (req, res) => {
    const { code, content } = req.body;

    if (!code || !content) {
        return res.status(400).json({ message: "Code and note content are required." });
    }

    try {
        const [existing] = await db.execute("SELECT * FROM notes WHERE code = ?", [code]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Code already used. Please choose another." });
        }

        await db.execute(
            "INSERT INTO notes (code, content, created_at) VALUES (?, ?, NOW())",
            [code, content]
        );

        res.json({ message: "Note saved successfully!" });
    } catch (error) {
        console.error("❌ Error creating note:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// 🔵 View a note
app.post("/view", async (req, res) => {
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: "Code is required." });

    try {
        const [rows] = await db.execute("SELECT * FROM notes WHERE code = ?", [code]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "No note found with this code." });
        }

        res.json({ content: rows[0].content });
    } catch (error) {
        console.error("❌ Error viewing note:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
