import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Context } from "hono";

// Google API Configuration
const API_KEY = "YOUR_GOOGLE_API_KEY";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const app = new Hono();

// Define request body type
interface RequestBody {
    messages: { role: string; parts: { text: string }[] }[];
}

// Enable CORS for frontend connection
app.use(async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
    if (c.req.method === "OPTIONS") return c.text("OK");
    await next();
});

// Route to handle chatbot messages
app.post("/chat", async (c: Context) => {
    try {
        const body: RequestBody = await c.req.json();

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: body.messages }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "API Error");

        const responseText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond.";

        return c.json({ response: responseText });
    } catch (error) {
        return c.json({ error: (error as Error).message }, 500);
    }
});

const port = 3000;
serve({ fetch: app.fetch, port }).then(() => {
    console.log(`Server is running on http://localhost:${port}`);
});
