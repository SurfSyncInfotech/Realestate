// npm run dev  -> starts the API (port 4000) and the website (port 5173) together.
import { spawn } from "node:child_process";

const run = (name, workspace) => {
  const child = spawn("npm", ["run", "dev", "--workspace", workspace], { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.log(`[${name}] stopped (${code})`);
    process.exit(code ?? 0);
  });
  return child;
};

const children = [run("api", "backend"), run("web", "frontend")];
const stop = () => children.forEach((c) => c.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
