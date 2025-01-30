const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");

// Hono Server API
const SERVER_URL = "http://localhost:3000/chat";

let userMessage = "";
const chatHistory = [];

// Function to create chat message elements
const createMsgElement = (content, ...classes) => {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", ...classes);
    msgDiv.innerHTML = `<span class="message-text">${content}</span>`;
    chatsContainer.appendChild(msgDiv);
    chatsContainer.scrollTop = chatsContainer.scrollHeight; // Auto-scroll
    return msgDiv;
};

// Function to get bot response from the server
const generateResponse = async (botMsgHTML) => {
    const textElement = botMsgHTML.querySelector(".message-text");

    // Add user message to chat history
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

    try {
        const response = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Server Error");

        const responseText = data.response.trim() || "I'm not sure how to respond.";

        // Update bot's message
        textElement.textContent = responseText;

        // Add bot response to chat history
        chatHistory.push({ role: "bot", parts: [{ text: responseText }] });
    } catch (error) {
        console.error("Error fetching response:", error);
        textElement.textContent = "Sorry, something went wrong!";
    }
};

// Form submission handler
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

// Event listener for form submission
promptForm.addEventListener("submit", handleFormSubmit);

// Generate bot's initial message when starting chatbot
setTimeout(() => {
    createMsgElement("Hi, I am a bot. How can I help you today?", "bot-message");
}, 1000);
