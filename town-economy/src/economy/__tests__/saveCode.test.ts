import { decodeSaveCode, encodeSaveCode } from "../saveCode";
import { initialState } from "../useEconomy";

describe("save code round trip", () => {
  it("decodes exactly what was encoded", () => {
    const state = { ...initialState(), townName: "Altın Kasaba - şşşğüçöı 😀🎉", cash: 1234.5 };
    const code = encodeSaveCode(state);
    const result = decodeSaveCode(code);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.townName).toBe(state.townName);
      expect(result.state.cash).toBe(state.cash);
    }
  });

  it("rejects a code missing the expected prefix", () => {
    const result = decodeSaveCode("not-a-real-code");
    expect(result).toEqual({ ok: false, reason: "format" });
  });

  it("rejects garbage after a valid prefix", () => {
    const result = decodeSaveCode("GTOWN1:%%%not-base64%%%");
    expect(result.ok).toBe(false);
  });

  it("rejects a save encoded with a different SAVE_VERSION", () => {
    const code = encodeSaveCode(initialState());
    // Flip a digit inside the encoded version field is fragile since it's
    // base64 — instead decode, tamper with the JSON, and re-encode by hand.
    const prefix = "GTOWN1:";
    const decoded = Buffer.from(code.slice(prefix.length), "base64").toString("utf8");
    const tampered = JSON.parse(decoded);
    tampered.version = tampered.version + 1;
    const reencoded = prefix + Buffer.from(JSON.stringify(tampered), "utf8").toString("base64");
    const result = decodeSaveCode(reencoded);
    expect(result).toEqual({ ok: false, reason: "version" });
  });
});
