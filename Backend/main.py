from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import uuid

from StemSplitter import separate_audio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store jobs in memory
jobs = {}


@app.get("/")
def home():
    return {"message": "JVocal Lab backend is running"}


def process_audio(job_id, input_file):

    try:

        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 0

        print(f"Processing job: {job_id}")
        print(f"Input file: {input_file}")


        # Update progress from Demucs
        def update_progress(progress):

            jobs[job_id]["progress"] = progress

            print(f"Job {job_id}: {progress}%")


        output_file = separate_audio(
            input_file,
            progress_callback=update_progress
        )


        print(f"Demucs returned: {output_file}")
        print(f"Output exists: {Path(output_file).exists()}")


        jobs[job_id]["status"] = "complete"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["output_file"] = str(output_file)


    except Exception as e:

        print(f"ERROR processing job {job_id}:")
        print(f"{type(e).__name__}: {e}")

        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@app.post("/separate")
async def separate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):

    # Create uploads folder
    upload_folder = Path("uploads")
    upload_folder.mkdir(exist_ok=True)

    # Save uploaded file
    input_file = upload_folder / file.filename

    with open(input_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create unique job ID
    job_id = str(uuid.uuid4())

    # Store job information
    jobs[job_id] = {
        "status": "queued",
        "filename": file.filename
    }

    # Start Demucs in the background
    background_tasks.add_task(
        process_audio,
        job_id,
        input_file
    )

    return {
        "message": "Audio processing started",
        "job_id": job_id,
        "status": "queued"
    }


@app.get("/status/{job_id}")
def get_status(job_id: str):

    if job_id not in jobs:
        return {
            "status": "not_found"
        }

    return jobs[job_id]


@app.get("/download/{job_id}")
def download(job_id: str):

    if job_id not in jobs:
        return {"error": "Job not found"}

    job = jobs[job_id]

    if job["status"] != "complete":
        return {
            "status": job["status"]
        }

    output_file = Path(job["output_file"])

    return FileResponse(
        path=output_file,
        media_type="audio/wav",
        filename=output_file.name
    )