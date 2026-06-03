# -*- coding: utf-8 -*-
from peter_identity import (
    BOOT_BANNER,
    get_greeting,
    detect_domain_and_get_prompt,
    format_response_luxury,
    PETER_CONFIG
)

# ============================================================
#   PETER AI v2.0 — Complete System Final
#   Self-Heal + Code Engine + CrewAI + Voice + Vision + Memory
# ============================================================

from dotenv import load_dotenv
from quantex_module import run_quantex_menu
import os
import sys
import warnings
warnings.filterwarnings("ignore", category=ResourceWarning)

load_dotenv()

from config import (
    USER_NAME,
    ANTHROPIC_KEY,
    ELEVENLABS_KEY,
    ELEVENLABS_VOICE,
    OLLAMA_URL,
    LOCAL_MODE,
    BASE_DIR,
    DATA_DIR,
    OUTPUT_DIR,
    MEMORY_DIR,
    FACES_DIR,
    LOGS_DIR
)

ANTHROPIC_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
ELEVENLABS_KEY   = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE = os.getenv("ELEVENLABS_VOICE_ID", "TIXYCOMzK2Vw9OZovSLs")
OLLAMA_URL       = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LOCAL_MODE       = os.getenv("LOCAL_MODE", "false").lower() == "true"
USER_NAME        = os.getenv("USER_NAME", "Sir")

if not LOCAL_MODE and not ANTHROPIC_KEY:
    print("ERROR: ANTHROPIC_API_KEY tidak ditemukan!")
    sys.exit(1)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
MEMORY_DIR.mkdir(parents=True, exist_ok=True)
FACES_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Self-Heal ─────────────────────────────────────────────
try:
    from peter_self_heal import PeterSelfHeal
    healer  = PeterSelfHeal()
    HEAL_OK = True
    print("[PETER] Self-Heal OK!")
except Exception as e:
    HEAL_OK = False
    healer  = None
    print(f"[PETER] Self-Heal tidak aktif: {e}")

# ── Vision ────────────────────────────────────────────────
try:
    from peter_vision import PeterVision
    vision    = PeterVision()
    VISION_OK = True
    print("[PETER] Vision OK!")
except Exception as e:
    VISION_OK = False
    vision    = None
    print(f"[PETER] Vision tidak aktif: {e}")

# ── Memory ────────────────────────────────────────────────
try:
    from peter_memory import PeterMemory
    memory    = PeterMemory()
    MEMORY_OK = True
    print("[PETER] Memory OK!")
except Exception as e:
    MEMORY_OK = False
    memory    = None
    print(f"[PETER] Memory tidak aktif: {e}")


# ============================================================
# VOICE OUTPUT
# ============================================================
def peter_speak(text: str, play: bool = True):
    """PETER berbicara — pakai peter_tts engine"""
    try:
        from peter_tts import peter_speak as tts_speak
        tts_speak(text, play=play)
    except Exception as e:
        print(f"[TTS] Error: {e}")
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.say(text[:200])
            engine.runAndWait()
        except Exception:
            pass


# ============================================================
# VOICE INPUT
# ============================================================
def peter_listen(duration: int = 7):
    try:
        import sounddevice as sd
        import scipy.io.wavfile as wavfile
        import tempfile
        import whisper

        if not hasattr(peter_listen, '_model'):
            print("[PETER] Loading Whisper large-v3...")
            peter_listen._model = whisper.load_model("large-v3")
            print("[PETER] Whisper siap!")

        model       = peter_listen._model
        sample_rate = 16000

        print(f"\n[PETER] Mendengarkan {duration} detik...")
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate = sample_rate,
            channels   = 1,
            dtype      = 'float32'
        )
        sd.wait()
        print("[PETER] Memproses suara...")

        with tempfile.NamedTemporaryFile(
            suffix='.wav', delete=False
        ) as f:
            tmp = f.name
        wavfile.write(tmp, sample_rate, audio.flatten())

        result = model.transcribe(
            tmp,
            language                   = "id",
            fp16                       = True,
            beam_size                  = 5,
            best_of                    = 5,
            temperature                = 0.0,
            condition_on_previous_text = True,
            initial_prompt             = "Perintah Bahasa Indonesia untuk PETER."
        )
        os.unlink(tmp)

        text = result["text"].strip()
        if text:
            print(f"[{USER_NAME}] (suara) -> {text}")
            return text
        return None

    except Exception as e:
        print(f"[PETER] Voice error: {e}")
        return None


def peter_wait_wakeword():
    try:
        import sounddevice as sd
        import scipy.io.wavfile as wavfile
        import tempfile
        import numpy as np
        import whisper

        if not hasattr(peter_wait_wakeword, '_model'):
            print("[PETER] Loading wake word model...")
            peter_wait_wakeword._model = whisper.load_model("small")

        model       = peter_wait_wakeword._model
        sample_rate = 16000
        wake_words  = [
            "hey peter", "hi peter", "hei peter",
            "peter", "hai peter", "hey piter"
        ]

        print("\n[PETER] Menunggu 'Hey Peter'... (Ctrl+C untuk skip)\n")

        while True:
            try:
                print(".", end="", flush=True)
                audio = sd.rec(
                    int(3 * sample_rate),
                    samplerate = sample_rate,
                    channels   = 1,
                    dtype      = 'float32'
                )
                sd.wait()

                if np.abs(audio).mean() < 0.005:
                    continue

                with tempfile.NamedTemporaryFile(
                    suffix='.wav', delete=False
                ) as f:
                    tmp = f.name
                wavfile.write(tmp, sample_rate, audio.flatten())

                result = model.transcribe(
                    tmp,
                    language    = "id",
                    fp16        = True,
                    beam_size   = 3,
                    temperature = 0.0
                )
                os.unlink(tmp)

                text = result["text"].strip().lower()
                if text:
                    print(f"\n[Terdengar] {text}")

                if any(w in text for w in wake_words):
                    print("\n[PETER] Wake word!")
                    peter_speak(f"Ya {USER_NAME}, saya siap!")
                    return True

            except Exception:
                pass

    except KeyboardInterrupt:
        print("\n[PETER] Skip — mode ketik aktif.")
        return False


# ============================================================
# CHAT
# ============================================================
def chat_peter(message: str,
               use_memory: bool = True) -> str:
    """Chat dengan PETER Brain — routing ke prompt spesialis"""
    try:
        from core.brain import PeterBrain
        if not hasattr(chat_peter, '_brain'):
            chat_peter._brain = PeterBrain()
        return chat_peter._brain.think(
            message, use_memory=use_memory
        )
    except Exception as e:
        print(f"[BRAIN] Fallback ke direct Claude: {e}")
        import anthropic
        client   = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        response = client.messages.create(
            model      = "claude-sonnet-4-6",
            max_tokens = 4096,
            system     = f"Kamu adalah PETER, asisten AI milik {USER_NAME}. Jawab dalam Bahasa Indonesia.",
            messages   = [{"role": "user", "content": message}]
        )
        return response.content[0].text


# ============================================================
# MODE 1 — PETER EXECUTOR (Code Engine Level 2)
# ============================================================
def run_peter_executor():
    global USER_NAME, MEMORY_OK, HEAL_OK, VISION_OK
    global memory, healer, vision
    print("\n[PETER] Peter Executor aktif!")
    print("[PETER] Ketik 'exit' untuk kembali.")
    print("[PETER] Tips:")
    print("  'auto: [task]'   — jalankan tanpa konfirmasi")
    print("  'buat app [desc]'— buat aplikasi lengkap")
    print("  'memory stats'   — cek memory")
    print("  'ingat [teks]'   — simpan ke memory\n")

    peter_speak(f"Halo {USER_NAME}! Peter Executor siap.")

    bukan_kode = [
        "script video", "script youtube", "script tiktok",
        "script instagram", "script podcast", "script konten",
        "buat script", "tulis script", "script perdana",
        "script minggu", "strategi", "analisis", "saran",
        "bagaimana", "kenapa", "apa itu", "jelaskan",
        "ceritakan", "rekomendasikan"
    ]

    kata_kode = [
        "buat file", "buat grafik", "buat chart",
        "buat app", "buat program", "buat api",
        "buat web", "buat dashboard", "buat tool",
        "buat aplikasi", "tulis kode", "jalankan",
        "hitung", "kalkulasi", "plot", "analisis data",
        "download", "scrape", "automasi"
    ]

    while True:
        try:
            user_input = input(f"\n[{USER_NAME}] -> ").strip()

            if not user_input:
                continue

            if user_input.lower() in ["exit", "keluar", "quit"]:
                print("[PETER] Kembali ke menu.")
                break

            # Perintah khusus memory
            if user_input.lower() == "memory stats":
                if MEMORY_OK:
                    stats = memory.get_stats()
                    print("\n[MEMORY] Statistik:")
                    for k, v in stats.items():
                        print(f"  {k}: {v}")
                continue

            if user_input.lower().startswith("ingat "):
                to_remember = user_input[6:].strip()
                if MEMORY_OK and to_remember:
                    memory.add_long_term(
                        to_remember, category="important"
                    )
                    memory.add_episode(
                        title      = "Catatan penting",
                        summary    = to_remember,
                        importance = 5
                    )
                    print(f"[PETER] Tersimpan: '{to_remember}'")
                    peter_speak("Baik, saya akan ingat itu.")
                continue

            # ── Tentukan mode ────────────────────────────
            bukan_kode = [
                "script video", "script youtube", "script tiktok",
                "script instagram", "script podcast", "script konten",
                "buat script", "tulis script", "script perdana",
                "script minggu", "strategi", "analisis", "saran",
                "bagaimana", "kenapa", "apa itu", "jelaskan"
            ]
            kata_kode_list = [
                "buat file", "buat grafik", "buat chart",
                "buat app", "buat program", "buat api",
                "buat web", "buat dashboard", "buat tool",
                "buat aplikasi", "tulis kode", "jalankan",
                "hitung", "plot", "analisis data",
                "download", "scrape", "automasi"
            ]
            is_bukan_kode = any(b in user_input.lower() for b in bukan_kode)
            butuh_kode    = any(k in user_input.lower() for k in kata_kode_list)
            if is_bukan_kode:
                butuh_kode = False

            is_script = any(k in user_input.lower() for k in [
                "script video", "script youtube", "buat script",
                "script perdana", "script minggu", "script konten"
            ])

            is_app = any(k in user_input.lower() for k in [
                "buat app", "buat aplikasi", "create app"
            ])

            is_video_prompt = any(k in user_input.lower() for k in [
                "buat video prompt", "runway prompt",
                "kling prompt", "video ai prompt"
            ])

            # Mode auto
            auto_mode = False

            # Mode auto
            auto_mode = False
            task      = user_input
            if user_input.lower().startswith("auto:"):
                auto_mode = True
                task      = user_input[5:].strip()
                print("[PETER] Mode auto — langsung jalankan!")


            if is_app:
                peter_speak("Baik, saya akan buat aplikasinya.")
                from core.oi_engine import create_app
                app_desc = (
                    task
                    .replace("buat app", "")
                    .replace("buat aplikasi", "")
                    .replace("create app", "")
                    .strip()
                )
                result = create_app(app_desc)
                if result["success"]:
                    peter_speak("Aplikasi berhasil dibuat!")
                    print("\n[PETER] ✅ Aplikasi selesai!")
                else:
                    peter_speak("Maaf, aplikasi gagal dibuat.")
                continue

            # Cek butuh kode
            butuh_kode = any(
                k in user_input.lower() for k in kata_kode
            )

            if butuh_kode:
                peter_speak("Baik, saya kerjakan sekarang.")
                from core.oi_engine import run_with_auto_fix
                result = run_with_auto_fix(
                    task        = task,
                    auto_run    = auto_mode,
                    max_retries = 3
                )
                if result["success"]:
                    msg = f"Selesai dalam {result['attempts']} percobaan!"
                    print(f"\n[PETER] ✅ {msg}")
                    peter_speak(msg)
                    if MEMORY_OK and memory:
                        memory.add_long_term(
                            f"Task: {task}\nOutput: {result['output'][:200]}",
                            category = "code_execution"
                        )
                else:
                    peter_speak("Maaf, task gagal. Coba perintah yang lebih spesifik.")

               # Cek video generation intent
            video_keywords = [
                "buat video prompt", "runway prompt",
                "kling prompt", "video ai prompt",
                "generate video prompt"
            ]
            is_video_prompt = any(
                k in user_input.lower()
                for k in video_keywords
            )

            if is_video_prompt:
                from core.brain import PeterBrain
                brain  = PeterBrain()
                result = brain.generate_video_prompt(user_input)
                print(f"\n[PETER] Video Prompt:\n")
                print(result.get("raw", ""))
                peter_speak("Video prompt sudah siap!")
                continue     

            else:
                print("\n[PETER] Berpikir...\n")
                response = chat_peter(user_input, use_memory=True)
                print(f"[PETER] {response}\n")
                peter_speak(response[:400])

        except KeyboardInterrupt:
            print("\n[PETER] Kembali ke menu.")
            break
        except Exception as e:
            print(f"[ERROR] {e}")


# ============================================================
# MODE 2 — CREWAI
# ============================================================
def run_crewai(task_description: str = None):
    global USER_NAME, MEMORY_OK, memory
    print("\n[PETER] Memulai CrewAI Multi-Agent...")

    try:
        from crewai import Agent, Task, Crew, LLM

        if LOCAL_MODE:
            llm = LLM(
                model    = "ollama/llama3.3",
                base_url = OLLAMA_URL
            )
            llm_fast = LLM(
                model    = "ollama/llama3.2:3b",
                base_url = OLLAMA_URL
            )
        else:
            llm = LLM(
                model   = "anthropic/claude-sonnet-4-6",
                api_key = ANTHROPIC_KEY
            )
            llm_fast = LLM(
                model   = "anthropic/claude-haiku-4-5-20251001",
                api_key = ANTHROPIC_KEY
            )

        manager = Agent(
            role      = "PETER Manager",
            goal      = "Koordinasi semua agent untuk hasil terbaik",
            backstory  = f"AI manager milik {USER_NAME}.",
            llm       = llm,
            verbose   = True
        )
        researcher = Agent(
            role      = "Research Specialist",
            goal      = "Cari informasi akurat dan terkini",
            backstory  = "Expert researcher.",
            llm       = llm,
            verbose   = True
        )
        writer = Agent(
            role      = "Content Writer",
            goal      = "Tulis konten viral yang engaging",
            backstory  = "Penulis konten profesional.",
            llm       = llm,
            verbose   = True
        )
        analyst = Agent(
            role      = "Data Analyst",
            goal      = "Analisis data dan berikan insight",
            backstory  = "Data analyst berpengalaman.",
            llm       = llm_fast,
            verbose   = True
        )
        strategist = Agent(
            role      = "Digital Strategist",
            goal      = "Buat strategi monetisasi terbaik",
            backstory  = "Expert digital marketing.",
            llm       = llm,
            verbose   = True
        )

        if not task_description:
            print("\n  Agents: Manager, Researcher, Writer, Analyst, Strategist\n")
            task_description = input(
                f"[{USER_NAME}] Task -> "
            ).strip()

        if not task_description:
            return

        td = task_description.lower()
        if any(w in td for w in ["riset","cari","informasi"]):
            primary = researcher
        elif any(w in td for w in ["tulis","script","konten","youtube"]):
            primary = writer
        elif any(w in td for w in ["analisis","data","statistik"]):
            primary = analyst
        elif any(w in td for w in ["strategi","marketing","monetisasi"]):
            primary = strategist
        else:
            primary = manager

        task = Task(
            description     = f"{task_description}\n\nGunakan Bahasa Indonesia. Berikan hasil LENGKAP dan ACTIONABLE.",
            agent           = primary,
            expected_output = "Hasil lengkap dalam Bahasa Indonesia"
        )
        crew = Crew(
            agents  = [manager, researcher, writer, analyst, strategist],
            tasks   = [task],
            verbose = True
        )

        print(f"\n[PETER] Tim bekerja untuk {USER_NAME}...")
        peter_speak("Tim agent sedang bekerja.")
        result = crew.kickoff()

        print("\n" + "=" * 60)
        print("  HASIL TIM PETER:")
        print("=" * 60)
        print(result)
        print("=" * 60)

        output_file = "C:\\peter-ai\\crew_output.txt"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"Task: {task_description}\n\n{str(result)}")
        print(f"\n[PETER] Disimpan: {output_file}")

        if MEMORY_OK and memory:
            memory.add_episode(
                title      = f"CrewAI: {task_description[:50]}",
                summary    = str(result)[:300],
                importance = 3
            )
        peter_speak("Tim selesai bekerja.")

    except ImportError as e:
        print(f"[ERROR] {e}")
    except Exception as e:
        print(f"[ERROR] {e}")


# ============================================================
# MODE 3 — COMBINED
# ============================================================
def run_combined():
    global USER_NAME
    print("\n[PETER] Mode Gabungan aktif!\n")
    task = input(f"[{USER_NAME}] Task -> ").strip()
    if not task:
        return
    print("\n[PETER] Step 1: Riset CrewAI...")
    peter_speak("Memulai riset.")
    run_crewai(
        task_description = f"Riset dan buat rencana untuk: {task}"
    )
    print("\n[PETER] Step 2: Eksekusi...")
    peter_speak("Masuk mode eksekusi.")
    run_peter_executor()


# ============================================================
# MODE 4 — VOICE MODE
# ============================================================
def run_peter_executor_voice():
    global USER_NAME, MEMORY_OK, memory
    print("\n[PETER] Voice Mode aktif!")
    print("[PETER] Ucapkan 'keluar' untuk berhenti.\n")

    kata_kode = [
        "buat", "buat file", "buat grafik",
        "tulis kode", "jalankan", "hitung",
        "generate", "create", "plot"
    ]

    peter_speak(f"Voice mode aktif. Halo {USER_NAME}!")

    while True:
        try:
            peter_speak("Silakan bicara.")
            user_input = peter_listen(duration=7)

            if not user_input:
                user_input = input(
                    f"[{USER_NAME}] (ketik) -> "
                ).strip()

            if not user_input:
                continue

            if any(w in user_input.lower() for w in
                   ["exit", "keluar", "quit", "stop"]):
                peter_speak("Kembali ke menu.")
                break

            butuh_kode = any(
                k in user_input.lower() for k in kata_kode
            )

            if butuh_kode:
                peter_speak("Baik, saya kerjakan.")
                from core.oi_engine import run_with_auto_fix
                result = run_with_auto_fix(
                    task        = user_input,
                    auto_run    = True,
                    max_retries = 3
                )
                if result["success"]:
                    peter_speak("Selesai!")
                else:
                    peter_speak("Maaf, gagal. Coba lagi.")
            else:
                response = chat_peter(user_input, use_memory=True)
                print(f"\n[PETER] {response}\n")
                peter_speak(response[:400])

        except KeyboardInterrupt:
            peter_speak("Sampai jumpa!")
            break
        except Exception as e:
            print(f"[ERROR] {e}")


# ============================================================
# MODE 5 — VISION MODE
# ============================================================
def run_vision_mode():
    global USER_NAME, VISION_OK, vision, MEMORY_OK, memory
    if not VISION_OK:
        print("[PETER] Vision tidak aktif!")
        return

    print("\n[PETER] Vision Mode:")
    print("  [1] Analisis lengkap")
    print("  [2] Monitor background")
    print("  [3] Daftarkan wajah baru")
    print("  [4] Kembali\n")

    pilihan = input("[PETER] Pilih (1-4): ").strip()

    if pilihan == "1":
        print("\n[PETER] Menganalisis...")
        peter_speak("Menganalisis kamera.")
        result  = vision.capture_and_analyze()
        laporan = vision.format_result(result)
        print(f"\n[PETER] {laporan}")
        peter_speak(laporan)
        if MEMORY_OK and memory:
            memory.add_long_term(
                f"Vision: {laporan}", category="vision"
            )

    elif pilihan == "2":
        print("\n[PETER] Monitor aktif... Ctrl+C untuk berhenti\n")
        peter_speak("Monitor kamera aktif.")

        def on_face(name):
            msg = f"Saya melihat {name}"
            print(f"\n[VISION] {msg}")
            peter_speak(msg)

        def on_gesture(gesture):
            g = {
                "thumbs_up": "jempol ke atas",
                "open_hand": "tangan terbuka",
                "fist"     : "tinju",
                "pointing" : "menunjuk",
                "peace"    : "peace"
            }.get(gesture, gesture)
            print(f"\n[VISION] Gesture: {g}")

        def on_emotion(emotion):
            e = {
                "happy"  : "senang",
                "sad"    : "sedih",
                "angry"  : "marah",
                "neutral": "normal"
            }.get(emotion, emotion)
            print(f"\n[VISION] Emosi: {e}")

        vision.start_monitor(
            on_face    = on_face,
            on_gesture = on_gesture,
            on_emotion = on_emotion
        )
        try:
            while True:
                __import__('time').sleep(1)
        except KeyboardInterrupt:
            vision.stop_monitor()
            print("\n[PETER] Monitor berhenti.")

    elif pilihan == "3":
        nama = input("\n[PETER] Nama wajah baru: ").strip()
        if nama:
            vision.register_face(nama, num_photos=5)

    elif pilihan == "4":
        return


# ============================================================
# BANNER
# ============================================================
from peter_identity import BOOT_BANNER, get_greeting
print(BOOT_BANNER)
print(get_greeting(USER_NAME))
# ============================================================
# MENU UTAMA
# ============================================================
def show_menu():
    if MEMORY_OK and memory:
        try:
            stats = memory.get_stats()
            print(f"\n  Memori  : {stats.get('long_term_count',0)} long term | {stats.get('episodes_count',0)} episodes")
        except Exception:
            pass

    print("\n" + "─" * 55)
    print("  PETER AI v2.0 — Command Center")
    print("─" * 55)
    print("  [1]  Chat & Execute Code   (Peter Executor)")
    print("  [2]  Multi-Agent Team      (CrewAI)")
    print("  [3]  Mode Gabungan         (Executor + CrewAI)")
    print("  [4]  Voice Mode            (Hey Peter!)")
    print("  [5]  Vision Mode           (Wajah & Gesture)")
    print("  [6]  Self-Diagnose         (Monitor & Fix)")
    print("  [7]  Script Writer         (YouTube Long-Form)")
    print("  [8]  Content Automation    (Full Pipeline Auto)")
    print("  [9]  Quantex Trading       (Signal + Portfolio)")
    print("  [10] App Builder V2        (Web+API+Bot+Deploy)")
    print("  [11] Master Prompt Engine  (OODA+SWOT+VUCA+E2E)")
    print("  [0]  Keluar")
    print("─" * 55)


if __name__ == "__main__":
    while True:
        try:
            show_menu()
            pilihan = input(f"\n[{USER_NAME}] Pilih (0-11): ").strip()

            if pilihan == "1":
                run_peter_executor()

            elif pilihan == "2":
                run_crewai()

            elif pilihan == "3":
                run_combined()

            elif pilihan == "4":
                use_wake = input("[PETER] Pakai wake word 'Hey Peter'? (y/n): ").strip().lower()
                if use_wake == 'y':
                    if peter_wait_wakeword():
                        run_peter_executor_voice()
                else:
                    run_peter_executor_voice()

            elif pilihan == "5":
                run_vision_mode()

            elif pilihan == "6":
                if HEAL_OK and healer:
                    print("\n[PETER] Self-Diagnose...")
                    report = healer.diagnose()
                    print(report)
                else:
                    print("[PETER] Self-Heal tidak aktif!")

            elif pilihan == "7":
                try:
                    from content.script_writer import run_script_writer
                    run_script_writer()
                except Exception as e:
                    print(f"[ERROR] Script Writer: {e}")

            elif pilihan == "8":
                try:
                    from content.pipeline import run_content_pipeline
                    run_content_pipeline()
                except Exception as e:
                    print(f"[ERROR] Content Pipeline: {e}")

            elif pilihan == "9":
                try:
                    run_quantex_menu()
                except Exception as e:
                    print(f"[ERROR] Quantex: {e}")

            elif pilihan == "10":
                try:
                    from peter_app_builder_v2 import run_app_builder_v2
                    run_app_builder_v2()
                except Exception as e:
                    print(f"[ERROR] App Builder: {e}")

            elif pilihan == "11":
                try:
                    from peter_master_prompt import run_master_prompt
                    run_master_prompt()
                except Exception as e:
                    print(f"[ERROR] Master Prompt: {e}")

            elif pilihan == "0":
                peter_speak(f"Sampai jumpa {USER_NAME}. PETER offline.")
                print(f"\n[PETER] Sampai jumpa, {USER_NAME}!")
                print("[PETER] Semua sistem offline.\n")
                break

            else:
                print("[PETER] Pilihan tidak valid. Ketik 0-11.")

        except KeyboardInterrupt:
            print(f"\n\n[PETER] Sampai jumpa, {USER_NAME}!")
            break
        except Exception as e:
            print(f"[ERROR] {e}")