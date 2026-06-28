import { describe, expect, it } from "vitest"
import {
  BROKER_PRESETS,
  computeBrokerFeeUSD,
  getBrokerPreset,
  listBrokerPresetsForCountry,
} from "./broker-presets"

describe("broker presets", () => {
  it("finds a preset by id", () => {
    const preset = getBrokerPreset("hapi-colombia")
    expect(preset).toBeDefined()
    expect(preset?.name).toBe("Hapi")
    expect(preset?.depositFee).toEqual({ type: "percentage", value: "0.009" })
  })

  it("returns undefined for unknown preset", () => {
    expect(getBrokerPreset("unknown")).toBeUndefined()
  })

  it("lists presets by country", () => {
    const colombian = listBrokerPresetsForCountry("co")
    expect(colombian.map((p) => p.id)).toContain("hapi-colombia")
    expect(colombian.map((p) => p.id)).toContain("trii-colombia")
    expect(colombian.map((p) => p.id)).not.toContain("gbm-mexico")
  })

  it("computes percentage deposit fee", () => {
    expect(computeBrokerFeeUSD("1000", { type: "percentage", value: "0.009" })).toBe("9.00")
  })

  it("computes flat withdrawal fee", () => {
    expect(computeBrokerFeeUSD("1000", { type: "flat", value: "5" })).toBe("5.00")
  })

  it("returns zero for none fee type", () => {
    expect(computeBrokerFeeUSD("1000", { type: "none", value: "0" })).toBe("0.00")
  })

  it("returns null for invalid net amount", () => {
    expect(computeBrokerFeeUSD("", { type: "percentage", value: "0.009" })).toBeNull()
  })

  it("has no duplicate preset ids", () => {
    const ids = BROKER_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
