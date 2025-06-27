import whisper

model = whisper.load_model("base")  # Use "small" or "medium" for better accuracy
result = model.transcribe("input.mp3")

with open("transcript.txt", "w", encoding="utf-8") as f:
    f.write(result["text"])

print("✅ Transcription completed.")
