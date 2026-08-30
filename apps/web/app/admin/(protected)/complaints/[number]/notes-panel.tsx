"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import { addAdminNoteAction, addPublicUpdateAction } from "@/lib/admin/actions/notes";
import type { AdminNoteRow, AdminPublicUpdateRow } from "@/lib/admin/complaint-detail";

/**
 * Two clearly separate lists and forms in one panel — CLAUDE.md §5:
 * AdminNotes are confidential (never sent to any citizen-facing code path);
 * PublicUpdates are exactly what the citizen's own /complaints/[number] page
 * reads. Never merged into one "comments" feed, so an admin can't
 * mistake which one they're posting to.
 */
export function NotesPanel({
  complaintId,
  adminNotes,
  publicUpdates,
}: {
  complaintId: string;
  adminNotes: AdminNoteRow[];
  publicUpdates: AdminPublicUpdateRow[];
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [notePending, setNotePending] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messagePending, setMessagePending] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  async function handleAddNote() {
    setNotePending(true);
    setNoteError(null);
    const result = await addAdminNoteAction(complaintId, note);
    setNotePending(false);
    if (result.ok) {
      setNote("");
      router.refresh();
    } else {
      setNoteError(result.error ?? "Could not add note.");
    }
  }

  async function handleAddUpdate() {
    setMessagePending(true);
    setMessageError(null);
    const result = await addPublicUpdateAction(complaintId, message);
    setMessagePending(false);
    if (result.ok) {
      setMessage("");
      router.refresh();
    } else {
      setMessageError(result.error ?? "Could not post update.");
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Confidential admin notes <span className="font-normal normal-case">(never shown to the citizen)</span>
        </h3>
        <ul className="flex flex-col gap-2">
          {adminNotes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
          {adminNotes.map((n) => (
            <li key={n.id} className="text-sm">
              <p>{n.note}</p>
              <p className="text-xs text-muted-foreground">
                {n.adminName} · {n.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a confidential note"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
        />
        <FormMessage error={noteError ?? undefined} />
        <Button type="button" size="sm" onClick={() => void handleAddNote()} disabled={notePending}>
          {notePending ? "Adding…" : "Add note"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Public updates <span className="font-normal normal-case">(citizen-visible)</span>
        </h3>
        <ul className="flex flex-col gap-2">
          {publicUpdates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
          {publicUpdates.map((u) => (
            <li key={u.id} className="text-sm">
              <p>{u.message}</p>
              <p className="text-xs text-muted-foreground">
                {u.authorName ?? "System"} · {u.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Post an update the citizen will see"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
        />
        <FormMessage error={messageError ?? undefined} />
        <Button type="button" size="sm" onClick={() => void handleAddUpdate()} disabled={messagePending}>
          {messagePending ? "Posting…" : "Post update"}
        </Button>
      </div>
    </div>
  );
}
