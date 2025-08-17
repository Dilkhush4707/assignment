"use client";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Upload,
  Mail,
  FileText,
  Sparkles,
  Edit3,
  Copy,
  Check,
  X,
} from "lucide-react";
import { api } from "../utils/utils"; // Adjust the import path as needed
export default function Home() {
  const [messages, setMessages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [summary, setSummary] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSummaryEditor, setShowSummaryEditor] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showNotification = (message, type = "success") => {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 transition-all duration-300 ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
        ? "bg-red-600"
        : "bg-blue-600"
    }`;
    toast.textContent = message;
    toast.style.transform = "translateX(100%)";
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = "translateX(0)";
    }, 100);

    // Animate out
    setTimeout(() => {
      toast.style.transform = "translateX(100%)";
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  const handleFileUpload = async (e) => {
    try {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const newFiles = [];
      for (const file of files) {
        const text = await file.text();
        const fileData = {
          id: Date.now() + Math.random(),
          name: file.name,
          content: text,
          size: file.size,
        };
        newFiles.push(fileData);
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      const fileMessage = {
        id: Date.now(),
        role: "system",
        text: `📄 Attached ${newFiles.length} file(s): ${newFiles
          .map((f) => f.name)
          .join(", ")}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, fileMessage]);
      showNotification(`${newFiles.length} file(s) attached successfully!`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("File upload error:", err);
      showNotification("Failed to read file(s)", "error");
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    showNotification("File removed", "info");
  };

  const sendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: currentInput,
      attachedFiles: uploadedFiles.map((f) => ({ name: f.name, size: f.size })), // Include file info
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = currentInput;
    setCurrentInput("");
    setIsLoading(true);

    try {
      // Prepare transcript content from all uploaded files
      const transcriptContent = uploadedFiles
        .map((file) => `=== ${file.name} ===\n${file.content}\n`)
        .join("\n");

      const res = await fetch(`${api}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptContent || "No transcript provided",
          prompt: messageText,
        }),
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const responseText =
        data.summary || data.response || "I've processed your request.";

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update summary with latest response
      setSummary(responseText);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: `⚠️ Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showNotification(`Failed to send message: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (uploadedFiles.length === 0) {
      showNotification("Please attach transcript files first", "error");
      return;
    }

    const summaryPrompt =
      "Please provide a comprehensive summary of the attached transcript(s)";
    setCurrentInput(summaryPrompt);

    // Send the message immediately
    const userMessage = {
      id: Date.now(),
      role: "user",
      text: summaryPrompt,
      attachedFiles: uploadedFiles.map((f) => ({ name: f.name, size: f.size })), // Include file info
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);

    try {
      const transcriptContent = uploadedFiles
        .map((file) => `=== ${file.name} ===\n${file.content}\n`)
        .join("\n");

      const res = await fetch(`${api}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptContent,
          prompt: summaryPrompt,
        }),
      });

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const responseText =
        data.summary || data.response || "Summary generated successfully.";

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setSummary(responseText);
      showNotification("Summary generated successfully!", "success");
    } catch (err) {
      console.error("Summary error:", err);
      const errorMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: `⚠️ Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      showNotification(`Failed to generate summary: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showNotification("Copied to clipboard!");
    } catch (err) {
      showNotification("Failed to copy", "error");
    }
  };

  const sendEmail = async () => {
    if (!email.trim()) {
      showNotification("Please enter a recipient email", "error");
      return;
    }
    if (!summary.trim()) {
      showNotification("Please generate a response first", "error");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch(`${api}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          summary: summary.trim(),
          email: email.trim(),
        }),
      });

      const responseText = await res.text();
      console.log("Email API response:", responseText);

      if (!res.ok) {
        let errMessage = `HTTP ${res.status}`;
        try {
          const errData = JSON.parse(responseText);
          errMessage = errData.error || errData.message || errMessage;
        } catch {
          errMessage = responseText || errMessage;
        }
        throw new Error(errMessage);
      }

      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        // If response is not JSON, assume success
        data = { success: true };
      }

      if (data.error) {
        throw new Error(data.error);
      }

      showNotification("Email sent successfully!", "success");

      // Add system message to chat
      const emailMessage = {
        id: Date.now(),
        role: "system",
        text: `📧 Email sent successfully to ${email}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, emailMessage]);

      // Clear email input after successful send
      setEmail("");
    } catch (err) {
      console.error("Email send error:", err);
      showNotification(`Failed to send email: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              AI Transcript Chat
            </h1>
          </div>
        </div>
      </div>

      {/* Attached Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-3 border-b border-white/10 bg-black/10">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-300">
              Attached Files ({uploadedFiles.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center space-x-2 px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-sm"
              >
                <span className="text-purple-200">{file.name}</span>
                <span className="text-purple-300 text-xs">
                  ({formatFileSize(file.size)})
                </span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-purple-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Welcome to AI Transcript Chat
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Attach transcript files and start chatting with your AI
                assistant. Ask questions, request summaries, or get insights
                from your content.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : msg.role === "system"
                      ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-200"
                      : "bg-white/10 backdrop-blur-sm border border-white/20 text-gray-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Show attached files for user messages */}
                  {msg.role === "user" &&
                    msg.attachedFiles &&
                    msg.attachedFiles.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/20">
                        <div className="flex items-center space-x-1 mb-1">
                          <FileText className="w-3 h-3 opacity-70" />
                          <span className="text-xs opacity-70">
                            Attached files:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {msg.attachedFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-white/10 rounded text-xs opacity-80"
                            >
                              <span>{file.name}</span>
                              <span className="opacity-60">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div
                    className={`text-xs mt-2 opacity-70 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </div>

                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(msg.text)}
                      className="mt-2 flex items-center space-x-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                    >
                      {copied ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2 text-gray-400">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Summary Editor */}
        {summary && showSummaryEditor && (
          <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Edit3 className="w-4 h-4" />
                <span>Edit Summary</span>
              </h3>
              <button
                onClick={() => setShowSummaryEditor(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              className="w-full p-4 bg-white/10 border border-white/20 rounded-lg resize-none focus:outline-none focus:border-purple-500 transition-colors text-sm"
              placeholder="Edit your summary here..."
            />
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm p-6">
          <div className="space-y-4">
            <div className="flex space-x-3">
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">Attach Files</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    multiple
                    hidden
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <input
                type="text"
                placeholder={
                  uploadedFiles.length > 0
                    ? "Ask anything about your files..."
                    : "Attach files first, then ask questions..."
                }
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-400"
                disabled={isLoading}
              />
              {uploadedFiles.length > 0 && (
                <button
                  onClick={generateSummary}
                  disabled={isLoading}
                  className="      flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Summarize</span>
                </button>
              )}
              <button
                onClick={sendMessage}
                disabled={isLoading || !currentInput.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>

            {/* Email Section */}
            {summary && (
              <div className="flex space-x-3 pt-4 border-t border-white/10">
                <input
                  type="email"
                  placeholder="Enter recipient email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-400"
                />
                <button
                  onClick={() => setShowSummaryEditor(!showSummaryEditor)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={sendEmail}
                  disabled={!summary || !email.trim() || isLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
