import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import { type ToolInvocation } from "ai";

describe("getToolLabel", () => {
  it("str_replace_editor create", () => {
    expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
  });

  it("str_replace_editor str_replace", () => {
    expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/components/Card.jsx" })).toBe("Editing Card.jsx");
  });

  it("str_replace_editor insert", () => {
    expect(getToolLabel("str_replace_editor", { command: "insert", path: "/utils.ts" })).toBe("Editing utils.ts");
  });

  it("str_replace_editor view", () => {
    expect(getToolLabel("str_replace_editor", { command: "view", path: "/index.tsx" })).toBe("Viewing index.tsx");
  });

  it("str_replace_editor undo_edit", () => {
    expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit to App.jsx");
  });

  it("file_manager rename with new_path", () => {
    expect(getToolLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming old.jsx to new.jsx");
  });

  it("file_manager delete", () => {
    expect(getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting App.jsx");
  });

  it("unknown tool returns raw toolName", () => {
    expect(getToolLabel("unknown_tool", { command: "foo", path: "/bar.tsx" })).toBe("unknown_tool");
  });

  it("missing command falls back to toolName", () => {
    expect(getToolLabel("str_replace_editor", { path: "/App.jsx" })).toBe("str_replace_editor");
  });

  it("missing path falls back to toolName", () => {
    expect(getToolLabel("str_replace_editor", { command: "create" })).toBe("str_replace_editor");
  });
});

describe("ToolCallBadge", () => {
  it("shows spinner when state is call", () => {
    const invocation = {
      toolCallId: "1",
      toolName: "str_replace_editor",
      args: { command: "create", path: "/App.jsx" },
      state: "call",
    } as ToolInvocation;

    render(<ToolCallBadge toolInvocation={invocation} />);
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    // Spinner is present (no green dot)
    expect(screen.queryByText("●")).toBeNull();
  });

  it("shows green dot when state is result with truthy result", () => {
    const invocation = {
      toolCallId: "1",
      toolName: "str_replace_editor",
      args: { command: "create", path: "/App.jsx" },
      state: "result",
      result: "ok",
    } as ToolInvocation;

    const { container } = render(<ToolCallBadge toolInvocation={invocation} />);
    const { getByText } = within(container);
    expect(getByText("Creating App.jsx")).toBeDefined();
    const dot = container.querySelector(".bg-emerald-500");
    expect(dot).not.toBeNull();
  });
});
