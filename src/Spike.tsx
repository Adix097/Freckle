import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const call = (cmd: string, args?: object) =>
  invoke<Record<string, unknown>>("plugin:player|call", { cmd, args });

export default function Spike() {
  const [id, setId] = useState("FGBhQbmPwH8");
  const [out, setOut] = useState("");
  if (!navigator.userAgent.includes("Android")) return null;

  const run = async (cmd: string, args?: object) => {
    setOut(`${cmd}…`);
    try {
      setOut(JSON.stringify(await call(cmd, args)));
    } catch (e) {
      setOut(`ERROR: ${String(e)}`);
    }
  };

  const b = "rounded-full bg-bone px-3 py-1 font-bold text-ink";
  return (
    <div className="fixed bottom-24 left-2 z-50 w-72 rounded-xl bg-graphite p-2 text-xs">
      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="mb-2 w-full rounded bg-ink px-2 py-1"
      />
      <div className="mb-2 flex flex-wrap gap-1">
        <button
          className={b}
          onClick={() =>
            run("play", { id, title: "Spike test", artist: "Freckle" })
          }
        >
          Play
        </button>
        <button className={b} onClick={() => run("pause")}>
          Pause
        </button>
        <button className={b} onClick={() => run("resume")}>
          Resume
        </button>
        <button className={b} onClick={() => run("stop")}>
          Stop
        </button>
        <button className={b} onClick={() => run("state")}>
          State
        </button>
      </div>
      <div className="break-all text-ash">{out}</div>
    </div>
  );
}
