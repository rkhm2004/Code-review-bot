'use client';

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

export default function AnimatedBackground() {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options: ISourceOptions = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 120,
    interactivity: {
      events: {
        onHover: { enable: true, mode: "grab" },
      },
      modes: {
        grab: { distance: 140, links: { opacity: 0.5 } },
      },
    },
    particles: {
      color: { value: "#0ea5e9" },
      links: {
        color: "#0ea5e9",
        distance: 150,
        enable: true,
        opacity: 0.2,
        width: 1,
      },
      move: {
        enable: true,
        speed: 0.6,
      },
      number: { value: 80 },
      opacity: { value: 0.3 },
      size: { value: { min: 1, max: 3 } },
    },
  }), []);

  if (!init) return null;

  return (
    <div className="fixed inset-0 z-0">
      <Particles id="tsparticles" options={options} />
    </div>
  );
}