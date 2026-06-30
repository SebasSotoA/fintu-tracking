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
})
