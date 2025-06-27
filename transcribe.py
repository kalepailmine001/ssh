import whisper

model = whisper.load_model("base")  # Or "small", "medium", etc.
result = model.transcribe("input.mp3")

with open("transcript.txt", "w", encoding="utf-8") as f:
    f.write(result["text"])

print("✅ Transcription complete.")
