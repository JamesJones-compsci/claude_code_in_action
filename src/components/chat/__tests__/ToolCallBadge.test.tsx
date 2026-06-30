import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";

// --- getToolLabel unit tests ---

test("getToolLabel: str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "src/components/Card.tsx" })).toBe("Creating Card.tsx");
});

test("getToolLabel: str_replace_editor str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "src/components/Card.tsx" })).toBe("Editing Card.tsx");
});

test("getToolLabel: str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "src/components/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolLabel: str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "src/components/Form.tsx" })).toBe("Viewing Form.tsx");
});

test("getToolLabel: file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "src/components/Card.tsx" })).toBe("Renaming Card.tsx");
});

test("getToolLabel: file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "src/components/Card.tsx" })).toBe("Deleting Card.tsx");
});

test("getToolLabel: unknown tool falls back to toolName", () => {
  expect(getToolLabel("some_other_tool", { command: "create", path: "src/foo.tsx" })).toBe("some_other_tool");
});

test("getToolLabel: path with no slashes uses path as filename", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "App.tsx" })).toBe("Creating App.tsx");
});

test("getToolLabel: missing path falls back to toolName for str_replace_editor unknown command", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "" })).toBe("str_replace_editor");
});

// --- ToolCallBadge rendering tests ---

test("ToolCallBadge renders label correctly", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/components/Card.tsx" }}
      state="result"
      result="Success"
    />
  );

  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});

test("ToolCallBadge shows green dot when done", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/components/Card.tsx" }}
      state="result"
      result="Success"
    />
  );

  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows spinner when in progress (call state)", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/components/Card.tsx" }}
      state="call"
    />
  );

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows spinner when in partial-call state", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/components/Card.tsx" }}
      state="partial-call"
    />
  );

  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows spinner when result state but no result value", () => {
  const { container } = render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "src/components/Card.tsx" }}
      state="result"
      result={undefined}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "src/components/OldCard.tsx" }}
      state="result"
      result={{ success: true }}
    />
  );

  expect(screen.getByText("Deleting OldCard.tsx")).toBeDefined();
});
