import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/stateful-button";

describe("StatefulButton", () => {
  it("点击时先执行实际业务回调，装饰动画不能阻塞提交", async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>搜索</Button>);

    await userEvent.click(screen.getByRole("button", { name: "搜索" }));

    await waitFor(() => {
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  it("在严格模式重复执行 effect 后仍能结束加载状态", async () => {
    render(
      <StrictMode>
        <Button onClick={() => undefined}>搜索</Button>
      </StrictMode>,
    );

    const button = screen.getByRole("button", { name: "搜索" });
    await userEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute("aria-busy", "false");
      expect(button).toBeEnabled();
    });
  });
});
