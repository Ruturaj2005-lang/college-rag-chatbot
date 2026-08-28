import os
import sys
import subprocess
import threading
import signal
import time

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

processes = []


def stream_output(process, prefix, color_code):
    reset_code = "\033[0m"
    try:
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            print(f"{color_code}[{prefix}]{reset_code} {line.rstrip()}")
    except Exception:
        pass


def terminate_all(sig=None, frame=None):
    print("\n\033[33m[SHUTDOWN] Stopping both Backend and Frontend processes...\033[0m")
    for p in processes:
        try:
            if sys.platform == "win32":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except Exception:
            pass
    print("\033[32m[SHUTDOWN] All servers stopped cleanly.\033[0m")
    sys.exit(0)


def main():
    print("=" * 70)
    print("\033[36m🎓 LAUNCHING RAG-BASED COLLEGE CHATBOT (FULL STACK)\033[0m")
    print("=" * 70)
    print("  • Backend API  : \033[32mhttp://localhost:8000\033[0m (Docs: \033[34mhttp://localhost:8000/docs\033[0m)")
    print("  • Frontend UI  : \033[35mhttp://localhost:5173\033[0m")
    print("  • Demo Student : \033[33mstudent@college.edu / Student@123456\033[0m")
    print("  • Demo Admin   : \033[33madmin@college.edu   / Admin@123456\033[0m")
    print("=" * 70)
    print("Press \033[31mCtrl+C\033[0m at any time to stop both servers.\n")

    # Register signal handlers for clean exit
    signal.signal(signal.SIGINT, terminate_all)
    signal.signal(signal.SIGTERM, terminate_all)

    # 1. Start Backend (Uvicorn)
    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = BACKEND_DIR

    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=BACKEND_DIR,
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(backend_proc)

    # 2. Start Frontend (Vite)
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(frontend_proc)

    # Start output streaming threads with colors
    # Cyan for backend (\033[36m), Magenta for frontend (\033[35m)
    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", "\033[36m"), daemon=True)
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND", "\033[35m"), daemon=True)

    t1.start()
    t2.start()

    # Wait for either process to terminate
    try:
        while True:
            time.sleep(0.5)
            if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                terminate_all()
    except KeyboardInterrupt:
        terminate_all()


if __name__ == "__main__":
    main()
