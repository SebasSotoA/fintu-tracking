import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer"

describe("Drawer", () => {
  it("renders trigger and content with header, title, description, and footer", () => {
    render(
      <Drawer open>
        <DrawerTrigger asChild>
          <button type="button">Open</button>
        </DrawerTrigger>
        <DrawerContent data-testid="drawer-content">
          <DrawerHeader>
            <DrawerTitle>Title</DrawerTitle>
            <DrawerDescription>Description</DrawerDescription>
          </DrawerHeader>
          <p>Body</p>
          <DrawerFooter>
            <DrawerClose asChild>
              <button type="button">Close</button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    )

    expect(screen.getByRole("button", { name: "Open", hidden: true })).toBeInTheDocument()
    expect(screen.getByTestId("drawer-content")).toHaveTextContent("Title")
    expect(screen.getByTestId("drawer-content")).toHaveTextContent("Description")
    expect(screen.getByTestId("drawer-content")).toHaveTextContent("Body")
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument()
  })

  it("uses card glass instead of opaque page background", () => {
    render(
      <Drawer open>
        <DrawerContent data-testid="drawer-content">
          <DrawerTitle>Title</DrawerTitle>
          <DrawerDescription>Description</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    )

    const content = screen.getByTestId("drawer-content")
    expect(content).toHaveClass(
      "backdrop-blur-[12px]",
      "from-white/[0.07]",
      "to-card/90",
      "border-white/10",
    )
    expect(content.className).not.toMatch(/(?:^|\s)bg-background(?:\/\S+)?(?:\s|$)/)
  })

  it("skips glass when surface is opaque", () => {
    render(
      <Drawer open>
        <DrawerContent surface="opaque" data-testid="drawer-content">
          <DrawerTitle>Title</DrawerTitle>
          <DrawerDescription>Description</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    )

    const content = screen.getByTestId("drawer-content")
    expect(content).toHaveClass("bg-background", "text-foreground", "border-border")
    expect(content).not.toHaveClass("backdrop-blur-[12px]", "to-card/90", "from-white/[0.07]")
  })

  it("uses a frosted background when surface is frost", () => {
    render(
      <Drawer open>
        <DrawerContent surface="frost" data-testid="drawer-content">
          <DrawerTitle>Title</DrawerTitle>
          <DrawerDescription>Description</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    )

    const content = screen.getByTestId("drawer-content")
    expect(content).toHaveClass("bg-background/88", "backdrop-blur-[16px]", "text-foreground")
    expect(content).not.toHaveClass("bg-gradient-to-b", "to-card/90")
  })
})
