"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "./lib/superbase";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type AttachedDoc = {
  id: string;
  filename: string;
};

const SUGGESTED_PROMPTS = [
  {
    icon: "💡",
    title: "Explain a complex concept",
    prompt: "Can you explain quantum computing in simple, accessible terms?",
  },
  {
    icon: "📄",
    title: "Summarize a document",
    prompt: "Please provide a concise summary of the key takeaways from the attached document.",
  },
  {
    icon: "💻",
    title: "Debug or write code",
    prompt: "How can I implement an efficient sliding window rate limiter in TypeScript?",
  },
  {
    icon: "✍️",
    title: "Draft a technical plan",
    prompt: "Help me draft a comprehensive implementation plan for adding full-text search.",
  },
];

function getConversationDoc(convId: string): AttachedDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("chat_attached_docs");
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[convId] || null;
  } catch {
    return null;
  }
}

function setConversationDoc(convId: string, doc: AttachedDoc | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("chat_attached_docs");
    const map = raw ? JSON.parse(raw) : {};
    if (doc) {
      map[convId] = doc;
    } else {
      delete map[convId];
    }
    localStorage.setItem("chat_attached_docs", JSON.stringify(map));
  } catch {
    // Ignore localStorage error
  }
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  let code = "";
  const child = Array.isArray(children) ? children[0] : children;

  if (typeof child === "object" && child !== null && "props" in child) {
    const props = child.props as { children?: React.ReactNode };
    code = String(props.children ?? "");
  } else {
    code = String(child ?? "");
  }

  code = code.replace(/\n$/, "");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-md">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/80 px-4 py-2">
        <span className="text-xs font-medium text-gray-400">Code</span>
        <button
          onClick={copyCode}
          type="button"
          className="rounded-md px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-xl md:text-2xl font-bold text-white">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-lg md:text-xl font-bold text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-base md:text-lg font-semibold text-white">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-7 break-words">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1 text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1 text-gray-300">
              {children}
            </ol>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-r border-l-4 border-blue-500 bg-gray-900/50 py-1.5 pl-4 italic text-gray-300">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            if (!className) {
              return (
                <code className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-sm text-blue-300">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-gray-800">
              <table className="min-w-full divide-y divide-gray-800 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-900 px-4 py-2.5 text-left font-semibold text-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-gray-800/60 px-4 py-2 text-gray-300">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function getConversationGroup(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const conversationDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const difference = today.getTime() - conversationDate.getTime();
  const days = difference / (1000 * 60 * 60 * 24);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 Days";
  return "Older";
}

async function parseApiResponse<T = any>(
  response: Response,
  fallbackErrorMessage: string
): Promise<T> {
  const text = await response.text();
  let json: any = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Body is not JSON (e.g. HTML error page or empty/truncated text)
    }
  }

  if (!response.ok) {
    const serverMessage =
      json?.error ||
      json?.message ||
      (text && text.length < 200 && !text.includes("<html") && !text.includes("<!DOCTYPE")
        ? text.trim()
        : null);

    if (serverMessage) {
      throw new Error(serverMessage);
    }

    if (response.status === 413) {
      throw new Error("PDF file is too large for the server to process (HTTP 413).");
    }
    if (response.status === 504) {
      throw new Error("Server timed out processing the document (HTTP 504). Please try a smaller PDF.");
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error("Processing service is temporarily unavailable (HTTP 502/503).");
    }
    if (response.status === 401) {
      throw new Error("Your session has expired. Please refresh the page.");
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment before trying again.");
    }

    throw new Error(`${fallbackErrorMessage} (HTTP ${response.status})`);
  }

  if (json === null) {
    return {} as T;
  }

  return json as T;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);

  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [attachedDocument, setAttachedDocument] = useState<AttachedDoc | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // ----------------------------------------
  // INITIALIZE
  // ----------------------------------------

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        let {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          user = data.user;
        }

        if (!user) {
          throw new Error("Unable to establish user session.");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;

        const response = await fetch("/api/conversations", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const result = await parseApiResponse(
          response,
          "Failed to load conversations"
        );
        const list = result.conversations ?? (Array.isArray(result) ? result : []);

        if (!isMounted) return;
        setConversations(list ?? []);

        if (list && list.length > 0) {
          const firstId = list[0].id;
          const msgResponse = await fetch(`/api/conversations/${firstId}`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (msgResponse.ok) {
            const msgResult = await parseApiResponse(
              msgResponse,
              "Failed to load conversation messages"
            );
            const data = msgResult.messages ?? (Array.isArray(msgResult) ? msgResult : []);
            if (isMounted) {
              setCurrentConversationId(firstId);
              setMessages(data ?? []);
              setAttachedDocument(getConversationDoc(firstId));
            }
          }
        }
      } catch (error) {
        console.error("Initialization error:", error instanceof Error ? error.message : "Unknown error");
        if (isMounted) {
          setGlobalError("Authentication failed. Please refresh the page.");
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------
  // LOAD SPECIFIC CHAT
  // ----------------------------------------

  async function loadConversation(id: string) {
    if (isLoading || loadingConversationId) return;

    setLoadingConversationId(id);
    setGlobalError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setGlobalError("Session expired. Please refresh the page.");
        return;
      }

      const response = await fetch(`/api/conversations/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await parseApiResponse(
        response,
        "Failed to load conversation messages"
      );
      const data = result.messages ?? (Array.isArray(result) ? result : []);

      setCurrentConversationId(id);
      setMessages(data ?? []);

      // Recover document info from local storage or check existing attachments
      const savedDoc = getConversationDoc(id);
      setAttachedDocument(savedDoc);
      setUploadMessage("");
      setMobileSidebar(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    } catch (error) {
      console.error("Failed to load conversation:", error instanceof Error ? error.message : "Unknown error");
      setGlobalError("Failed to load conversation messages.");
    } finally {
      setLoadingConversationId(null);
    }
  }

  // ----------------------------------------
  // CREATE CHAT (Lazy on first message/document)
  // ----------------------------------------

  async function createConversation(title: string): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("User session expired. Please refresh the page.");
    }

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ title }),
    });

    const data = await parseApiResponse(
      response,
      "Failed to create conversation."
    );

    const conversation = data.conversation || data;

    setConversations((prev) => [conversation, ...prev]);
    setCurrentConversationId(conversation.id);

    return conversation.id;
  }

  // ----------------------------------------
  // SAVE MESSAGE
  // ----------------------------------------

  async function saveMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string
  ): Promise<{ id: string } | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("User session expired. Please refresh the page.");
    }

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        role,
        content,
      }),
    });

    const data = await parseApiResponse(
      response,
      "Failed to save message."
    );

    return data.message || data;
  }

  // ----------------------------------------
  // TOUCH CONVERSATION (Updates updated_at)
  // ----------------------------------------

  async function touchConversation(id: string) {
    const updatedAt = new Date().toISOString();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ updated_at: updatedAt }),
        });
      }
    } catch {
      // Ignore background patch error
    }

    setConversations((prev) =>
      prev
        .map((conversation) =>
          conversation.id === id
            ? { ...conversation, updated_at: updatedAt }
            : conversation
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
    );
  }

  // ----------------------------------------
  // UPLOAD PDF WITH MULTI-STAGE PROGRESS
  // ----------------------------------------

  const handlePDFUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side pre-validation
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadMessage("Only PDF files are supported.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadMessage("PDF is too large. Maximum size is 10 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setUploadMessage("The selected PDF file is empty.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadProgress("Uploading PDF...");
    setUploadMessage("");
    setGlobalError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication required. Please refresh the page.");
      }

      // Step 1: Upload & parse PDF
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await parseApiResponse<{ filename: string; text: string; pages: number }>(
        response,
        "Failed to upload and parse PDF."
      );

      // Step 2: Store document record
      setUploadProgress("Processing document...");
      const docResponse = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          filename: result.filename,
          content: result.text,
          pages: result.pages,
        }),
      });

      const document = await parseApiResponse<{ id: string; filename: string }>(
        docResponse,
        "Document creation failed."
      );

      // Step 3: Embed document chunks
      setUploadProgress("Creating searchable index...");
      const embedResponse = await fetch("/api/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          documentId: document.id,
        }),
      });

      const embedResult = await parseApiResponse<{ chunks: number; success: boolean }>(
        embedResponse,
        "Failed to create searchable index."
      );

      // Step 4: Attach to conversation
      let convId = currentConversationId;
      if (!convId) {
        convId = await createConversation(`📄 ${result.filename}`);
      }

      const docInfo = { id: document.id, filename: result.filename };
      setAttachedDocument(docInfo);
      if (convId) {
        setConversationDoc(convId, docInfo);
      }

      setUploadProgress("PDF ready ✓");
      setUploadMessage(
        `✓ ${result.filename} attached (${embedResult.chunks || 0} indexed sections)`
      );
    } catch (error) {
      console.warn("Upload failed:", error instanceof Error ? error.message : "Unknown error");
      setUploadMessage(
        error instanceof Error ? error.message : "Failed to process PDF."
      );
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  async function deleteAttachedDocument() {
    if (!attachedDocument || uploading) return;

    const confirmed = window.confirm(
      `Remove "${attachedDocument.filename}" from this chat?`
    );
    if (!confirmed) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication required.");
      }

      const response = await fetch(`/api/documents/${attachedDocument.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      await parseApiResponse(response, "Failed to delete document.");

      setAttachedDocument(null);
      if (currentConversationId) {
        setConversationDoc(currentConversationId, null);
      }

      setUploadMessage("✓ Document removed.");
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : "Failed to delete document."
      );
    }
  }

  // ----------------------------------------
  // SEND MESSAGE (With Streaming & Safe Abort)
  // ----------------------------------------

  async function sendMessage(text?: string) {
    const messageText = text ?? input;

    if (!messageText.trim() || isLoading || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setInput("");
    setIsLoading(true);
    setGlobalError(null);

    let conversationId: string | null = currentConversationId;
    let assistantMessage = "";
    let conversationMessages: Message[] = [];

    try {
      const userMessage: Message = {
        role: "user",
        content: messageText.trim(),
      };

      conversationMessages = [...messages, userMessage];

      // Optimistically add user message and temporary empty assistant placeholder
      setMessages([
        ...conversationMessages,
        {
          role: "assistant",
          content: "",
        },
      ]);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 1. Concurrently obtain auth session
      const sessionPromise = supabase.auth.getSession();

      // 2. Concurrently ensure conversation exists and save user message without blocking AI stream
      const convIdPromise: Promise<string> = conversationId
        ? Promise.resolve(conversationId)
        : createConversation(messageText.trim());

      const userSavePromise = convIdPromise
        .then(async (id) => {
          conversationId = id;
          if (attachedDocument) {
            setConversationDoc(id, attachedDocument);
          }
          await saveMessage(id, "user", messageText.trim());
          return id;
        })
        .catch((err) => {
          console.warn("Background user message save:", err);
          return conversationId || "";
        });

      // 3. Immediately launch the AI streaming request (zero dead time waiting on DB)
      const {
        data: { session },
      } = await sessionPromise;

      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          messages: conversationMessages,
          documentId: attachedDocument?.id || null,
        }),
      });

      if (!response.ok || !response.body) {
        let errDetails = "AI response generation failed.";
        try {
          const errJson = await response.json();
          if (errJson?.error) {
            errDetails =
              typeof errJson.error === "string"
                ? errJson.error
                : JSON.stringify(errJson.error);
          }
        } catch {
          // Ignore json parsing error
        }
        throw new Error(errDetails);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Batch rendering of fast streaming tokens with requestAnimationFrame for 60fps UI
      let animationFrameId: number | null = null;
      const renderChunk = (content: string) => {
        if (animationFrameId !== null) return;
        animationFrameId = requestAnimationFrame(() => {
          setMessages([
            ...conversationMessages,
            {
              role: "assistant",
              content,
            },
          ]);
          animationFrameId = null;
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        renderChunk(assistantMessage);
      }

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      // Final synchronous render of full assistant message
      setMessages([
        ...conversationMessages,
        {
          role: "assistant",
          content: assistantMessage,
        },
      ]);

      // Ensure background user message save has completed
      await userSavePromise;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User intentionally stopped generation
      } else {
        console.error("Chat error:", error instanceof Error ? error.message : "Unknown error");
        const isNetworkErr =
          error instanceof TypeError && error.message.toLowerCase().includes("fetch");
        const friendlyMessage = isNetworkErr
          ? "Network connection error. Please check your internet and try again."
          : error instanceof Error
          ? error.message
          : "The AI service is temporarily unavailable. Please try again.";

        setGlobalError(friendlyMessage);

        if (!assistantMessage.trim()) {
          setMessages([
            ...conversationMessages,
            {
              role: "assistant",
              content: "Sorry, I couldn't complete that response. Please try again.",
            },
          ]);
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      isSubmittingRef.current = false;

      // Handle persistence and state cleanup for assistant message
      const trimmedAssistant = assistantMessage.trim();
      const activeId = conversationId || currentConversationId;
      if (activeId) {
        if (trimmedAssistant) {
          try {
            const saved = await saveMessage(
              activeId,
              "assistant",
              trimmedAssistant
            );
            setMessages([
              ...conversationMessages,
              {
                id: saved?.id,
                role: "assistant",
                content: trimmedAssistant,
              },
            ]);
            // Reorder local conversation list immediately
            const updatedAt = new Date().toISOString();
            setConversations((prev) =>
              prev
                .map((conv) =>
                  conv.id === activeId ? { ...conv, updated_at: updatedAt } : conv
                )
                .sort(
                  (a, b) =>
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
                )
            );
          } catch (saveErr) {
            console.error("Failed to save assistant message:", saveErr);
          }
        } else if (!globalError) {
          // Stopped before any tokens arrived: clean up empty assistant bubble
          setMessages(conversationMessages);
        }
      }

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  // ----------------------------------------
  // REGENERATE MESSAGE
  // ----------------------------------------

  async function regenerateMessage(assistantIndex: number) {
    if (isLoading || isSubmittingRef.current) return;

    const previousUserIndex = assistantIndex - 1;
    if (previousUserIndex < 0 || messages[previousUserIndex]?.role !== "user") {
      return;
    }

    if (!currentConversationId) return;

    isSubmittingRef.current = true;
    setIsLoading(true);
    setGlobalError(null);

    const conversationBeforeResponse = messages.slice(0, previousUserIndex + 1);
    let assistantMessage = "";

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please refresh the page.");
      }

      // Delete the old assistant message if stored
      if (messages[assistantIndex]?.id) {
        await fetch(`/api/messages/${messages[assistantIndex].id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }

      setMessages(
        conversationBeforeResponse.concat({
          role: "assistant",
          content: "",
        })
      );

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: conversationBeforeResponse,
          documentId: attachedDocument?.id || null,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errDetails = "Regeneration failed.";
        try {
          const errJson = await response.json();
          if (errJson?.error) {
            errDetails =
              typeof errJson.error === "string"
                ? errJson.error
                : JSON.stringify(errJson.error);
          }
        } catch {
          // Ignore
        }
        throw new Error(errDetails);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        setMessages(
          conversationBeforeResponse.concat({
            role: "assistant",
            content: assistantMessage,
          })
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Generation stopped by user
      } else {
        console.error("Regeneration error:", error instanceof Error ? error.message : "Unknown error");
        setGlobalError("Unable to regenerate response. Please try again.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      isSubmittingRef.current = false;

      const trimmedAssistant = assistantMessage.trim();
      if (currentConversationId) {
        if (trimmedAssistant) {
          try {
            const saved = await saveMessage(
              currentConversationId,
              "assistant",
              trimmedAssistant
            );
            setMessages(
              conversationBeforeResponse.concat({
                id: saved?.id,
                role: "assistant",
                content: trimmedAssistant,
              })
            );
            await touchConversation(currentConversationId);
          } catch (saveErr) {
            console.error("Failed to save regenerated message:", saveErr);
          }
        } else {
          // Stopped before any tokens arrived: clean up empty assistant bubble
          setMessages(conversationBeforeResponse);
        }
      }
    }
  }

  // ----------------------------------------
  // RENAME CHAT
  // ----------------------------------------

  function startRename(conversation: Conversation) {
    setEditingConversation(conversation.id);
    setEditingTitle(conversation.title);
  }

  async function saveRename(id: string) {
    const title = editingTitle.trim();
    if (!title) {
      setEditingConversation(null);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename conversation.");
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id
            ? {
                ...conv,
                title: title.length > 40 ? title.slice(0, 40) + "..." : title,
              }
            : conv
        )
      );

      setEditingConversation(null);
      setEditingTitle("");
    } catch {
      setGlobalError("Failed to rename conversation.");
    }
  }

  // ----------------------------------------
  // DELETE CHAT
  // ----------------------------------------

  async function deleteConversation(id: string) {
    if (isLoading || deletingConversationId) return;

    setDeletingConversationId(id);
    setConversationDoc(id, null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation.");
      }

      const remaining = conversations.filter((conv) => conv.id !== id);
      setConversations(remaining);

      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
        setAttachedDocument(null);
        setUploadMessage("");

        if (remaining.length > 0) {
          await loadConversation(remaining[0].id);
        }
      }
    } catch {
      setGlobalError("Failed to delete conversation.");
    } finally {
      setDeletingConversationId(null);
    }
  }

  // ----------------------------------------
  // NEW CHAT (Lazy creation)
  // ----------------------------------------

  function newChat() {
    if (isLoading) return;

    setCurrentConversationId(null);
    setMessages([]);
    setInput("");
    setAttachedDocument(null);
    setUploadMessage("");
    setGlobalError(null);
    setMobileSidebar(false);

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  // ----------------------------------------
  // STOP GENERATION
  // ----------------------------------------

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  }

  // ----------------------------------------
  // AUTO SCROLL
  // ----------------------------------------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ----------------------------------------
  // KEYBOARD HANDLER
  // ----------------------------------------

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // ----------------------------------------
  // GROUP CONVERSATIONS
  // ----------------------------------------

  const groupedConversations = {
    Today: conversations.filter(
      (conv) => getConversationGroup(conv.updated_at) === "Today"
    ),
    Yesterday: conversations.filter(
      (conv) => getConversationGroup(conv.updated_at) === "Yesterday"
    ),
    "Previous 7 Days": conversations.filter(
      (conv) => getConversationGroup(conv.updated_at) === "Previous 7 Days"
    ),
    Older: conversations.filter(
      (conv) => getConversationGroup(conv.updated_at) === "Older"
    ),
  };

  function renderConversationGroup(title: string, items: Conversation[]) {
    if (items.length === 0) return null;

    return (
      <div className="mb-5">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </p>

        <div className="space-y-1">
          {items.map((conversation) => {
            const isCurrent = currentConversationId === conversation.id;
            const isDeleting = deletingConversationId === conversation.id;
            const isLoadingThis = loadingConversationId === conversation.id;

            return (
              <div
                key={conversation.id}
                className={`group flex items-center rounded-lg transition-colors ${
                  isCurrent
                    ? "bg-gray-800 text-white font-medium"
                    : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
              >
                {editingConversation === conversation.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onBlur={() => saveRename(conversation.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveRename(conversation.id);
                      }
                      if (event.key === "Escape") {
                        setEditingConversation(null);
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
                  />
                ) : (
                  <button
                    onClick={() => loadConversation(conversation.id)}
                    disabled={isLoading || isLoadingThis}
                    className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm"
                  >
                    {isLoadingThis ? "Loading..." : conversation.title}
                  </button>
                )}

                {!editingConversation && !isDeleting && (
                  <div className="mr-1 hidden items-center gap-1 group-hover:flex">
                    <button
                      onClick={() => startRename(conversation)}
                      disabled={isLoading}
                      className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-50"
                      title="Rename conversation"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteConversation(conversation.id)}
                      disabled={isLoading}
                      className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-700 hover:text-red-400 disabled:opacity-50"
                      title="Delete conversation"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // INITIALIZING VIEW
  // ----------------------------------------

  if (isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center">
          <div className="mb-4 text-4xl animate-bounce">🤖</div>
          <p className="text-sm font-medium text-gray-400">
            Starting your AI assistant...
          </p>
        </div>
      </main>
    );
  }

  // ----------------------------------------
  // MAIN APPLICATION VIEW
  // ----------------------------------------

  return (
    <main className="flex h-screen overflow-hidden bg-gray-950 text-white">
      {/* MOBILE OVERLAY */}
      {mobileSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-800 bg-gray-950 transition-transform duration-200 md:static md:flex md:translate-x-0 ${
          mobileSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <button
            onClick={newChat}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-700/80 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-gray-800 active:scale-[0.99] disabled:opacity-50"
          >
            ＋ New Chat
          </button>
          <button
            onClick={() => setMobileSidebar(false)}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 md:hidden"
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          {renderConversationGroup("Today", groupedConversations.Today)}
          {renderConversationGroup("Yesterday", groupedConversations.Yesterday)}
          {renderConversationGroup(
            "Previous 7 Days",
            groupedConversations["Previous 7 Days"]
          )}
          {renderConversationGroup("Older", groupedConversations.Older)}

          {conversations.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-gray-500">
              No conversations yet.
              <br />
              Start a new chat to begin.
            </div>
          )}
        </div>

        <div className="border-t border-gray-800/80 p-4 text-xs text-gray-500">
          <div className="font-medium text-gray-400">AI Chatbot</div>
          <div>Powered by ExperientialLabs</div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 backdrop-blur-xs md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebar(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 md:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-white md:text-lg">
                AI Chatbot
              </h1>
              <p className="truncate text-xs text-gray-500">
                DeepSeek & Qwen · Gemini Embeddings
              </p>
            </div>
          </div>

          <button
            onClick={newChat}
            disabled={isLoading}
            className="hidden rounded-lg border border-gray-700/80 px-3.5 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 md:block"
          >
            + New Chat
          </button>
        </header>

        {/* GLOBAL ERROR BANNER */}
        {globalError && (
          <div className="flex items-center justify-between border-b border-red-500/30 bg-red-950/50 px-4 py-2 text-xs text-red-200">
            <span className="flex-1">{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="ml-3 font-bold text-red-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {/* EMPTY STATE */}
            {messages.length === 0 && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-4 text-5xl">🤖</div>
                <h2 className="text-xl md:text-2xl font-semibold text-white">
                  How can I help you today?
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Ask any question or pick an example below to get started:
                </p>

                {/* SUGGESTED PROMPTS */}
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(item.prompt)}
                      disabled={isLoading}
                      className="flex flex-col items-start rounded-xl border border-gray-800 bg-gray-900/50 p-3.5 text-left transition-all hover:border-gray-700 hover:bg-gray-800/80 active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="mt-1 text-sm font-medium text-gray-200">
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-gray-400">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>

                {/* PDF CALLOUT */}
                <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
                  <span>📄</span>
                  <span>
                    Upload a PDF (up to 10 MB) below to ask specific questions about your document.
                  </span>
                </div>
              </div>
            )}

            {/* MESSAGE LIST */}
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const canRegenerate =
                !isUser &&
                index > 0 &&
                messages[index - 1]?.role === "user";

              return (
                <div
                  key={message.id ?? `${index}-${message.content.slice(0, 20)}`}
                  className={`group flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] md:max-w-[75%] rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-sm"
                        : "w-full rounded-2xl bg-transparent px-1 py-1"
                    }
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap leading-7 break-words text-[15px]">
                        {message.content}
                      </div>
                    ) : message.content ? (
                      <>
                        <MarkdownMessage content={message.content} />
                        {!isLoading && canRegenerate && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => regenerateMessage(index)}
                              type="button"
                              className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                            >
                              ↻ Regenerate
                            </button>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(message.content)
                              }
                              type="button"
                              className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                            >
                              Copy
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      isLoading && (
                        <div className="flex items-center gap-1.5 py-3 text-gray-400">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400"></span>
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                            style={{ animationDelay: "150ms" }}
                          ></span>
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                            style={{ animationDelay: "300ms" }}
                          ></span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT COMPOSER */}
        <div className="border-t border-gray-800 bg-gray-950 p-3 md:p-4">
          <div className="mx-auto max-w-3xl">
            {/* ATTACHMENT & PROGRESS BAR */}
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePDFUpload}
                disabled={uploading || isLoading}
                className="hidden"
                id="pdf-upload-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || isLoading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-700 hover:bg-gray-800 disabled:opacity-50"
              >
                <span>📄</span>
                <span>{uploading ? uploadProgress || "Processing..." : "Attach PDF"}</span>
              </button>

              {attachedDocument && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 text-xs text-blue-300 shadow-sm">
                  <span className="max-w-[180px] md:max-w-xs truncate">
                    📄 {attachedDocument.filename}
                  </span>
                  <button
                    type="button"
                    onClick={deleteAttachedDocument}
                    disabled={uploading}
                    title="Remove document"
                    className="ml-1 font-bold text-gray-400 hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}

              {uploadMessage && (
                <p
                  className={`text-xs ${
                    uploadMessage.startsWith("✓")
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {uploadMessage}
                </p>
              )}
            </div>

            {/* TEXTAREA & SEND / STOP BUTTONS */}
            <div className="flex items-end gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-2 transition-colors focus-within:border-blue-500/80">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={1}
                placeholder={
                  attachedDocument
                    ? `Ask anything about "${attachedDocument.filename}"...`
                    : "Message your AI assistant..."
                }
                className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-500"
              />

              {isLoading ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 active:scale-95"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || uploading}
                  className="flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send
                </button>
              )}
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-600">
              Enter to send · Shift + Enter for new line · Supports PDF analysis up to 10 MB
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}