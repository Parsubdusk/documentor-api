const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const fileInput = document.getElementById("file-input");

// Setting up API
const API_KEY = "key"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let userMessage = "";
const chatHistory = [];
let uploadedFileContent = null; // Store file content

//Function to create a chat message element 
const createMsgElement = (content, ...classes) => {
    const chatsContainer = document.querySelector(".chats-container");

    if (!chatsContainer) {
        console.error("Error: .chats-container not found in DOM");
        return;
    }

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", ...classes);
    msgDiv.innerHTML = `<span class="message-text">${content}</span>`;
    chatsContainer.appendChild(msgDiv);
    chatsContainer.scrollTop = chatsContainer.scrollHeight; // Auto-scroll
    return msgDiv;
};

// Function to send a request to Google's Generative AI API
async function getAIResponse(userMessage) {
    let parts = [{ text: userMessage }];

    if (uploadedFileContent) {
        parts.push({ text: "Here is the PDF content: " + uploadedFileContent });
    }

    const requestBody = {
        contents: [
            {
                role: "user",
                parts: parts,
            },
        ],
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error:", data);
            throw new Error(data.error?.message || "Unknown API error");
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "I'm not sure how to respond to that.";
    } catch (error) {
        console.error("Error fetching response:", error);
        return "Sorry, something went wrong!";
    }
}

// Ensure `getAIResponse()` is available globally 
window.getAIResponse = getAIResponse;

// Function to generate chatbot response 
async function generateResponse(botMsgHTML) {
    const textElement = botMsgHTML.querySelector(".message-text");

    // Add user message to chat history 
    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }],
    });

    // Ensure chat history does not get too long 
    if (chatHistory.length > 10) chatHistory.shift();

    try {
        let responseText = await getAIResponse(userMessage);

        // Update bot's message 
        textElement.textContent = responseText;

        // Add bot response to chat history 
        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }],
        });

    } catch (error) {
        console.error("Error fetching response:", error);
        textElement.textContent = "Sorry, something went wrong!";
    }
}

//  submission handler 
document.addEventListener("DOMContentLoaded", function () {
    const promptForm = document.querySelector(".prompt-form");
    if (promptForm) {
        promptForm.addEventListener("submit", handleFormSubmit);
    } else {
        console.error("Error: .prompt-form not found in DOM");
    }
});

const handleFormSubmit = (e) => {
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if (!userMessage) return;

    // Create user message in chat 
    createMsgElement(userMessage, "user-message");

    // Clear input field 
    promptInput.value = "";

    // Create bot message placeholder 
    const botMsgHTML = createMsgElement("Thinking...", "bot-message");

    // Generate bot response 
    generateResponse(botMsgHTML);
};

// File upload handling
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
