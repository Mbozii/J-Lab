import subprocess
from pathlib import Path
import shutil
import re


def separate_audio(audio_file, progress_callback=None):

    # Get information about the audio file
    audio_path = Path(audio_file)
    song_name = audio_path.stem

    print(f"Processing: {song_name}")

    # Run Demucs
    process = subprocess.Popen(
        [
            "python",
            "-m",
            "demucs",
            "--two-stems=vocals",
            str(audio_path)
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Read Demucs output while it is running
    for line in process.stdout:

        print(line, end="")

        # Look for a percentage such as 42%
        match = re.search(r"(\d+)%", line)

        if match and progress_callback:

            progress = int(match.group(1))

            progress_callback(progress)

    process.wait()

    # Check if Demucs was successful
    if process.returncode != 0:
        raise RuntimeError("Demucs failed to separate the audio.")

    # Make sure progress reaches 100%
    if progress_callback:
        progress_callback(100)

    # Where Demucs saves the instrumental
    demucs_output = (
        Path("separated")
        / "htdemucs"
        / song_name
        / "no_vocals.wav"
    )

    # Check that Demucs actually created the file
    if not demucs_output.exists():
        raise FileNotFoundError(
            f"Demucs output was not found: {demucs_output}"
        )

    # Create our own output folder
    output_folder = Path("separated") / song_name
    output_folder.mkdir(parents=True, exist_ok=True)

    # New filename
    output_file = output_folder / f"{song_name} - Instrumental.wav"

    # Move and rename the instrumental
    shutil.move(
        str(demucs_output),
        str(output_file)
    )

    print("Vocal separation complete")
    print(f"Saved to: {output_file}")

    # Delete temporary uploaded audio
    audio_path.unlink()

    print(f"Deleted temporary file: {audio_path}")

    return output_file