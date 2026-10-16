"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Eye,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  ShieldCheck,
  GraduationCap,
  X,
  Trash2,
  Check
} from "lucide-react";
import {
  getBatchDiscussionReplies,
  createBatchDiscussionReply,
  updateBatchDiscussionReply,
  deleteBatchDiscussionReply,
  BatchDiscussionReply
} from "@/services/lms.services";
import { getImageUrl } from "@/services/api.services";
import { timeAgo, getInitials } from "@/utils/formatters";

interface BatchDiscussionsProps {
  batchId: string;
  batchTitle?: string;
  isEnrolled?: boolean;
  isInstructor?: boolean;
}

// Convert user markdown/plain-text input into safe HTML for Frappe LMS storage
function formatMessageToHtml(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // If already full HTML blocks
  if (trimmed.startsWith("<p>") || trimmed.startsWith("<div>")) {
    return trimmed;
  }

  // Parse basic markdown patterns
  let html = trimmed
    // Escape standard entities first (except existing safe tags)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```code```
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs font-mono my-2"><code>$1</code></pre>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Bold: **text** or __text__
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 underline font-medium">$1</a>'
  );

  // Blockquotes: > quote
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-3 italic text-slate-600 my-2">$1</blockquote>');

  // Lists: lines starting with "- " or "* "
  const lines = html.split("\n");
  const processedLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul class="list-disc pl-5 my-2 space-y-1">');
        inList = true;
      }
      processedLines.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      processedLines.push(line);
    }
  }
  if (inList) {
    processedLines.push("</ul>");
  }

  html = processedLines.join("\n");

  // Paragraphs
  const paragraphs = html
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (
        p.startsWith("<pre") ||
        p.startsWith("<ul") ||
        p.startsWith("<ol") ||
        p.startsWith("<blockquote")
      ) {
        return p;
      }
      return `<p>${p.replace(/\n/g, "<br/>")}</p>`;
    });

  return paragraphs.join("");
}

// Convert stored HTML back into editable markdown/plain text
function htmlToEditText(html: string): string {
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html;
  }

  let text = html;
  // Code blocks: <pre ...><code ...>...</code></pre>
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```");
  // Inline code: <code>...</code>
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  // Blockquotes: <blockquote>...</blockquote>
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n");
  // Lists: <li>...</li>
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n");
  // Remove wrapper list tags
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, "");
  // Links: <a href="url"...>text</a> -> [text](url)
  text = text.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  // Strong / Bold
  text = text.replace(/<\/?(strong|b)[^>]*>/gi, "**");
  // Em / Italic
  text = text.replace(/<\/?(em|i)[^>]*>/gi, "*");
  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Paragraphs
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<\/?p[^>]*>/gi, "");
  // Divs
  text = text.replace(/<\/div>\s*<div[^>]*>/gi, "\n");
  text = text.replace(/<\/?div[^>]*>/gi, "");
  // HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  return text.trim();
}

export default function BatchDiscussions({
  batchId,
  batchTitle,
  isEnrolled,
  isInstructor
}: BatchDiscussionsProps) {
  const [replies, setReplies] = useState<BatchDiscussionReply[]>([]);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [newReply, setNewReply] = useState<string>("");
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [updatingReplyId, setUpdatingReplyId] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  // Load user information from local storage
  useEffect(() => {
    try {
      const email = localStorage.getItem("userEmail") || "";
      const name = localStorage.getItem("userName") || localStorage.getItem("fullName") || email.split("@")[0] || "";
      const avatar = localStorage.getItem("userImage") || null;
      setUserEmail(email);
      setUserName(name);
      setUserAvatar(avatar);
    } catch (e) {
      // Ignored
    }
  }, []);

  // Fetch replies
  const fetchReplies = useCallback(
    async (isManualRefresh = false, overrideTopic?: string) => {
      if (!batchId) return;
      if (!isManualRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const topicToUse = overrideTopic || currentTopic || undefined;
        const res = await getBatchDiscussionReplies(batchId, topicToUse);
        setReplies(res.replies || []);
        if (res.topic) {
          setCurrentTopic(res.topic);
        }
      } catch (err: any) {
        console.error("Error loading batch discussions:", err);
        setError(err.message || "Failed to load batch discussions.");
      } finally {
        setLoading(false);
      }
    },
    [batchId, currentTopic]
  );

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  // Insert markdown tag helper for rich formatting toolbar
  const applyFormat = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newReply.substring(start, end);
    let before = newReply.substring(0, start);
    let after = newReply.substring(end);
    let replacement = "";
    let newCursorPos = start;

    switch (formatType) {
      case "bold":
        replacement = `**${selectedText || "bold text"}**`;
        newCursorPos = selectedText ? end + 4 : start + 2;
        break;
      case "italic":
        replacement = `*${selectedText || "italic text"}*`;
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case "code":
        if (selectedText.includes("\n")) {
          replacement = `\n\`\`\`\n${selectedText || "code here"}\n\`\`\`\n`;
        } else {
          replacement = `\`${selectedText || "code"}\``;
        }
        newCursorPos = selectedText ? end + 2 : start + 1;
        break;
      case "list":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `- ${line}`)
              .join("\n")
          : "- List item";
        break;
      case "quote":
        replacement = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")
          : "> Quote";
        break;
      case "link":
        const url = prompt("Enter URL (e.g. https://example.com):", "https://");
        if (!url) return;
        replacement = `[${selectedText || "link title"}](${url})`;
        break;
      default:
        return;
    }

    const updated = before + replacement + after;
    setNewReply(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Keyboard shortcut listener: Ctrl+Enter / Cmd+Enter to post
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handlePostReply();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyFormat("bold");
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyFormat("italic");
    }
  };

  // Post discussion reply
  const handlePostReply = async () => {
    if (!newReply.trim()) {
      setSubmitError("Message cannot be empty.");
      setTimeout(() => setSubmitError(null), 4000);
      return;
    }

    if (!userEmail) {
      setSubmitError("You must be logged in to participate in the discussion.");
      setTimeout(() => setSubmitError(null), 5000);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const formattedHtml = formatMessageToHtml(newReply);

    try {
      const createRes = await createBatchDiscussionReply({
        doctype: "LMS Batch",
        docname: batchId,
        reply: formattedHtml,
        title: batchTitle || batchId,
      });

      const resObj = createRes as Record<string, any>;
      const returnedTopic = resObj?.data?.topic || resObj?.topic || "";
      if (returnedTopic) {
        setCurrentTopic(returnedTopic);
      }

      setNewReply("");
      setPreviewMode(false);
      setSuccessToast("Message posted successfully!");
      setTimeout(() => setSuccessToast(null), 4000);

      // Refresh list to fetch newly saved reply with metadata
      await fetchReplies(true, returnedTopic || currentTopic);

      // Scroll to bottom smoothly
      setTimeout(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } catch (err: any) {
      console.error("Failed to post discussion reply:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to post message. Please try again.";
      setSubmitError(errMsg);
      setTimeout(() => setSubmitError(null), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  // Start editing a reply
  const handleStartEdit = (reply: BatchDiscussionReply) => {
    const replyId = reply.name || reply.reply_name || "";
    setEditingReplyId(replyId);
    setEditingText(htmlToEditText(reply.reply || ""));
    setTimeout(() => {
      editTextareaRef.current?.focus();
    }, 50);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditingText("");
  };

  // Save edited discussion reply
  const handleSaveEdit = async (replyName: string) => {
    if (!replyName) return;
    if (!editingText.trim()) {
      setSubmitError("Reply content cannot be empty.");
      setTimeout(() => setSubmitError(null), 4000);
      return;
    }

    setUpdatingReplyId(replyName);
    const updatedHtml = formatMessageToHtml(editingText);

    try {
      await updateBatchDiscussionReply({
        reply_name: replyName,
        reply: updatedHtml,
      });

      // Optimistically update replies in state
      setReplies((prev) =>
        prev.map((r) =>
          (r.name || r.reply_name) === replyName
            ? { ...r, reply: updatedHtml, modified: new Date().toISOString() }
            : r
        )
      );

      setEditingReplyId(null);
      setEditingText("");
      setSuccessToast("Reply updated successfully!");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to update discussion reply:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update reply. Please try again.";
      setSubmitError(errMsg);
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setUpdatingReplyId(null);
    }
  };

  // Delete discussion reply
  const handleDeleteReply = async (replyName: string) => {
    if (!replyName) return;
    if (!window.confirm("Are you sure you want to delete this reply?")) {
      return;
    }

    setDeletingReplyId(replyName);
    try {
      await deleteBatchDiscussionReply(replyName);
      // Optimistic update: remove immediately from list
      setReplies((prev) =>
        prev.filter((r) => (r.name || r.reply_name) !== replyName)
      );
      setSuccessToast("Reply deleted successfully");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to delete discussion reply:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete reply. Please try again.";
      setSubmitError(errMsg);
      setTimeout(() => setSubmitError(null), 5000);
    } finally {
      setDeletingReplyId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Toast Notifications */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
          <button
            onClick={() => setSubmitError(null)}
            className="text-rose-600 hover:text-rose-900 transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Discussion Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Section Header */}
        <div className="p-6 md:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-indigo-50/20">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Batch Discussions
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200/50">
                {replies.length} {replies.length === 1 ? "Message" : "Messages"}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 max-w-xl">
              Ask questions, discuss topics, and collaborate with your peers and
              instructors in this batch thread.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchReplies(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh discussion replies"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Replies List Area */}
        <div className="p-6 md:p-8 space-y-5 bg-slate-50/40 min-h-[220px]">
          {loading ? (
            /* Loading Skeletons */
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-xl border border-slate-100 shadow-2xs animate-pulse flex gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                      <div className="h-3 w-16 bg-slate-100 rounded" />
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded" />
                    <div className="h-3 w-3/4 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-8 text-center bg-white rounded-xl border border-rose-100 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Unable to load discussions
              </h3>
              <p className="text-xs text-slate-500 mb-4">{error}</p>
              <button
                onClick={() => fetchReplies(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Try Again
              </button>
            </div>
          ) : replies.length === 0 ? (
            /* Empty State */
            <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-slate-200/90 shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">
                No discussions yet
              </h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto mb-5">
                Start the conversation below! Share questions, updates, and
                insights with fellow students and instructors.
              </p>
              <button
                onClick={() => {
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write the First Message</span>
              </button>
            </div>
          ) : (
            /* Replies Stream */
            <div className="space-y-4">
              {replies.map((reply, idx) => {
                const displayName =
                  reply.full_name ||
                  reply.user_name ||
                  reply.owner?.split("@")[0] ||
                  reply.user ||
                  "Batch Member";
                const userInitials = getInitials(displayName);
                const isAuthorInstructor =
                  reply.role === "Instructor" ||
                  reply.is_instructor ||
                  (isInstructor && reply.owner === userEmail);

                return (
                  <div
                    key={reply.name || reply.reply_name || idx}
                    className="group bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-3"
                  >
                    {/* Message Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {reply.user_image ? (
                          <img
                            src={getImageUrl(reply.user_image)}
                            alt={displayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-2xs shrink-0">
                            {userInitials}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm">
                              {displayName}
                            </h4>
                            {isAuthorInstructor && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                <ShieldCheck className="w-3 h-3 text-amber-600" />
                                Instructor
                              </span>
                            )}
                            {reply.owner === userEmail && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="truncate max-w-[200px]" title={reply.owner}>
                              {reply.owner}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(reply.creation)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Edit & Delete actions for message owner or instructor */}
                      {(reply.owner === userEmail || isInstructor) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                          {/* Edit button */}
                          {editingReplyId !== (reply.name || reply.reply_name) && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(reply)}
                              disabled={
                                deletingReplyId === (reply.name || reply.reply_name) ||
                                updatingReplyId === (reply.name || reply.reply_name)
                              }
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                              title="Edit message"
                              aria-label="Edit message"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteReply(reply.name || reply.reply_name || "")
                            }
                            disabled={
                              deletingReplyId === (reply.name || reply.reply_name) ||
                              editingReplyId === (reply.name || reply.reply_name)
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            {deletingReplyId === (reply.name || reply.reply_name) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Message Content or Inline Editor */}
                    {editingReplyId === (reply.name || reply.reply_name) ? (
                      <div className="pl-0 sm:pl-13 mt-1 space-y-3">
                        <div className="bg-slate-50/70 rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all p-3">
                          <textarea
                            ref={editTextareaRef}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEdit(reply.name || reply.reply_name || "");
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                handleCancelEdit();
                              }
                            }}
                            rows={3}
                            className="w-full bg-transparent text-sm text-slate-800 outline-none resize-y placeholder:text-slate-400 leading-relaxed font-normal"
                            placeholder="Edit your message... (Markdown or HTML supported)"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">
                            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Ctrl+Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Esc</kbd> to cancel
                          </span>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={updatingReplyId === (reply.name || reply.reply_name)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(reply.name || reply.reply_name || "")}
                              disabled={
                                updatingReplyId === (reply.name || reply.reply_name) ||
                                !editingText.trim()
                              }
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:transform-none"
                            >
                              {updatingReplyId === (reply.name || reply.reply_name) ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save Changes</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-0 sm:pl-13">
                        <div
                          className="prose prose-sm max-w-none text-slate-700 leading-relaxed break-words"
                          dangerouslySetInnerHTML={{ __html: reply.reply }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={repliesEndRef} />
            </div>
          )}
        </div>

        {/* Input Composer Card */}
        <div className="p-6 md:p-7 border-t border-slate-200/80 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Post to Batch Discussion</span>
            </div>
            {/* View Mode Toggle: Write / Preview */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  !previewMode
                    ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  previewMode
                    ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {/* Formatting Toolbar */}
          {!previewMode && (
            <div className="flex items-center gap-1 p-1.5 mb-2 bg-slate-50 border border-slate-200/80 rounded-t-xl overflow-x-auto text-slate-600">
              <button
                type="button"
                onClick={() => applyFormat("bold")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("italic")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => applyFormat("list")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("quote")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("code")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Code block"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyFormat("link")}
                className="p-1.5 hover:bg-white hover:text-indigo-600 rounded text-slate-700 hover:shadow-2xs transition-all cursor-pointer"
                title="Add Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Textarea or Preview */}
          {previewMode ? (
            <div className="min-h-[130px] p-4 bg-slate-50/70 border border-slate-200 rounded-xl text-sm overflow-y-auto">
              {newReply.trim() ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: formatMessageToHtml(newReply)
                  }}
                />
              ) : (
                <p className="text-slate-400 italic text-xs">
                  Nothing to preview yet. Switch back to Write mode to type your
                  message.
                </p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder="Write a message to this batch... (Questions, announcements, resources. Supports Markdown & HTML)"
              className="w-full p-4 text-sm bg-white border border-slate-200 rounded-b-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-y text-slate-800 placeholder:text-slate-400 font-normal leading-relaxed"
            />
          )}

          {/* Action Bar */}
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-400">
              Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono text-slate-600">Ctrl+Enter</kbd> to quickly send your message.
            </span>

            <button
              onClick={handlePostReply}
              disabled={submitting || !newReply.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-95 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
