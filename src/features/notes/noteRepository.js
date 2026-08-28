import { createStorageClient } from "../../storage/storageRouter.js";

const notesStorage = createStorageClient("notes");
const CURRENT_NOTE_KEY = "current";
const NOTE_LIST_KEY = "items";

function createNoteId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeNotes(notes) {
  return Array.isArray(notes) ? notes : [];
}

export const noteRepository = {
  get storageAreaName() {
    return notesStorage.areaName;
  },
  async getNotes() {
    const notes = await notesStorage.get(NOTE_LIST_KEY, null);

    if (Array.isArray(notes)) {
      return notes;
    }

    const legacyNote = await notesStorage.get(CURRENT_NOTE_KEY, null);

    if (!legacyNote?.body) {
      return [];
    }

    return [
      {
        id: createNoteId(),
        name: "Goal",
        details: legacyNote.body,
        completed: false,
        createdAt: legacyNote.updatedAt ?? new Date().toISOString(),
        updatedAt: legacyNote.updatedAt ?? new Date().toISOString()
      }
    ];
  },
  saveNotes(notes) {
    return notesStorage.set(NOTE_LIST_KEY, normalizeNotes(notes));
  },
  createNote({ name, details }) {
    const now = new Date().toISOString();

    return {
      id: createNoteId(),
      name: name.trim(),
      details: details.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now
    };
  },
  getCurrentNote() {
    return notesStorage.get(CURRENT_NOTE_KEY, "");
  },
  saveCurrentNote(note) {
    return notesStorage.set(CURRENT_NOTE_KEY, {
      body: note.trimEnd(),
      updatedAt: new Date().toISOString()
    });
  },
  clearCurrentNote() {
    return notesStorage.remove(CURRENT_NOTE_KEY);
  }
};
