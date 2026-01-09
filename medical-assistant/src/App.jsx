import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

export default function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setIsLoading(true);

    // Add user message locally
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    try {
      const res = await fetch(
        `https://${import.meta.env.VITE_ALGOLIA_APP_ID}.algolia.net/agent-studio/1/agents/${import.meta.env.VITE_AGENT_ID}/completions?stream=false&compatibilityMode=ai-sdk-4`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-algolia-application-id": import.meta.env.VITE_ALGOLIA_APP_ID,
            "x-algolia-api-key": import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: text }],
          }),
        }
      );

      const data = await res.json();

      // Agent Studio returns a single assistant message object
      if (data.role === "assistant" && data.content) {
        setMessages((prev) => [...prev, data]);
      } else if (data.messages) {
        // Fallback in case API shape changes
        const aiMsg =
          data.messages.find((m) => m.role === "assistant") ||
          data.messages.find((m) => m.role === "ai");
        if (aiMsg) setMessages((prev) => [...prev, aiMsg]);
        else console.warn("No assistant message found:", data);
      } else {
        console.warn("Unrecognized response shape:", data);
      }
    } catch (err) {
      console.error("Request failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>🏥 Medical Knowledge Assistant</h1>
        <p>Ask me about symptoms, treatments, and health information</p>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome! How can I help you today?</h2>
            <p>Try asking:</p>
            <ul>
              <li>"What are the symptoms of malaria?"</li>
              <li>"Tell me about skin conditions"</li>
              <li>"How is diabetes diagnosed?"</li>
            </ul>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message ${m.role === "user" ? "user" : "ai"}`}
          >
            <strong>{m.role === "user" ? "You" : "Medical Assistant"}:</strong>
            <div className="chat-content">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message ai loading">
            <strong>Medical Assistant:</strong>
            <div className="chat-content">Thinking...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a medical question..."
          rows={2}
          className="chat-input"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button type="submit" className="chat-button" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
