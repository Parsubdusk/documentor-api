const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const fileInput = document.getElementById("file-input");

const API_KEY = "AIzaSyCvb9nug2qBKG7yKgH8QKzHwkEKJatpG7Y";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let userMessage = "";
const chatHistory = [];
let uploadedFileContent = null;
const preloadedDocs = {};

async function loadPreloadedDocs() {
    const files = [
        { key: "eviction", url: "pdfs/eviction.txt" },
        { key: "utility", url: "pdfs/utility_disconnection.md" },
        { key: "immigration", url: "pdfs/immigration_faq.txt" }
    ];

    for (const file of files) {
        try {
            const res = await fetch(file.url);
            const text = await res.text();
            preloadedDocs[file.key] = text;
            console.log(`✅ Loaded: ${file.key}`);
        } catch (err) {
            console.error(`❌ Error loading ${file.url}:`, err);
        }
    }
}

async function getAIResponse(userMessage) {
    try {
        const nlpResponse = await fetch('http://localhost:3000/bot', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
        });
        const nlpData = await nlpResponse.json();
        if (nlpData.response && !nlpData.response.includes("didn't understand")) {
            return { text: nlpData.response, source: "NLP (Node-NLP)" };
        }
    } catch (e) {
        console.warn("NLP service error or not reachable:", e);
    }

    let docParts = [{ text: "Please answer the user's question using only the documents provided below if relevant." }];
    let fullDocs = Object.values(preloadedDocs).join("\n\n---\n\n");

    if (uploadedFileContent) {
        docParts.push({ text: "Uploaded file content:\n" + uploadedFileContent });
    }
    if (fullDocs.trim()) {
        docParts.push({ text: "Reference documents:\n" + fullDocs });
    }

    docParts.push({ text: "User question: " + userMessage });

    const docRequest = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: docParts }] })
    });

    const docData = await docRequest.json();
    let docText = docData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    const vaguePatterns = [
        /\bnot (sure|found|available|provided|addressed)\b/i,
        /does not contain a response to/i,
        /does not offer any information/i,
        /no response to/i,
        /further information is needed/i,
        /cannot answer your question using only the provided documents/i,
        /insufficient to respond/i
    ];
    const weakResponse = !/\b(file|contact|respond|seek|submit|appeal|report|do|should|must|help|lawyer|rights)\b/i.test(docText);
    const vague = vaguePatterns.some(p => p.test(docText));

    if (vague || weakResponse) {
        const fallbackRes = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: userMessage }] }] })
        });

        const fallbackData = await fallbackRes.json();
        const fallbackText = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I'm not sure how to respond.";

        return { text: fallbackText, source: "Gemini (fallback)" };
    }

    return { text: docText, source: uploadedFileContent ? "Uploaded file + preloaded docs" : "Preloaded docs" };
}

async function generateResponse(botMsgHTML) {
    const textElement = botMsgHTML.querySelector(".message-text");

    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    if (chatHistory.length > 10) chatHistory.shift();

    try {
        const response = await getAIResponse(userMessage);
        console.log("🌐 AI Response:", response);

        textElement.innerHTML = marked.parse(response.text);

        if (response.source) {
            const sourceTag = document.createElement("div");
            sourceTag.className = "chat-source";
            sourceTag.textContent = `Based on: ${response.source}`;
            botMsgHTML.appendChild(sourceTag);
        }

        chatHistory.push({ role: "model", parts: [{ text: response.text }] });
    } catch (error) {
        console.error("Error generating response:", error);
        textElement.textContent = "Sorry, something went wrong!";
    }
}

const createMsgElement = (content, ...classes) => {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", ...classes);
    msgDiv.innerHTML = `<span class="message-text">${marked.parse(content)}</span>`;
    chatsContainer.appendChild(msgDiv);
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
    return msgDiv;
};

const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if (!userMessage) return;

    createMsgElement(userMessage, "user-message");
    promptInput.value = "";
    const botMsgHTML = createMsgElement("Thinking...", "bot-message");
    generateResponse(botMsgHTML);
};

document.addEventListener("DOMContentLoaded", async function () {
    await loadPreloadedDocs();
    const promptForm = document.querySelector(".prompt-form");
    if (promptForm) {
        promptForm.addEventListener("submit", handleFormSubmit);
    } else {
        console.error("Error: .prompt-form not found in DOM");
    }
});

fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let text = "";
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item) => item.str).join(" ");
                    text += pageText + "\n";
                }
                uploadedFileContent = text;
                console.log("PDF content loaded.");
            } catch (error) {
                console.error("Error loading PDF:", error);
                uploadedFileContent = "Error loading PDF.";
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedFileContent = e.target.result;
            console.log("File content loaded.");
        };
        if (file.type.startsWith("image/")) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    }
});

window.getAIResponse = getAIResponse;
