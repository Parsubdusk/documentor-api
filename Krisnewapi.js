const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");

// Setting up API
const API_KEY = "AIzaSyC_cykmIa0ck3g9IzMNOGgg5f4QZhxrWRQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let userMessage = "";
const chatHistory = [];

// Function to create a chat message element
const createMsgElement = (content, ...classes) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", ...classes);
  msgDiv.innerHTML = `<span class="message-text">${content}</span>`;
  chatsContainer.appendChild(msgDiv);
  chatsContainer.scrollTop = chatsContainer.scrollHeight; // Auto-scroll
  return msgDiv;
};

// Function to generate chatbot response
const generateResponse = async (botMsgHTML) => {
  const textElement = botMsgHTML.querySelector(".message-text");

  // Add user message to chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  try {
    // Send chat to API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // Get response text
    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();

    // Update bot's message
    textElement.textContent = responseText;
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
  const botMsgHTML = createMsgElement("Hi, I am a bot. How can I help you today?", "bot-message");
  generateResponse(botMsgHTML);
}, 1000);
